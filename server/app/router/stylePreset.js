// server/app/router/stylePreset.js
module.exports = app => {
  const { router, controller } = app;
  const jwt = app.middleware.jwt();

  // 用户侧
  router.get('/api/style-presets', controller.stylePreset.index);

  // 后台管理（需 JWT + 管理员校验）
  router.get('/api/admin/style-presets', jwt, app.middleware.admin(), controller.admin.stylePreset.index);
  router.post('/api/admin/style-presets', jwt, app.middleware.admin(), controller.admin.stylePreset.create);
  router.put('/api/admin/style-presets/:id', jwt, app.middleware.admin(), controller.admin.stylePreset.update);
  router.put('/api/admin/style-presets/:id/toggle', jwt, app.middleware.admin(), controller.admin.stylePreset.toggle);
  router.delete('/api/admin/style-presets/:id', jwt, app.middleware.admin(), controller.admin.stylePreset.destroy);
};
