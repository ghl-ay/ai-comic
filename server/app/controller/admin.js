// server/app/controller/admin.js
const Controller = require('egg').Controller;

class AdminController extends Controller {
  async getUsers() {
    const { ctx } = this;
    const users = await ctx.service.db.findAllUsers();
    ctx.body = { users };
  }

  async setUserAdmin() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id);
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
        is_admin
      }
    };
  }
}

module.exports = AdminController;
