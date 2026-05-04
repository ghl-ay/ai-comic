// server/app/middleware/admin.js
module.exports = (options, app) => {
  return async function adminRequired(ctx, next) {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { error: '未登录' };
      return;
    }

    if (!ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = { error: '需要管理员权限' };
      return;
    }

    await next();
  };
};
