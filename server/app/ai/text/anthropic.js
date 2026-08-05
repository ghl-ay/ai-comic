// server/app/ai/text/anthropic.js
'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const BaseTextProtocol = require('./base');

class AnthropicTextProtocol extends BaseTextProtocol {
  constructor(config) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });
  }

  async chat(request) {
    const model = request.model || this.config.model;
    const systemParts = [];
    const messages = [];

    for (const message of request.messages || []) {
      if (message.role === 'system') {
        systemParts.push(message.content);
      } else if (message.role === 'user' || message.role === 'assistant') {
        messages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    if (request.responseFormat === 'json_object') {
      systemParts.push('你必须只输出合法 JSON 对象，不要包含 markdown 代码块或其它说明文字。');
    }

    if (messages.length === 0) {
      throw new Error('Anthropic 请求缺少 user/assistant 消息');
    }

    const body = {
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      messages,
    };

    if (systemParts.length > 0) {
      body.system = systemParts.join('\n\n');
    }

    const response = await this.client.messages.create(body);
    const textBlocks = (response.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text);
    const content = textBlocks.join('\n');

    return { content, raw: response };
  }
}

module.exports = AnthropicTextProtocol;
