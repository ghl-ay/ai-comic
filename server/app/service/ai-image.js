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

  /**
   * 构建角色参考图提示词。
   * 固定版式/背景/姿态，保证每次生成的参考图视觉规格一致，便于后续出图保持角色一致性。
   */
  static buildCharacterReferencePrompt({ name, description, appearance }) {
    return `Character design turnaround sheet / 角色设定三视图参考图.

【固定版式 — 所有生成必须严格遵守，不得改变】
- 一张图内横向并排 3 个全身视图，从左到右顺序固定：正面 Front → 右侧面 Side → 背面 Back
- 同一角色、同一身高比例、脚底对齐在同一水平线上，人物间距均匀
- 纯白背景 pure white background (#FFFFFF)，无渐变、无阴影地面、无网格、无场景、无道具
- 中性站姿：双脚并立站稳，双手自然垂于身侧（非 T-pose、非交叉手臂、非动态姿势）
- 正面：直视镜头，身体完全朝前；侧面：精确 90° 侧脸与侧身；背面：完全背对镜头
- 全身完整入镜，头顶到脚底留出少量边距，不得裁切肢体
- 三视图之间发型、五官、体型、服装、配色、配饰必须完全一致
- 干净线稿 + 均匀平涂上色，柔和正面光，无戏剧性光影
- 无文字、无标签、无水印、无边框、无分镜框、无表情格子、无额外小图

【角色信息】
角色名称：${name}
角色描述：${description || '无'}
外观描述：${appearance}

【输出要求】
仅输出上述标准三视图角色设定图；除角色外观按描述绘制外，版式、背景色、姿态、构图规格保持统一。`;
  }

  async generateCharacterReference(params) {
    const { name, description, appearance } = params;
    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = AiImageService.buildCharacterReferencePrompt({
      name,
      description,
      appearance,
    });

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
