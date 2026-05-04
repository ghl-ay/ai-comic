// server/app/middleware/jwt.js
const jwt = require('jsonwebtoken');

module.exports = (options, app) => {
  return async function jwtMiddleware(ctx, next) {
    // 从 cookie 获取 token
    const token = ctx.cookies.get('token', { signed: false });

    if (!token) {
      ctx.status = 401;
      ctx.body = { error: '未登录' };
      return;
    }

    try {
      const decoded = jwt.verify(token, ctx.app.config.jwt.secret);

      // 查询用户的 is_admin 字段
      const user = await ctx.service.db.findUserById(decoded.id);

      if (!user) {
        ctx.status = 401;
        ctx.body = { error: '用户不存在' };
        return;
      }

      ctx.state.user = {
        id: decoded.id,
        username: decoded.username,
        is_admin: user.is_admin === 1,
      };
      await next();
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'token 无效或已过期' };
    }
  };
};
