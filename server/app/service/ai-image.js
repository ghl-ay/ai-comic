// server/app/service/ai-image.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const { createImageProtocol } = require('../ai/registry');
const { downloadImage } = require('../ai/utils/download');
const { buildComicPagePrompt } = require('../ai/prompt/comic-page');
const { buildCharacterReferencePrompt } = require('../ai/prompt/character-reference');

class AiImageService extends Service {
  async getProtocol(providerId = null) {
    const config = this.ctx.service.aiProvider.resolve('image', providerId);
    const protocol = createImageProtocol(config.protocol, config);
    return { protocol, config };
  }

  async materializeResult(result) {
    if (result.imageBuffer) {
      return result.imageBuffer;
    }
    if (result.imageUrl) {
      return downloadImage(result.imageUrl);
    }
    throw new Error('AI 图片服务未返回图片数据');
  }

  async generateCharacterReference(params) {
    const { name, description, appearance, providerId = null } = params;
    const { protocol } = await this.getProtocol(providerId);

    const prompt = buildCharacterReferencePrompt({ name, description, appearance });

    try {
      const result = await protocol.generate({ prompt });
      const imageBuffer = await this.materializeResult(result);

      const filename = `character_${Date.now()}.png`;
      const filepath = path.join(
        this.app.config.characterImageDir || 'public/images/characters',
        filename
      );

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
      if (err.status) throw err;
      this.ctx.logger.error('AI image generation error:', err);
      this.ctx.throw(500, `AI 图片生成失败: ${err.message}`);
    }
  }

  collectReferences({ characterReferences = [], previousChapter = null }) {
    const references = [];
    const characterImageDir = this.app.config.characterImageDir || 'public/images/characters';
    const comicImageDir = this.app.config.comicImageDir || 'public/images/comics';

    for (const character of characterReferences) {
      if (!character.imageUrl) continue;
      const imagePath = path.join(characterImageDir, path.basename(character.imageUrl));
      if (fs.existsSync(imagePath)) {
        references.push({ type: 'path', path: imagePath });
      }
    }

    if (previousChapter?.image) {
      const previousPath = path.join(comicImageDir, previousChapter.image);
      if (fs.existsSync(previousPath)) {
        references.push({ type: 'path', path: previousPath });
      }
    }

    return references;
  }

  async generateComicPage(params) {
    const {
      comicTitle,
      stylePrompt,
      layoutType,
      chapterPrompt,
      script,
      characterReferences,
      previousChapter,
      providerId = null,
    } = params;

    const { protocol } = await this.getProtocol(providerId);
    const prompt = buildComicPagePrompt({
      comicTitle,
      stylePrompt,
      layoutType,
      chapterPrompt,
      script,
      characterReferences,
      previousChapter,
    });

    try {
      const references = this.collectReferences({ characterReferences, previousChapter });
      const result = await protocol.generate({ prompt, references });
      const imageBuffer = await this.materializeResult(result);

      const filename = `page_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      return { imagePath: filename };
    } catch (err) {
      if (err.status) throw err;
      this.ctx.logger.error('Comic page generation error:', err);
      this.ctx.throw(500, `漫画页面生成失败: ${err.message}`);
    }
  }

  /**
   * 通用提示词出图（短篇漫画等）
   */
  async generateFromPrompt(params) {
    const {
      prompt,
      references = [],
      providerId = null,
      size,
      filenamePrefix = 'image',
    } = params;

    const { protocol } = await this.getProtocol(providerId);

    try {
      const result = await protocol.generate({ prompt, references, size });
      const imageBuffer = await this.materializeResult(result);

      const filename = `${filenamePrefix}_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      fs.writeFileSync(path.join(imageDir, filename), imageBuffer);
      return { imagePath: filename, imageBuffer };
    } catch (err) {
      if (err.status) throw err;
      this.ctx.logger.error('generateFromPrompt error:', err);
      this.ctx.throw(500, `图片生成失败: ${err.message}`);
    }
  }
}

module.exports = AiImageService;
