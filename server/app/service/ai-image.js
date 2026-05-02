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
}

module.exports = AiImageService;
