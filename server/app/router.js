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

  // 漫画相关（需要登录）
  router.get('/api/comics', app.middleware.jwt(), controller.comic.index);
  router.post('/api/comics', app.middleware.jwt(), controller.comic.create);
  router.get('/api/comics/:id', app.middleware.jwt(), controller.comic.show);
  router.put('/api/comics/:id', app.middleware.jwt(), controller.comic.update);
  router.delete('/api/comics/:id', app.middleware.jwt(), controller.comic.destroy);
  router.post('/api/comics/:id/chapters/batch', app.middleware.jwt(), controller.comic.createChapters);

  // 章节相关（需要登录）
  router.post('/api/comics/:id/chapters', app.middleware.jwt(), controller.chapter.create);
  router.get('/api/chapters/:id', app.middleware.jwt(), controller.chapter.show);
  router.put('/api/chapters/:id', app.middleware.jwt(), controller.chapter.update);
  router.delete('/api/chapters/:id', app.middleware.jwt(), controller.chapter.destroy);
  router.post('/api/chapters/:id/generate-script', app.middleware.jwt(), controller.chapter.generateScript);
  router.post('/api/chapters/:id/generate-image', app.middleware.jwt(), controller.chapter.generateImage);
  router.post('/api/chapters/:id/generate-prompt', app.middleware.jwt(), controller.chapter.generateChapterPrompt);

  // 小说相关（需要登录）
  router.post('/api/novels', app.middleware.jwt(), controller.novel.create);
  router.get('/api/novels/:id', app.middleware.jwt(), controller.novel.show);
  router.delete('/api/novels/:id', app.middleware.jwt(), controller.novel.destroy);
  router.post('/api/novels/:id/analyze-style', app.middleware.jwt(), controller.novel.analyzeStyle);
  router.post('/api/novels/:id/extract-characters', app.middleware.jwt(), controller.novel.extractCharacters);
  router.post('/api/novels/:id/generate-chapters', app.middleware.jwt(), controller.novel.generateChapters);
  router.get('/api/novels/by-comic/:comicId', app.middleware.jwt(), controller.novel.showByComicId);

  // AI 配置相关（读取需要登录，修改需要管理员权限）
  router.get('/api/ai-config', app.middleware.jwt(), controller.aiConfig.index);
  router.put('/api/ai-config/text', app.middleware.jwt(), app.middleware.admin(), controller.aiConfig.updateText);
  router.put('/api/ai-config/image', app.middleware.jwt(), app.middleware.admin(), controller.aiConfig.updateImage);

  // 通用配置 API（需要管理员权限）
  router.get('/api/configs/:category/:key', app.middleware.jwt(), app.middleware.admin(), controller.configs.show);
  router.put('/api/configs/:category/:key', app.middleware.jwt(), app.middleware.admin(), controller.configs.update);

  // 管理员接口（需要管理员权限）
  router.get('/api/admin/users', app.middleware.jwt(), app.middleware.admin(), controller.admin.getUsers);
  router.put('/api/admin/users/:id/admin', app.middleware.jwt(), app.middleware.admin(), controller.admin.setUserAdmin);

  // AI 辅助功能（需要登录）
  router.post('/api/ai-assist/fill-form', app.middleware.jwt(), controller.aiAssist.fillForm);

  // 图片访问（通过 token 认证，无需登录）
  router.get('/api/images/:type/:filename', controller.images.show);

  // 图片访问（通过 Cookie 认证，需要登录）
  router.get('/images/:type/:filename', app.middleware.jwt(), controller.images.showAuth);
};
