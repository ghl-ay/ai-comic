// server/app/controller/aiProvider.js
const Controller = require('egg').Controller;
const {
  getSupportedTextProtocols,
  getSupportedImageProtocols,
} = require('../ai/registry');

class AiProviderController extends Controller {
  async index() {
    const { ctx } = this;
    const { type } = ctx.query;
    try {
      const providers = ctx.service.aiProvider.listProviders({ type: type || undefined });
      ctx.body = {
        providers,
        protocols: {
          text: getSupportedTextProtocols(),
          image: getSupportedImageProtocols(),
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async options() {
    const { ctx } = this;
    const { type } = ctx.query;
    try {
      const options = ctx.service.aiProvider.listOptions(type);
      ctx.body = { options };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async show() {
    const { ctx } = this;
    try {
      const provider = ctx.service.aiProvider.getPublicById(parseInt(ctx.params.id, 10));
      ctx.body = { provider };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async create() {
    const { ctx } = this;
    try {
      const provider = ctx.service.aiProvider.createProvider(ctx.request.body || {});
      ctx.body = { provider };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    try {
      const provider = ctx.service.aiProvider.updateProvider(
        parseInt(ctx.params.id, 10),
        ctx.request.body || {}
      );
      ctx.body = { provider };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    try {
      const result = ctx.service.aiProvider.deleteProvider(parseInt(ctx.params.id, 10));
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async setDefault() {
    const { ctx } = this;
    try {
      const provider = ctx.service.aiProvider.setDefault(parseInt(ctx.params.id, 10));
      ctx.body = { provider };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async fetchModels() {
    const { ctx } = this;
    try {
      const data = await ctx.service.aiProvider.fetchRemoteModels(ctx.request.body || {});
      ctx.body = data;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async testConnection() {
    const { ctx } = this;
    try {
      const data = await ctx.service.aiProvider.testConnection(ctx.request.body || {});
      ctx.body = data;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async inspectComfyUI() {
    const { ctx } = this;
    try {
      const data = await ctx.service.aiProvider.inspectComfyUI(ctx.request.body || {});
      ctx.body = data;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async getComfyUITemplates() {
    const { ctx } = this;
    try {
      const templates = ctx.service.aiProvider.getComfyUITemplates();
      ctx.body = { templates };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateComfyUIWorkflow() {
    const { ctx } = this;
    try {
      const result = await ctx.service.aiProvider.generateComfyUIWorkflow(ctx.request.body || {});
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = AiProviderController;
