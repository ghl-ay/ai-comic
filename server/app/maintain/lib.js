'use strict';

const crypto = require('crypto');

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 * @param {string} columnName
 */
function columnExists(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(column => column.name === columnName);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 */
function listColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map(column => column.name);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 */
function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return !!row;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 * @param {string} columnName
 * @param {string} definition
 * @returns {boolean} true if added
 */
function addColumnIfMissing(db, tableName, columnName, definition) {
  if (columnExists(db, tableName, columnName)) {
    return false;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  return true;
}

/**
 * 读取 configs 中的迁移标记
 * @param {import('better-sqlite3').Database} db
 * @param {string} key
 */
function getMigrationFlag(db, key) {
  if (!tableExists(db, 'configs')) return null;
  const row = db
    .prepare("SELECT value, updated_at FROM configs WHERE category = '_migration' AND key = ?")
    .get(key);
  if (!row) return null;
  try {
    return { ...JSON.parse(row.value), updated_at: row.updated_at };
  } catch {
    return { raw: row.value, updated_at: row.updated_at };
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} key
 * @param {object} payload
 */
function setMigrationFlag(db, key, payload) {
  db.prepare(`
    INSERT INTO configs (category, key, value, updated_at)
    VALUES ('_migration', ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(category, key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, JSON.stringify(payload));
}

/**
 * 常量时间比较 token
 * @param {string} provided
 * @param {string} expected
 */
function tokensMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }
  if (!provided || !expected) {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * 从 query / body / header 取维护 token
 * @param {Egg.Context} ctx
 */
function extractToken(ctx) {
  return (
    ctx.query.token ||
    (ctx.request.body && ctx.request.body.token) ||
    ctx.get('x-maintain-token') ||
    ''
  );
}

/**
 * 解析 step：仅允许 1 或 2
 * @param {Egg.Context} ctx
 * @returns {1|2}
 */
function parseStep(ctx) {
  const raw =
    ctx.query.step !== undefined
      ? ctx.query.step
      : ctx.request.body && ctx.request.body.step !== undefined
        ? ctx.request.body.step
        : undefined;
  const step = parseInt(raw, 10);
  if (step !== 1 && step !== 2) {
    const error = new Error('step 必须为 1（分析）或 2（执行）');
    error.status = 400;
    throw error;
  }
  return step;
}

module.exports = {
  columnExists,
  listColumns,
  tableExists,
  addColumnIfMissing,
  getMigrationFlag,
  setMigrationFlag,
  tokensMatch,
  extractToken,
  parseStep,
};
