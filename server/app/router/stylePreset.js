// server/app/router/stylePreset.js
module.exports = app => {
  const { router, controller } = app;
  const jwt = app.middleware.jwt();

  // 用户侧
  router.get('/api/style-presets', controller.stylePreset.index);

  // 后台管理（需 JWT + 管理员校验）
  router.get('/api/admin/style-presets', jwt, app.middleware.admin(), controller.admin.stylePreset.index);
  router.post('/api/admin/style-presets', jwt, app.middleware.admin(), controller.admin.stylePreset.create);
  // 批量重生须注册在 :id 路由之前
  router.post(
    '/api/admin/style-presets/regenerate-covers',
    jwt,
    app.middleware.admin(),
    controller.admin.stylePreset.regenerateCovers
  );
  router.post(
    '/api/admin/style-presets/:id/regenerate-cover',
    jwt,
    app.middleware.admin(),
    controller.admin.stylePreset.regenerateCover
  );
  router.put('/api/admin/style-presets/:id', jwt, app.middleware.admin(), controller.admin.stylePreset.update);
  router.put('/api/admin/style-presets/:id/toggle', jwt, app.middleware.admin(), controller.admin.stylePreset.toggle);
  router.delete('/api/admin/style-presets/:id', jwt, app.middleware.admin(), controller.admin.stylePreset.destroy);
};
