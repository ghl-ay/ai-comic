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

  async generateCharacterReference(appearance) {
    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = `Character reference sheet, full body front view, ${appearance}, white background, clean design, consistent character design, anime manga style, high quality, detailed. No text, no watermark.`;

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
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;

    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = BaseImageProvider.buildComicPagePrompt({
      stylePrompt,
      layoutType,
      script,
      characterReferences,
      previousChapterImage,
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

      let result;
      if (config.apiFormat === 'grsai') {
        const uploadPaths = [...referenceImagePaths];
        if (previousChapterImagePath) {
          uploadPaths.push(previousChapterImagePath);
        }

        const referenceUrls = await this.uploadReferenceImages(uploadPaths);

        if (uploadPaths.length > 0 && referenceUrls.length === 0) {
          throw new Error('角色参考图上传失败');
        }

        result = await provider.generateImage({ prompt, referenceUrls });
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

  async uploadReferenceImages(imagePaths) {
    const urls = [];
    for (const imagePath of imagePaths) {
      urls.push(await this.ctx.service.objectStorage.uploadReferenceImage(imagePath));
    }
    return urls;
  }
}

module.exports = AiImageService;
