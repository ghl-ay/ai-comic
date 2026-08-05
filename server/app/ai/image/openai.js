// server/app/ai/image/openai.js
'use strict';

const fs = require('fs');
const OpenAI = require('openai');
const BaseImageProtocol = require('./base');
const { referencesToLocalPaths, referencesToUrlList } = require('../utils/reference');

class OpenAIImageProtocol extends BaseImageProtocol {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
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
    if (image.url) {
      return { imageUrl: image.url };
    }
    throw new Error('AI 图片服务返回格式无法识别');
  }

  async generate(request) {
    const model = request.model || this.config.model;
    const prompt = request.prompt;
    const size = request.size || '1024x1024';
    const references = request.references || [];

    if (references.length > 0) {
      const localPaths = referencesToLocalPaths(references);
      if (localPaths.length > 0) {
        try {
          const imageInputs = localPaths.map(filePath => fs.createReadStream(filePath));
          const response = await this.client.images.edit({
            model,
            prompt,
            image: imageInputs,
            n: 1,
            size,
          });
          return this.extractImageResponse(response);
        } catch (error) {
          // 仅在明确不支持 multipart edit 时回退 JSON body.image
          const status = error.status || error.statusCode;
          const canFallback = status === 404 || status === 400 || status === 405;
          if (!canFallback) {
            throw error;
          }
          // eslint-disable-next-line no-console
          console.warn(
            `[openai-image] images.edit 不可用 (status=${status})，回退 body.image:`,
            error.message
          );
        }
      }

      return this.generateWithBodyImage({ model, prompt, size, references });
    }

    const body = {
      model,
      prompt,
      n: 1,
      size,
    };
    if (!this.isGptImageModel(model)) {
      body.response_format = 'url';
    }

    const response = await this.client.images.generate(body);
    return this.extractImageResponse(response);
  }

  /**
   * OpenAI 兼容中转（如 grsai）: POST /v1/images/generations + image[]
   */
  async generateWithBodyImage({ model, prompt, size, references }) {
    const imageList = referencesToUrlList(references);
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const url = baseUrl.endsWith('/v1')
      ? `${baseUrl}/images/generations`
      : `${baseUrl}/v1/images/generations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        image: imageList,
        size,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`图片生成失败: ${response.status} ${text}`);
    }

    const payload = await response.json();
    return this.extractImageResponse(payload);
  }
}

module.exports = OpenAIImageProtocol;
