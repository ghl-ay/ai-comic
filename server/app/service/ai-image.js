// server/app/service/ai-image.js
const Service = require('egg').Service;
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class AiImageService extends Service {
  async getClient(userId) {
    // 从数据库获取用户配置
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey(userId, 'image');

    if (!config || !config.apiKey) {
      // 回退到环境变量
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      };

      if (!envConfig.apiKey) {
        return null;
      }

      return {
        client: new OpenAI({
          apiKey: envConfig.apiKey,
          baseURL: envConfig.baseURL,
        }),
        model: envConfig.model,
      };
    }

    return {
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      }),
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
      const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });

      const imageUrl = response.data[0].url;

      // 下载并保存图片
      const imageBuffer = await this.downloadImage(imageUrl);
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

    // 构建提示词
    const panelDescriptions = script.panels.map((panel, index) => {
      return `Panel ${index + 1}: ${panel.scene}`;
    }).join('\n');

    let prompt = `Create a ${layoutType}-panel manga page in ${stylePrompt} style.

Panel layout: ${layoutType} panels arranged in traditional manga grid format.

Panel descriptions:
${panelDescriptions}

Character references:
${characterReferences.map(c => `- ${c.name}: use provided reference image`).join('\n')}

Requirements:
- Generate a single manga page with ${layoutType} distinct panels
- Each panel should match its description
- Keep characters consistent with reference images
- Use black and white manga style with clear panel borders
- No text or speech bubbles (will be added later)`;

    if (previousChapterImage) {
      prompt += `\n- Maintain visual continuity with the previous chapter's art style`;
    }

    try {
      // 准备图片输入（角色参考图）
      const imageInputs = [];
      for (const charRef of characterReferences) {
        if (charRef.imageUrl) {
          const imagePath = path.join(
            this.app.config.characterImageDir || 'public/images/characters',
            path.basename(charRef.imageUrl)
          );
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');
            imageInputs.push({
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            });
          }
        }
      }

      // 如果有上一章图片，也添加到输入
      if (previousChapterImage) {
        const prevImagePath = path.join(
          this.app.config.comicImageDir || 'public/images/comics',
          previousChapterImage
        );
        if (fs.existsSync(prevImagePath)) {
          const imageBuffer = fs.readFileSync(prevImagePath);
          const base64 = imageBuffer.toString('base64');
          imageInputs.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          });
        }
      }

      // 调用 GPT-image API
      const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });

      const imageUrl = response.data[0].url;

      // 下载并保存图片
      const imageBuffer = await this.downloadImage(imageUrl);
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
