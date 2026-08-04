// server/app/controller/configs.js
const Controller = require('egg').Controller;

const ALLOWED_CATEGORIES = [ 'storage', 'ai', 'auth' ];

class ConfigsController extends Controller {
  async show() {
    const { ctx } = this;
    const { category, key } = ctx.params;

    if (!ALLOWED_CATEGORIES.includes(category)) {
      ctx.status = 400;
      ctx.body = { error: '无效的配置类别' };
      return;
    }

    try {
      if (category === 'auth' && key === 'oidc') {
        ctx.body = { config: ctx.service.oidc.getPublicConfig() };
        return;
      }

      const config = ctx.service.db.getConfig(category, key);
      ctx.body = { config };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { category, key } = ctx.params;
    const value = ctx.request.body;

    if (!ALLOWED_CATEGORIES.includes(category)) {
      ctx.status = 400;
      ctx.body = { error: '无效的配置类别' };
      return;
    }

    // 特殊验证：storage/default 必须有 provider 字段
    if (category === 'storage' && key === 'default') {
      if (!value.provider || ![ 'direct', 'tencent-cos', 'xyy-cloud' ].includes(value.provider)) {
        ctx.status = 400;
        ctx.body = { error: '无效的存储提供商' };
        return;
      }
    }

    try {
      if (category === 'auth' && key === 'oidc') {
        const config = ctx.service.oidc.saveConfig(value || {});
        ctx.body = { config };
        return;
      }

      ctx.service.db.setConfig(category, key, value);
      const config = ctx.service.db.getConfig(category, key);
      ctx.body = { config };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ConfigsController;
