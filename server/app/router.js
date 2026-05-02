// server/app/router.js
module.exports = app => {
  const { router, controller } = app;

  // 认证相关（无需登录）
  router.post('/api/auth/register', controller.auth.register);
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', controller.auth.logout);

  // 需要登录的接口
  router.get('/api/auth/me', app.middleware.jwt(), controller.auth.me);

  // 角色相关（需要登录）
  router.get('/api/characters', app.middleware.jwt(), controller.character.index);
  router.post('/api/characters', app.middleware.jwt(), controller.character.create);
  router.get('/api/characters/:id', app.middleware.jwt(), controller.character.show);
  router.put('/api/characters/:id', app.middleware.jwt(), controller.character.update);
  router.delete('/api/characters/:id', app.middleware.jwt(), controller.character.destroy);
  router.post('/api/characters/:id/generate-reference', app.middleware.jwt(), controller.character.generateReference);

  // AI 配置相关（需要登录）
  router.get('/api/ai-config', app.middleware.jwt(), controller.aiConfig.index);
  router.put('/api/ai-config/text', app.middleware.jwt(), controller.aiConfig.saveText);
  router.put('/api/ai-config/image', app.middleware.jwt(), controller.aiConfig.saveImage);
};
