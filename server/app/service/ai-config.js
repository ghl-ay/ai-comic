// server/app/service/ai-config.js
const Service = require('egg').Service;

class AiConfigService extends Service {
  async getAiConfigs() {
    const db = this.ctx.service.db;
    const defaultConfig = db.getConfig('ai', 'default') || {};
    const providers = ['openai', 'anthropic', 'deepseek', 'siliconflow', 'doubao'];

    const configs = [];
    for (const provider of providers) {
      const config = db.getConfig('ai', provider);
      if (config) {
        configs.push({
          type: provider === defaultConfig.textProvider ? 'text' : provider === defaultConfig.imageProvider ? 'image' : provider,
          provider,
          baseUrl: config.baseUrl,
          model: config.model,
          apiFormat: config.apiFormat || 'openai',
        });
      }
    }

    return configs;
  }

  async saveAiConfig(type, data) {
    const { provider, apiKey, baseUrl, model, apiFormat } = data;

    this.ctx.service.db.setConfig('ai', provider, {
      apiKey,
      baseUrl,
      model,
      apiFormat: apiFormat || 'openai',
    });

    // 更新默认提供商
    const defaultConfig = this.ctx.service.db.getConfig('ai', 'default') || {};
    if (type === 'text') {
      defaultConfig.textProvider = provider;
    } else if (type === 'image') {
      defaultConfig.imageProvider = provider;
    }
    this.ctx.service.db.setConfig('ai', 'default', defaultConfig);

    return await this.getAiConfigs();
  }

  async getAiConfigWithKey(type) {
    const db = this.ctx.service.db;
    const defaultConfig = db.getConfig('ai', 'default') || {};

    // 根据 type 确定要读取哪个提供商的配置
    let provider = type;
    if (type === 'text') {
      provider = defaultConfig.textProvider || 'openai';
    } else if (type === 'image') {
      provider = defaultConfig.imageProvider || 'openai';
    }

    const config = db.getConfig('ai', provider);
    if (!config) {
      return null;
    }

    return {
      provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      apiFormat: config.apiFormat || 'openai',
    };
  }
}

module.exports = AiConfigService;
