// server/app/ai/image/base.js
'use strict';

class BaseImageProtocol {
  /**
   * @param {{ apiKey: string, baseUrl: string, model: string, extra?: object }} config
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * @param {{
   *   model?: string,
   *   prompt: string,
   *   size?: string,
   *   references?: Array<
   *     | { type: 'path', path: string }
   *     | { type: 'url', url: string }
   *     | { type: 'base64', data: string, mimeType: string }
   *   >
   * }} request
   * @returns {Promise<{ imageBuffer?: Buffer, imageUrl?: string }>}
   */
  async generate(request) {
    throw new Error('必须实现 generate 方法');
  }
}

module.exports = BaseImageProtocol;
