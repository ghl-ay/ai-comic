// server/app/controller/auth.js
const Controller = require('egg').Controller;
const { mapOidcCallbackErrorCode } = require('../service/oidc');

class AuthController extends Controller {
  async register() {
    const { ctx } = this;
    const { username, password } = ctx.request.body;

    const validation = ctx.service.auth.validateRegisterInput(username, password);
    if (!validation.ok) {
      ctx.status = 400;
      ctx.body = { error: validation.message };
      return;
    }

    try {
      const result = await ctx.service.auth.register(username, password);
      ctx.service.auth.setAuthCookie(result.token);
      ctx.body = {
        token: result.token,
        user: {
          id: result.userId,
          username: result.username,
          is_admin: result.is_admin,
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
        token: result.token,
        user: {
          id: result.userId,
          username: result.username,
          is_admin: result.is_admin,
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
    ctx.body = {
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin === 1,
        created_at: user.created_at,
      },
    };
  }

  // ---------- OIDC ----------

  async oidcStatus() {
    const { ctx } = this;
    ctx.body = ctx.service.oidc.getStatus();
  }

  async oidcLogin() {
    const { ctx } = this;
    try {
      const returnTo = ctx.query.returnTo;
      const url = await ctx.service.oidc.buildAuthorizationRedirect(returnTo);
      ctx.redirect(url);
    } catch (err) {
      ctx.logger.error('[oidc] login failed: %s %j', err.message, {
        status: err.status,
        oidcCode: err.oidcCode,
        code: err.code,
        error: err.error,
        error_description: err.error_description,
        stack: err.stack,
      });
      // 整页跳转场景统一 redirect 短码，避免浏览器渲染 JSON
      const shortCode = err.oidcCode === 'not_enabled' ? 'not_enabled' : 'login_failed';
      ctx.redirect(`/login?oidc_error=${encodeURIComponent(shortCode)}`);
    }
  }

  async oidcCallback() {
    const { ctx } = this;
    try {
      const result = await ctx.service.oidc.handleCallback(ctx.query);
      if (result.type === 'login') {
        const tokenResult = await ctx.service.auth.issueTokenForUser(result.user.id);
        ctx.service.auth.setAuthCookie(tokenResult.token);
        ctx.redirect(result.returnTo || '/comics');
        return;
      }
      // 未绑定：进入决策页（不签发业务 JWT）
      const returnTo = encodeURIComponent(result.returnTo || '/comics');
      ctx.redirect(`/login/oidc-setup?returnTo=${returnTo}`);
    } catch (err) {
      // openid-client OPError: err.error / err.error_description — 完整细节只写日志
      ctx.logger.error('[oidc] callback failed: %s %j', err.message, {
        status: err.status,
        oidcCode: err.oidcCode,
        code: err.code,
        error: err.error,
        error_description: err.error_description,
        stack: err.stack,
      });
      const shortCode = mapOidcCallbackErrorCode(err);
      ctx.redirect(`/login?oidc_error=${encodeURIComponent(shortCode)}`);
    }
  }

  async oidcPending() {
    const { ctx } = this;
    try {
      ctx.body = { pending: ctx.service.oidc.getPendingSummary() };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async oidcBind() {
    const { ctx } = this;
    const { username, password } = ctx.request.body || {};
    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { error: '用户名和密码不能为空' };
      return;
    }
    try {
      const result = await ctx.service.oidc.bindExisting(username, password);
      ctx.service.auth.setAuthCookie(result.token);
      ctx.body = {
        token: result.token,
        user: {
          id: result.userId,
          username: result.username,
          is_admin: result.is_admin,
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async oidcRegister() {
    const { ctx } = this;
    const { username, password } = ctx.request.body || {};
    const validation = ctx.service.auth.validateRegisterInput(username, password);
    if (!validation.ok) {
      ctx.status = 400;
      ctx.body = { error: validation.message };
      return;
    }
    try {
      const result = await ctx.service.oidc.registerAndBind(username, password);
      ctx.service.auth.setAuthCookie(result.token);
      ctx.body = {
        token: result.token,
        user: {
          id: result.userId,
          username: result.username,
          is_admin: result.is_admin,
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = AuthController;
