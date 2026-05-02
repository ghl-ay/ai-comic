// server/app/router.js
module.exports = app => {
  const { router, controller } = app;

  // 认证相关（无需登录）
  router.post('/api/auth/register', controller.auth.register);
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', controller.auth.logout);

  // 需要登录的接口
  router.get('/api/auth/me', app.middleware.jwt(), controller.auth.me);
};
