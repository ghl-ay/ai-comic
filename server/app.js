// server/app.js
module.exports = app => {
  // 仅建立数据库连接与建表/空库种子；结构变更与数据迁移必须人工走 /api/maintain
  app.beforeStart(async () => {
    const db = require('./database/init');
    app.db = db;
    app.logger.info('Database connected (no auto-migration on startup)');
  });
};
