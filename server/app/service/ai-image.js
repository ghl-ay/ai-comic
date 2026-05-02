// server/app/service/ai-image.js
const Service = require('egg').Service;
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class AiImageService extends Service {
  static DEFAULT_IMAGE_MODEL = 'gpt-image-2';
  static DEFAULT_GRSAI_POLL_INTERVAL_MS = 2000;
  static DEFAULT_GRSAI_MAX_POLL_ATTEMPTS = 300;

  static buildComicPagePrompt(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;
    const charactersById = new Map(characterReferences.map(character => [ character.id, character ]));

    const panelDescriptions = script.panels.map((panel, index) => {
      const panelCharacters = Array.isArray(panel.characters) ? panel.characters : [];
      const characterNames = panelCharacters
        .map(id => charactersById.get(id)?.name || `Character ${id}`)
        .join(', ') || 'none specified';

      return [
        `Panel ${index + 1}:`,
        `Scene: ${panel.scene || ''}`,
        `Dialogue / speech bubbles: ${panel.dialogue || '(no dialogue)'}`,
        `Characters in panel: ${characterNames}`,
      ].join('\n');
    }).join('\n\n');

    const characterDescriptions = characterReferences.length > 0
      ? characterReferences.map(character => {
        return [
          `ID ${character.id} - ${character.name}`,
          `Description: ${character.description || 'Not provided'}`,
          `Appearance: ${character.appearance || 'Not provided'}`,
          `Reference image: ${character.imageUrl ? 'provided as input image' : 'not provided'}`,
        ].join('\n');
      }).join('\n\n')
      : 'No character library entries were provided.';

    let prompt = `Create a single ${layoutType}-panel comic page in this visual style: ${stylePrompt}.

Panel layout:
${layoutType} distinct panels arranged in a clean comic grid with clear panel borders.

Character library:
${characterDescriptions}

Panel script:
${panelDescriptions}

Requirements:
- Match each panel scene, action, and character list exactly.
- Use the character library as the source of truth for character design, clothing, body type, hairstyle, and visual personality.
- If reference images are provided, preserve those designs across every panel.
- Readable Chinese speech bubbles for every non-empty dialogue line.
- Do not omit dialogue. Keep speech bubble text concise, legible, and placed inside the correct panel.
- Preserve the requested visual style and do not override it with another color mode.`;

    if (previousChapterImage) {
      prompt += '\n- Maintain visual continuity with the previous chapter reference image.';
    }

    return prompt;
  }

  static buildComicPageRequest(params) {
    const { model, prompt, imageInputs } = params;

    if (imageInputs.length > 0) {
      return {
        method: 'edit',
        body: {
          model,
          prompt,
          image: imageInputs,
          n: 1,
          size: '1024x1024',
        },
      };
    }

    return {
      method: 'generate',
      body: AiImageService.buildGenerateImageRequest({ model, prompt }),
    };
  }

  static buildGenerateImageRequest(params) {
    const { model, prompt } = params;
    const body = {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    };

    if (!AiImageService.isGptImageModel(model)) {
      body.response_format = 'url';
    }

    return body;
  }

  static isGptImageModel(model) {
    return typeof model === 'string' && model.startsWith('gpt-image');
  }

  static isGrsaiConfig(config) {
    const provider = (config.provider || '').toLowerCase();
    const baseUrl = (config.baseUrl || config.baseURL || '').toLowerCase();
    return provider.includes('grsai') || baseUrl.includes('grsai');
  }

  static buildGrsaiApiUrl(baseUrl, endpoint) {
    const normalized = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
    return `${normalized}/v1/draw/${endpoint}`;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async readJsonResponse(response) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Grsai API request failed: ${response.status} ${text}`);
    }

    return await response.json();
  }

  static extractGrsaiResultPayload(payload) {
    return payload.data && payload.data.status ? payload.data : payload;
  }

  static convertGrsaiResultToImageResponse(result) {
    const firstUrl = result.url || (result.results && result.results[0] && result.results[0].url);
    if (!firstUrl) {
      throw new Error('Grsai 绘图结果中没有图片 URL');
    }

    return {
      data: [
        { url: firstUrl },
      ],
    };
  }

  static async executeGrsaiDrawRequest(params) {
    const {
      apiKey,
      baseUrl,
      model,
      prompt,
      referenceUrls,
      aspectRatio = '1:1',
      quality,
      fetchImpl = fetch,
      pollIntervalMs = AiImageService.DEFAULT_GRSAI_POLL_INTERVAL_MS,
      maxPollAttempts = AiImageService.DEFAULT_GRSAI_MAX_POLL_ATTEMPTS,
    } = params;

    const completionsUrl = AiImageService.buildGrsaiApiUrl(baseUrl, 'completions');
    const resultUrl = AiImageService.buildGrsaiApiUrl(baseUrl, 'result');
    const requestBody = {
      model,
      prompt,
      aspectRatio,
      webHook: '-1',
      shutProgress: false,
    };

    if (referenceUrls.length > 0) {
      requestBody.urls = referenceUrls;
    }

    if (quality) {
      requestBody.quality = quality;
    }

    const createPayload = await AiImageService.readJsonResponse(await fetchImpl(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }));

    const taskId = createPayload.data && createPayload.data.id;
    if (!taskId) {
      throw new Error(`Grsai 绘图任务创建失败: ${createPayload.msg || 'missing task id'}`);
    }

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      if (attempt > 0 && pollIntervalMs > 0) {
        await AiImageService.sleep(pollIntervalMs);
      }

      const resultPayload = await AiImageService.readJsonResponse(await fetchImpl(resultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: taskId }),
      }));

      if (resultPayload.code !== undefined && resultPayload.code !== 0) {
        throw new Error(`Grsai 绘图结果获取失败: ${resultPayload.msg || resultPayload.code}`);
      }

      const result = AiImageService.extractGrsaiResultPayload(resultPayload);
      if (result.status === 'succeeded') {
        return AiImageService.convertGrsaiResultToImageResponse(result);
      }

      if (result.status === 'failed') {
        throw new Error(`Grsai 绘图失败: ${result.error || result.failure_reason || 'unknown error'}`);
      }
    }

    throw new Error('Grsai 绘图任务超时');
  }

  static extractImageBuffer(response) {
    const image = response.data && response.data[0];
    if (!image) {
      throw new Error('AI 图片服务未返回图片');
    }

    if (image.b64_json) {
      return Buffer.from(image.b64_json, 'base64');
    }

    return null;
  }

  static async executeComicPageRequest(client, request) {
    try {
      return await client.images[request.method](request.body);
    } catch (err) {
      if (request.method !== 'edit' || err.status !== 404) {
        throw err;
      }

      const fallbackBody = AiImageService.buildGenerateImageRequest({
        model: request.body.model,
        prompt: request.body.prompt,
      });
      return await client.images.generate(fallbackBody);
    }
  }

  static async uploadReferenceImages(imagePaths, uploader) {
    const urls = [];
    for (const imagePath of imagePaths) {
      urls.push(await uploader(imagePath));
    }
    return urls;
  }

  async getClient(userId) {
    // 从数据库获取用户配置
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey(userId, 'image');

    if (!config || !config.apiKey) {
      // 回退到环境变量
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_IMAGE_MODEL || AiImageService.DEFAULT_IMAGE_MODEL,
      };

      if (!envConfig.apiKey) {
        return null;
      }

      return {
        client: new OpenAI({
          apiKey: envConfig.apiKey,
          baseURL: envConfig.baseURL,
        }),
        apiKey: envConfig.apiKey,
        provider: process.env.OPENAI_IMAGE_PROVIDER || '',
        baseUrl: envConfig.baseURL,
        model: envConfig.model,
      };
    }

    return {
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      }),
      apiKey: config.apiKey,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
    };
  }

  async generateCharacterReference(appearance) {
    const aiConfig = await this.getClient(this.ctx.state.user.id);

    if (!aiConfig) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const { client, model } = aiConfig;

    const prompt = `Character reference sheet, full body front view, ${appearance}, white background, clean design, consistent character design, anime manga style, high quality, detailed. No text, no watermark.`;

    try {
      const response = await client.images.generate(
        AiImageService.buildGenerateImageRequest({ model, prompt })
      );

      let imageBuffer = AiImageService.extractImageBuffer(response);
      if (!imageBuffer) {
        const imageUrl = response.data[0].url;
        imageBuffer = await this.downloadImage(imageUrl);
      }

      const filename = `character_${Date.now()}.png`;
      const filepath = path.join(this.app.config.characterImageDir || 'public/images/characters', filename);

      // 确保目录存在
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filepath, imageBuffer);

      return {
        imagePath: `/images/characters/${filename}`,
        prompt,
      };
    } catch (err) {
      this.ctx.logger.error('AI image generation error:', err);
      this.ctx.throw(500, `AI 图片生成失败: ${err.message}`);
    }
  }

  async downloadImage(url) {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          this.downloadImage(response.headers.location)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  async generateComicPage(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;

    const aiConfig = await this.getClient(this.ctx.state.user.id);
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const { client, model } = aiConfig;

    const prompt = AiImageService.buildComicPagePrompt({
      stylePrompt,
      layoutType,
      script,
      characterReferences,
      previousChapterImage,
    });

    try {
      // 准备图片输入（角色参考图）
      const referenceImagePaths = [];
      for (const charRef of characterReferences) {
        if (charRef.imageUrl) {
          const imagePath = path.join(
            this.app.config.characterImageDir || 'public/images/characters',
            path.basename(charRef.imageUrl)
          );
          if (fs.existsSync(imagePath)) {
            referenceImagePaths.push(imagePath);
          }
        }
      }

      // 如果有上一章图片，也添加到输入
      let previousChapterImagePath = null;
      if (previousChapterImage) {
        const prevImagePath = path.join(
          this.app.config.comicImageDir || 'public/images/comics',
          previousChapterImage
        );
        if (fs.existsSync(prevImagePath)) {
          previousChapterImagePath = prevImagePath;
        }
      }

      let response;
      if (AiImageService.isGrsaiConfig(aiConfig)) {
        const uploadPaths = [ ...referenceImagePaths ];
        if (previousChapterImagePath) {
          uploadPaths.push(previousChapterImagePath);
        }

        const referenceUrls = await AiImageService.uploadReferenceImages(uploadPaths, imagePath => {
          return this.ctx.service.objectStorage.uploadReferenceImage(imagePath);
        });

        if (uploadPaths.length > 0 && referenceUrls.length === 0) {
          throw new Error('角色参考图上传失败');
        }

        response = await AiImageService.executeGrsaiDrawRequest({
          apiKey: aiConfig.apiKey,
          baseUrl: aiConfig.baseUrl,
          model,
          prompt,
          referenceUrls,
        });
      } else {
        const imageInputs = referenceImagePaths.map(imagePath => fs.createReadStream(imagePath));
        if (previousChapterImagePath) {
          imageInputs.push(fs.createReadStream(previousChapterImagePath));
        }

        const request = AiImageService.buildComicPageRequest({
          model,
          prompt,
          imageInputs,
        });

        response = await AiImageService.executeComicPageRequest(client, request);
      }

      let imageBuffer = AiImageService.extractImageBuffer(response);
      if (!imageBuffer) {
        const imageUrl = response.data[0].url;
        imageBuffer = await this.downloadImage(imageUrl);
      }

      const filename = `page_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      // 确保目录存在
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      return {
        imagePath: filename,
      };
    } catch (err) {
      this.ctx.logger.error('Comic page generation error:', err);
      this.ctx.throw(500, `漫画页面生成失败: ${err.message}`);
    }
  }
}

module.exports = AiImageService;
