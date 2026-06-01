// server/database/migrate-short-comic.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'comic.db');
const db = new Database(dbPath);

console.log('开始迁移：为 comics 表添加 type 字段...');

try {
  // 检查 type 字段是否已存在
  const tableInfo = db.prepare("PRAGMA table_info(comics)").all();
  const hasTypeField = tableInfo.some(col => col.name === 'type');
  
  if (!hasTypeField) {
    db.exec("ALTER TABLE comics ADD COLUMN type VARCHAR(20) DEFAULT 'normal'");
    console.log('成功添加 type 字段');
  } else {
    console.log('type 字段已存在，跳过');
  }
  
  console.log('迁移完成');
} catch (err) {
  console.error('迁移失败:', err.message);
} finally {
  db.close();
}
