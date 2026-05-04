// server/database/migrate-admin.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'comic.db');
const db = new Database(dbPath);

// 检查 is_admin 列是否存在
const tableInfo = db.prepare('PRAGMA table_info(users)').all();
const hasIsAdmin = tableInfo.some(col => col.name === 'is_admin');

if (!hasIsAdmin) {
  console.log('Adding is_admin column to users table...');
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');

  // 设置第一个用户为管理员（如果存在）
  const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  if (firstUser) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id);
    console.log(`Set user ${firstUser.id} as admin`);
  }

  console.log('Migration completed');
} else {
  console.log('is_admin column already exists, skipping migration');
}

db.close();
