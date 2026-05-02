// server/app/service/ai-config.js
const Service = require('egg').Service;

class AiConfigService extends Service {
  async getAiConfigs(userId) {
    const configs = await this.ctx.service.db.findAiConfigsByUserId(userId);
    // 不返回 api_key
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

  async saveAiConfig(userId, type, data) {
    const { provider, apiKey, baseUrl, model } = data;

    await this.ctx.service.db.upsertAiConfig(
      userId,
      type,
      provider,
      apiKey,
      baseUrl,
      model
    );

    return await this.getAiConfigs(userId);
  }

  async getAiConfigWithKey(userId, type) {
    const config = await this.ctx.service.db.findAiConfigByUserIdAndType(userId, type);
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
