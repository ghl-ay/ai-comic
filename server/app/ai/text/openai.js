// server/app/ai/text/openai.js
'use strict';

const OpenAI = require('openai');
const BaseTextProtocol = require('./base');

class OpenAITextProtocol extends BaseTextProtocol {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(request) {
    const model = request.model || this.config.model;
    const body = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
    };

    if (request.maxTokens) {
      body.max_tokens = request.maxTokens;
    }
    if (request.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(body);
    const content = response.choices?.[0]?.message?.content || '';
    return { content, raw: response };
  }
}

module.exports = OpenAITextProtocol;
