// server/database/migrate-style-presets-v2.js
// 幂等：comics.style_preset_id + 风格预设收敛为 8 核心
const Database = require('better-sqlite3');
const path = require('path');
const { ensureCoreStylePresets, seedData } = require('./seeds/style_presets');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'comic.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(column => column.name === columnName);
}

function ensureStylePresetIdColumn() {
  if (columnExists('comics', 'style_preset_id')) {
    console.log('[migrate] comics.style_preset_id 已存在，跳过 ADD COLUMN');
    return;
  }
  db.exec('ALTER TABLE comics ADD COLUMN style_preset_id INTEGER');
  console.log('[migrate] 已添加 comics.style_preset_id');
}

/**
 * 按 style_prompt 精确匹配回填 style_preset_id（可选）
 */
function backfillStylePresetIds() {
  if (!columnExists('comics', 'style_preset_id')) return 0;

  const presets = db
    .prepare('SELECT id, style_prompt FROM style_presets')
    .all();
  const update = db.prepare(
    'UPDATE comics SET style_preset_id = ? WHERE style_prompt = ? AND style_preset_id IS NULL'
  );

  let filled = 0;
  const transaction = db.transaction(() => {
    for (const preset of presets) {
      const result = update.run(preset.id, preset.style_prompt);
      filled += result.changes;
    }
    // 兼容旧版种子文案：用 code 对应的当前文案匹配不到时，尝试 seed 旧描述不再做模糊匹配
  });
  transaction();
  return filled;
}

function main() {
  console.log(`[migrate] DB: ${dbPath}`);
  ensureStylePresetIdColumn();
  const ensureResult = ensureCoreStylePresets(db);
  const filled = backfillStylePresetIds();
  console.log(`[migrate] 精确匹配回填 style_preset_id: ${filled} 条`);
  console.log('[migrate] 完成', { coreCount: seedData.length, ...ensureResult });
  db.close();
}

main();
