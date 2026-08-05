// server/database/migrate-ai-providers.js
// 破坏性：重整 ai_configs 提供商字段，清空旧 text/image 配置与 configs.ai/* KV
'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'comic.db');
const db = new Database(dbPath);

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(column => column.name === columnName);
}

function addColumnIfMissing(tableName, columnName, definition) {
  if (!columnExists(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    console.log(`Added column ${tableName}.${columnName}`);
  }
}

db.exec('BEGIN');
try {
  addColumnIfMissing('ai_configs', 'name', 'TEXT');
  addColumnIfMissing('ai_configs', 'protocol', 'TEXT');
  addColumnIfMissing('ai_configs', 'enabled', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('ai_configs', 'is_default', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('ai_configs', 'extra', "TEXT NOT NULL DEFAULT '{}'");

  // 仅清空模型提供商配置，保留 image_storage 等非模型用途
  const deletedProviders = db.prepare(
    "DELETE FROM ai_configs WHERE type IN ('text', 'image') OR type IS NULL"
  ).run();
  console.log(`Deleted ${deletedProviders.changes} old text/image provider rows`);

  // 删除旧 KV AI 配置（不迁移）
  const deletedKv = db.prepare(
    "DELETE FROM configs WHERE category = 'ai'"
  ).run();
  console.log(`Deleted ${deletedKv.changes} configs rows with category=ai`);

  db.prepare(`
    INSERT INTO configs (category, key, value, updated_at)
    VALUES ('_migration', 'ai_providers_v2', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(category, key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify({ completed: true, at: new Date().toISOString(), destructive: true }));

  db.exec('COMMIT');
  console.log('migrate-ai-providers completed (destructive)');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('migrate-ai-providers failed:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
