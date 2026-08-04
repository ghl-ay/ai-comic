// server/app/service/auth.js
const Service = require('egg').Service;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService extends Service {
  /**
   * 仅创建本地用户（校验用户名占用 + 哈希密码 + 首用户管理员）。
   * 可选 oidcBind：与绑定同事务，失败整单回滚。
   * @param {string} username
   * @param {string} password
   * @param {{ issuer: string, sub: string, profile?: object } | null} oidcBind
   * @returns {Promise<number>} userId
   */
  async registerUserOnly(username, password, oidcBind = null) {
    const { ctx } = this;

    const existingUser = await ctx.service.db.findUserByUsername(username);
    if (existingUser) {
      ctx.throw(400, '用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (oidcBind && oidcBind.issuer && oidcBind.sub) {
      const result = ctx.service.db.createUserAndBindOidc(
        username,
        hashedPassword,
        oidcBind.issuer,
        oidcBind.sub,
        oidcBind.profile || {}
      );
      if (!result.ok) {
        if (result.reason === 'sub_taken') {
          ctx.throw(409, '该第三方身份已绑定其他账号，请联系管理员');
        }
        if (result.reason === 'already_bound') {
          ctx.throw(409, '该账号已绑定其他第三方身份，请换账号或联系管理员解绑');
        }
        ctx.throw(400, '绑定失败，请重试');
      }
      return result.userId;
    }

    return ctx.service.db.createUserWithAdminCheck(username, hashedPassword);
  }

  async register(username, password) {
    const userId = await this.registerUserOnly(username, password);
    const userCount = await this.ctx.service.db.countUsers();
    const isFirstUser = userCount === 1;
    const tokenResult = await this.issueTokenForUser(userId);
    return {
      userId,
      username: tokenResult.username,
      token: tokenResult.token,
      isFirstUser,
      is_admin: tokenResult.is_admin,
    };
  }

  /**
   * 校验用户名密码；失败抛 401（文案与登录一致，不暴露用户是否存在）
   */
  async verifyCredentials(username, password) {
    const { ctx } = this;
    const user = await ctx.service.db.findUserByUsername(username);
    if (!user) {
      ctx.throw(401, '用户名或密码错误');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      ctx.throw(401, '用户名或密码错误');
    }
    return user;
  }

  async issueTokenForUser(userId) {
    const { ctx, app } = this;
    const user = await ctx.service.db.findUserById(userId);
    if (!user) {
      ctx.throw(401, '用户不存在');
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn }
    );
    return {
      userId: user.id,
      username: user.username,
      is_admin: user.is_admin === 1,
      token,
    };
  }

  async login(username, password) {
    const user = await this.verifyCredentials(username, password);
    const tokenResult = await this.issueTokenForUser(user.id);
    return tokenResult;
  }

  /**
   * 与 controller register 同源规则
   * @returns {{ ok: true } | { ok: false, message: string }}
   */
  validateRegisterInput(username, password) {
    if (!username || !password) {
      return { ok: false, message: '用户名和密码不能为空' };
    }
    if (username.length < 3 || username.length > 50) {
      return { ok: false, message: '用户名长度需在 3-50 之间' };
    }
    if (password.length < 6) {
      return { ok: false, message: '密码长度至少 6 位' };
    }
    return { ok: true };
  }

  setAuthCookie(token) {
    const { ctx, app } = this;
    ctx.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });
  }

  clearAuthCookie() {
    const { ctx } = this;
    ctx.cookies.set('token', null, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 0,
    });
  }
}

module.exports = AuthService;
