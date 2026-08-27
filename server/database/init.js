// server/database/init.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/comic.db');
const sqlPath = path.join(__dirname, 'init.sql');

// 确保目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 读取并执行初始化 SQL
const initSql = fs.readFileSync(sqlPath, 'utf-8');
db.exec(initSql);

// 执行种子数据初始化
const { seedStylePresets } = require('./seeds/style_presets');
seedStylePresets(db);

// 默认管理员账号初始化（若无用户）
const bcrypt = require('bcryptjs');
const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (countUsers.count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)').run('admin', hash);
}

module.exports = db;
