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

    // AI 多提供商表结构（幂等加列 + 破坏性清空旧 text/image 配置，仅执行一次）
    try {
      ensureAiProviderSchema(app);
    } catch (err) {
      app.logger.error('AI 提供商 schema 初始化失败:', err);
    }
  });
};

function ensureAiProviderSchema(app) {
  const db = app.db;
  const columns = db.prepare('PRAGMA table_info(ai_configs)').all();
  const columnNames = new Set(columns.map(column => column.name));

  const addColumn = (name, definition) => {
    if (!columnNames.has(name)) {
      db.exec(`ALTER TABLE ai_configs ADD COLUMN ${name} ${definition}`);
      app.logger.info(`ai_configs added column ${name}`);
    }
  };

  addColumn('name', 'TEXT');
  addColumn('protocol', 'TEXT');
  addColumn('enabled', 'INTEGER NOT NULL DEFAULT 1');
  addColumn('is_default', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('extra', "TEXT NOT NULL DEFAULT '{}'");

  const migration = db.prepare(
    "SELECT value FROM configs WHERE category = '_migration' AND key = 'ai_providers_v2'"
  ).get();

  if (migration) {
    return;
  }

  db.exec('BEGIN');
  try {
    db.prepare(
      "DELETE FROM ai_configs WHERE type IN ('text', 'image')"
    ).run();
    db.prepare(
      "DELETE FROM configs WHERE category = 'ai'"
    ).run();
    db.prepare(`
      INSERT INTO configs (category, key, value, updated_at)
      VALUES ('_migration', 'ai_providers_v2', ?, CURRENT_TIMESTAMP)
    `).run(JSON.stringify({ completed: true, at: new Date().toISOString(), destructive: true }));
    db.exec('COMMIT');
    app.logger.info('AI providers v2 migration applied (cleared old text/image configs)');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
