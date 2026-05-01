// server/app.js
module.exports = app => {
  // 应用启动时初始化数据库
  app.beforeStart(async () => {
    const db = require('./database/init');
    app.db = db;
    app.logger.info('Database initialized');
  });
};
