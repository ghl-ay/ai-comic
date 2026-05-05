// server/app/controller/configs.js
const Controller = require('egg').Controller;

class ConfigsController extends Controller {
  async show() {
    const { ctx } = this;
    const { category, key } = ctx.params;

    try {
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

    // 验证 category
    if (!['storage', 'ai'].includes(category)) {
      ctx.status = 400;
      ctx.body = { error: '无效的配置类别' };
      return;
    }

    // 特殊验证：storage/default 必须有 provider 字段
    if (category === 'storage' && key === 'default') {
      if (!value.provider || !['direct', 'tencent-cos', 'xyy-cloud'].includes(value.provider)) {
        ctx.status = 400;
        ctx.body = { error: '无效的存储提供商' };
        return;
      }
    }

    try {
      ctx.service.db.setConfig(category, key, value);
      const config = ctx.service.db.getConfig(category, key);
      ctx.body = { config };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ConfigsController;
