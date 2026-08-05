// server/app/ai/text/base.js
'use strict';

class BaseTextProtocol {
  /**
   * @param {{ apiKey: string, baseUrl: string, model: string, extra?: object }} config
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * @param {{
   *   model?: string,
   *   messages: Array<{ role: string, content: string }>,
   *   temperature?: number,
   *   responseFormat?: 'json_object' | 'text',
   *   maxTokens?: number
   * }} request
   * @returns {Promise<{ content: string, raw?: any }>}
   */
  async chat(request) {
    throw new Error('必须实现 chat 方法');
  }
}

module.exports = BaseTextProtocol;
