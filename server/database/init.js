// server/database/init.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/comic.db');
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

module.exports = db;
