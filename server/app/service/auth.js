// server/app/service/auth.js
const Service = require('egg').Service;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService extends Service {
  async register(username, password) {
    const { ctx, app } = this;

    // 检查用户名是否已存在
    const existingUser = await ctx.service.db.findUserByUsername(username);
    if (existingUser) {
      ctx.throw(400, '用户名已存在');
    }

    // 检查是否是第一个用户
    const userCount = await ctx.service.db.countUsers();
    const isFirstUser = userCount === 0;

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const userId = await ctx.service.db.createUser(username, hashedPassword);

    // 如果是第一个用户，设置为管理员
    if (isFirstUser) {
      await ctx.service.db.updateUserAdmin(userId, true);
    }

    // 生成 token
    const token = jwt.sign(
      { id: userId, username },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn }
    );

    return { userId, username, token, isFirstUser };
  }

  async login(username, password) {
    const { ctx, app } = this;

    // 查找用户
    const user = await ctx.service.db.findUserByUsername(username);
    if (!user) {
      ctx.throw(401, '用户名或密码错误');
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      ctx.throw(401, '用户名或密码错误');
    }

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn }
    );

    return { userId: user.id, username: user.username, token };
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
