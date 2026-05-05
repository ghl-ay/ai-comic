// server/database/migrate-api-format.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/comic.db');
const db = new Database(dbPath);

// 检查字段是否已存在
const tableInfo = db.prepare('PRAGMA table_info(ai_configs)').all();
const hasApiFormat = tableInfo.some(col => col.name === 'api_format');

if (!hasApiFormat) {
  db.exec('ALTER TABLE ai_configs ADD COLUMN api_format VARCHAR(20) DEFAULT \'openai\'');
  console.log('Added api_format column to ai_configs table');
} else {
  console.log('api_format column already exists');
}

db.close();
