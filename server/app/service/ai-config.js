// server/app/service/ai-config.js
const Service = require('egg').Service;

class AiConfigService extends Service {
  async getAiConfigs() {
    const db = this.ctx.service.db;
    const defaultConfig = db.getConfig('ai', 'default') || {};
    const configs = [];

    // 动态读取文本模型配置
    if (defaultConfig.textProvider) {
      const textConfig = db.getConfig('ai', defaultConfig.textProvider);
      if (textConfig) {
        configs.push({
          type: 'text',
          provider: defaultConfig.textProvider,
          baseUrl: textConfig.baseUrl,
          model: textConfig.model,
          apiFormat: textConfig.apiFormat || 'openai',
        });
      }
    }

    // 动态读取图片模型配置
    if (defaultConfig.imageProvider) {
      const imageConfig = db.getConfig('ai', defaultConfig.imageProvider);
      if (imageConfig) {
        configs.push({
          type: 'image',
          provider: defaultConfig.imageProvider,
          baseUrl: imageConfig.baseUrl,
          model: imageConfig.model,
          apiFormat: imageConfig.apiFormat || 'openai',
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
