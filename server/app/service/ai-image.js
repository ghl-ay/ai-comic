// server/app/service/ai-image.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const { createImageProvider } = require('../providers');
const BaseImageProvider = require('../providers/base');

class AiImageService extends Service {
  static DEFAULT_IMAGE_MODEL = 'gpt-image-2';

  async getClient() {
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey('image');

    if (!config || !config.apiKey) {
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_IMAGE_MODEL || AiImageService.DEFAULT_IMAGE_MODEL,
        apiFormat: 'openai',
      };

      if (!envConfig.apiKey) {
        return null;
      }

      return envConfig;
    }

    return config;
  }

  async generateCharacterReference(params) {
    const { name, description, appearance } = params;
    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = `角色参考图，三视图，正面视图，侧面视图，背面视图，全身，白色背景，一致的设计，动漫风格，高质量，详细。
角色名称：${name}
角色描述：${description || '无'}
外观描述：${appearance}`;

    try {
      const result = await provider.generateImage({ prompt });

      let imageBuffer;
      if (result.imageBuffer) {
        imageBuffer = result.imageBuffer;
      } else if (result.imageUrl) {
        imageBuffer = await BaseImageProvider.downloadImage(result.imageUrl);
      }

      const filename = `character_${Date.now()}.png`;
      const filepath = path.join(this.app.config.characterImageDir || 'public/images/characters', filename);

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

  async generateComicPage(params) {
    const { comicTitle, stylePrompt, layoutType, chapterPrompt, script, characterReferences, previousChapter } = params;

    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = BaseImageProvider.buildComicPagePrompt({
      comicTitle,
      stylePrompt,
      layoutType,
      chapterPrompt,
      script,
      characterReferences,
      previousChapter,
    });

    try {
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

      // 上一章参考图
      let previousChapterImagePath = null;
      if (previousChapter?.image) {
        const prevImagePath = path.join(
          this.app.config.comicImageDir || 'public/images/comics',
          previousChapter.image
        );
        if (fs.existsSync(prevImagePath)) {
          previousChapterImagePath = prevImagePath;
        }
      }

      let result;
      if (config.apiFormat === 'grsai') {
        const referenceBase64Urls = [];
        // 先添加角色参考图
        for (const imgPath of referenceImagePaths) {
          const imageBuffer = fs.readFileSync(imgPath);
          const base64 = imageBuffer.toString('base64');
          const ext = path.extname(imgPath).toLowerCase();
          const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          referenceBase64Urls.push(`data:${mimeType};base64,${base64}`);
        }
        // 再添加上一章参考图
        if (previousChapterImagePath) {
          const imageBuffer = fs.readFileSync(previousChapterImagePath);
          const base64 = imageBuffer.toString('base64');
          referenceBase64Urls.push(`data:image/png;base64,${base64}`);
        }

        result = await provider.generateImage({ prompt, referenceUrls: referenceBase64Urls });
      } else {
        const imageInputs = [...referenceImagePaths];
        if (previousChapterImagePath) {
          imageInputs.push(previousChapterImagePath);
        }

        result = await provider.generateImageWithReference({ prompt, imageInputs });
      }

      let imageBuffer;
      if (result.imageBuffer) {
        imageBuffer = result.imageBuffer;
      } else if (result.imageUrl) {
        imageBuffer = await BaseImageProvider.downloadImage(result.imageUrl);
      }

      const filename = `page_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      return { imagePath: filename };
    } catch (err) {
      this.ctx.logger.error('Comic page generation error:', err);
      this.ctx.throw(500, `漫画页面生成失败: ${err.message}`);
    }
  }

}

module.exports = AiImageService;
