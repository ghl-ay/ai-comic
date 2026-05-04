// server/app/service/ai-config.js
const Service = require('egg').Service;

class AiConfigService extends Service {
  async getAiConfigs() {
    const configs = await this.ctx.service.db.findGlobalAiConfigs();
    return configs.map(c => ({
      id: c.id,
      type: c.type,
      provider: c.provider,
      baseUrl: c.base_url,
      model: c.model,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async saveAiConfig(type, data) {
    const { provider, apiKey, baseUrl, model } = data;

    await this.ctx.service.db.upsertGlobalAiConfig(
      type,
      provider,
      apiKey,
      baseUrl,
      model
    );

    return await this.getAiConfigs();
  }

  async getAiConfigWithKey(type) {
    const config = await this.ctx.service.db.findGlobalAiConfigByType(type);
    if (!config) {
      return null;
    }
    return {
      provider: config.provider,
      apiKey: config.api_key,
      baseUrl: config.base_url,
      model: config.model,
    };
  }
}

module.exports = AiConfigService;
