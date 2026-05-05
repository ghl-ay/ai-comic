// server/app/providers/openai.js
const OpenAI = require('openai');
const BaseImageProvider = require('./base');
const fs = require('fs');

class OpenAIImageProvider extends BaseImageProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async generateImage(params) {
    const { prompt } = params;
    const model = this.config.model;

    const body = {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    };

    if (!this.isGptImageModel(model)) {
      body.response_format = 'url';
    }

    const response = await this.client.images.generate(body);
    return this.extractImageResponse(response);
  }

  async generateImageWithReference(params) {
    const { prompt, imagePaths } = params;
    const model = this.config.model;

    if (imagePaths && imagePaths.length > 0) {
      try {
        const imageInputs = imagePaths.map(p => fs.createReadStream(p));
        const response = await this.client.images.edit({
          model,
          prompt,
          image: imageInputs,
          n: 1,
          size: '1024x1024',
        });
        return this.extractImageResponse(response);
      } catch (err) {
        if (err.status !== 404) {
          throw err;
        }
        // 回退到生成模式
      }
    }

    return this.generateImage(params);
  }

  isGptImageModel(model) {
    return typeof model === 'string' && model.startsWith('gpt-image');
  }

  extractImageResponse(response) {
    const image = response.data && response.data[0];
    if (!image) {
      throw new Error('AI 图片服务未返回图片');
    }

    if (image.b64_json) {
      return { imageBuffer: Buffer.from(image.b64_json, 'base64') };
    }

    return { imageUrl: image.url };
  }
}

module.exports = OpenAIImageProvider;
