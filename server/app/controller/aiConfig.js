// server/app/controller/ai-config.js
const Controller = require('egg').Controller;

class AiConfigController extends Controller {
  async index() {
    const { ctx } = this;
    const configs = await ctx.service.aiConfig.getAiConfigs();
    ctx.body = { configs };
  }

  async updateText() {
    const { ctx } = this;
    const { provider, apiKey, baseUrl, model, apiFormat } = ctx.request.body;

    if (!provider || !apiKey || !baseUrl || !model) {
      ctx.status = 400;
      ctx.body = { error: '请填写完整配置' };
      return;
    }

    try {
      const configs = await ctx.service.aiConfig.saveAiConfig(
        'text',
        { provider, apiKey, baseUrl, model, apiFormat }
      );
      ctx.body = { configs };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }

  async updateImage() {
    const { ctx } = this;
    const { provider, apiKey, baseUrl, model, apiFormat } = ctx.request.body;

    if (!provider || !apiKey || !baseUrl || !model) {
      ctx.status = 400;
      ctx.body = { error: '请填写完整配置' };
      return;
    }

    try {
      const configs = await ctx.service.aiConfig.saveAiConfig(
        'image',
        { provider, apiKey, baseUrl, model, apiFormat }
      );
      ctx.body = { configs };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = AiConfigController;
