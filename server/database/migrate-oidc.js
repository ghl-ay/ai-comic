// server/database/migrate-oidc.js
// 幂等：为 users 表增加 OIDC 绑定字段与唯一索引
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'comic.db');
const db = new Database(dbPath);

const tableInfo = db.prepare('PRAGMA table_info(users)').all();
const columnNames = new Set(tableInfo.map(col => col.name));

const columnsToAdd = [
  { name: 'oidc_sub', sql: 'ALTER TABLE users ADD COLUMN oidc_sub TEXT' },
  { name: 'oidc_issuer', sql: 'ALTER TABLE users ADD COLUMN oidc_issuer TEXT' },
  { name: 'display_name', sql: 'ALTER TABLE users ADD COLUMN display_name TEXT' },
  { name: 'avatar_url', sql: 'ALTER TABLE users ADD COLUMN avatar_url TEXT' },
  { name: 'auth_provider', sql: "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'" },
];

for (const column of columnsToAdd) {
  if (!columnNames.has(column.name)) {
    console.log(`Adding ${column.name} column to users table...`);
    db.exec(column.sql);
  } else {
    console.log(`${column.name} column already exists, skipping`);
  }
}

// 部分唯一索引：同一 issuer+sub 只能绑一个用户
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oidc
  ON users(oidc_issuer, oidc_sub)
  WHERE oidc_sub IS NOT NULL
`);
console.log('Ensured unique index idx_users_oidc');

// 既有用户默认 local（auth_provider 新增时 SQLite 对旧行可能为 NULL）
db.exec(`UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL`);

console.log('OIDC migration completed');
db.close();
