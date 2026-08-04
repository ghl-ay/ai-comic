// server/app/controller/admin.js
const Controller = require('egg').Controller;

class AdminController extends Controller {
  async getUsers() {
    const { ctx } = this;
    const rows = await ctx.service.db.findAllUsers();
    const users = rows.map(user => ({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin === 1,
      created_at: user.created_at,
      auth_provider: user.auth_provider || 'local',
      oidc_bound: Boolean(user.oidc_sub),
      oidc_sub: user.oidc_sub || null,
      oidc_issuer: user.oidc_issuer || null,
      display_name: user.display_name || null,
    }));
    ctx.body = { users };
  }

  async setUserAdmin() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id, 10);
    const { is_admin } = ctx.request.body;

    if (typeof is_admin !== 'boolean') {
      ctx.status = 400;
      ctx.body = { error: 'is_admin 必须是布尔值' };
      return;
    }

    const user = await ctx.service.db.findUserById(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }

    await ctx.service.db.updateUserAdmin(userId, is_admin);
    ctx.body = {
      user: {
        id: userId,
        is_admin,
      },
    };
  }

  async unbindUserOidc() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id, 10);
    const user = await ctx.service.db.findUserById(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }
    if (!user.oidc_sub) {
      ctx.status = 400;
      ctx.body = { error: '该用户未绑定第三方账号' };
      return;
    }

    await ctx.service.db.unbindUserOidc(userId);
    ctx.body = {
      message: '已解除 OIDC 绑定',
      user: {
        id: userId,
        oidc_bound: false,
      },
    };
  }

  async testOidc() {
    const { ctx } = this;
    try {
      const draft = ctx.request.body || {};
      const result = await ctx.service.oidc.testDiscovery(draft);
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 502;
      ctx.body = { error: err.message || 'Discovery 失败', ok: false };
    }
  }
}

module.exports = AdminController;
