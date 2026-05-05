// server/app.js
module.exports = app => {
  // 应用启动时初始化数据库
  app.beforeStart(async () => {
    const db = require('./database/init');
    app.db = db;
    app.logger.info('Database initialized');

    // 执行配置迁移
    try {
      const ctx = app.createAnonymousContext();
      ctx.service.db.migrateToConfigs();
    } catch (err) {
      app.logger.error('配置迁移失败:', err);
    }
  });
};
