// server/app/controller/auth.js
const Controller = require('egg').Controller;

class AuthController extends Controller {
  async register() {
    const { ctx } = this;
    const { username, password } = ctx.request.body;

    // 参数验证
    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { error: '用户名和密码不能为空' };
      return;
    }

    if (username.length < 3 || username.length > 50) {
      ctx.status = 400;
      ctx.body = { error: '用户名长度需在 3-50 之间' };
      return;
    }

    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = { error: '密码长度至少 6 位' };
      return;
    }

    try {
      const result = await ctx.service.auth.register(username, password);
      ctx.service.auth.setAuthCookie(result.token);
      ctx.body = {
        user: {
          id: result.userId,
          username: result.username,
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async login() {
    const { ctx } = this;
    const { username, password } = ctx.request.body;

    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { error: '用户名和密码不能为空' };
      return;
    }

    try {
      const result = await ctx.service.auth.login(username, password);
      ctx.service.auth.setAuthCookie(result.token);
      ctx.body = {
        user: {
          id: result.userId,
          username: result.username,
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async logout() {
    const { ctx } = this;
    ctx.service.auth.clearAuthCookie();
    ctx.body = { message: '登出成功' };
  }

  async me() {
    const { ctx } = this;
    const user = await ctx.service.db.findUserById(ctx.state.user.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }
    ctx.body = { user };
  }
}

module.exports = AuthController;
