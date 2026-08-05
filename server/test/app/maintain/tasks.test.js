'use strict';

const assert = require('assert');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const aiProvidersV2 = require('../../../app/maintain/ai-providers-v2');
const stylePresetsV2 = require('../../../app/maintain/style-presets-v2');
const { listTasks, getTask } = require('../../../app/maintain');

function createLegacyDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // 接近 2263ea1 的最小 schema
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE comics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      type VARCHAR(20) DEFAULT 'normal',
      style_prompt TEXT,
      cover_image VARCHAR(255),
      status VARCHAR(20) DEFAULT 'draft'
    );
    CREATE TABLE ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type VARCHAR(20) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      api_key VARCHAR(255) NOT NULL,
      base_url VARCHAR(255) NOT NULL,
      model VARCHAR(100) NOT NULL,
      api_format VARCHAR(20) DEFAULT 'openai'
    );
    CREATE TABLE configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category VARCHAR(50) NOT NULL,
      key VARCHAR(50) NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    );
    CREATE TABLE style_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      style_prompt TEXT NOT NULL,
      description TEXT,
      cover_image VARCHAR(255),
      sort_order INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(
    "INSERT INTO users (username, password) VALUES ('u1', 'x')"
  ).run();
  db.prepare(
    "INSERT INTO ai_configs (type, provider, api_key, base_url, model) VALUES ('text', 'openai', 'k', 'https://api', 'gpt')"
  ).run();
  db.prepare(
    "INSERT INTO ai_configs (type, provider, api_key, base_url, model) VALUES ('image_storage', 'local', 'k', '', '')"
  ).run();
  db.prepare(
    "INSERT INTO configs (category, key, value) VALUES ('ai', 'legacy', '1')"
  ).run();

  // 旧多风格 + 一条可精确匹配的漫画
  db.prepare(`
    INSERT INTO style_presets (code, name, category, style_prompt, description, sort_order)
    VALUES
      ('jp_monochrome', '日漫黑白', '日系', '日系黑白漫画风格，精细墨线线稿，网点纸与阴影排线，高对比黑白画面，分镜感强，不要彩色，不要照片写实', 'd', 1),
      ('old_horror', '旧恐怖', '其他', '恐怖风', 'd', 99)
  `).run();

  db.prepare(`
    INSERT INTO comics (user_id, title, style_prompt)
    VALUES (1, '测试', '日系黑白漫画风格，精细墨线线稿，网点纸与阴影排线，高对比黑白画面，分镜感强，不要彩色，不要照片写实')
  `).run();
  db.prepare(`
    INSERT INTO comics (user_id, title, style_prompt)
    VALUES (1, '自定义', '完全自定义不会匹配')
  `).run();

  return db;
}

describe('test/app/maintain/tasks.test.js', () => {
  it('registry lists known tasks', () => {
    const names = listTasks().map(task => task.name).sort();
    assert.deepStrictEqual(
      names,
      ['ai-providers-v2', 'configs-storage', 'style-presets-v2'].sort()
    );
    assert(getTask('ai-providers-v2'));
    assert(getTask('configs-storage'));
    assert.strictEqual(getTask('nope'), null);
  });

  it('ai-providers-v2 analyze then execute', () => {
    const db = createLegacyDb();
    const analysis = aiProvidersV2.analyze(db);
    assert.strictEqual(analysis.ready, true);
    assert(analysis.schema.missingColumns.includes('protocol'));
    assert.strictEqual(analysis.dataImpact.providerRowsToDelete, 1);
    assert.strictEqual(analysis.dataImpact.imageStorageRowsPreserved, 1);
    assert.strictEqual(analysis.dataImpact.configsAiKvToDelete, 1);

    const executed = aiProvidersV2.execute(db);
    assert.strictEqual(executed.executed, true);
    assert.strictEqual(executed.result.deletedProviders, 1);
    assert.strictEqual(executed.result.deletedKv, 1);
    assert(executed.result.addedColumns.includes('name'));

    const after = aiProvidersV2.analyze(db);
    assert.strictEqual(after.schema.schemaAligned, true);
    assert.strictEqual(after.alreadyMigrated, true);
    assert.strictEqual(
      db.prepare("SELECT COUNT(*) AS c FROM ai_configs WHERE type = 'image_storage'").get().c,
      1
    );
    assert.strictEqual(
      db.prepare("SELECT COUNT(*) AS c FROM ai_configs WHERE type = 'text'").get().c,
      0
    );
    db.close();
  });

  it('style-presets-v2 adds column, removes non-core, backfills', () => {
    const db = createLegacyDb();
    const analysis = stylePresetsV2.analyze(db);
    assert.strictEqual(analysis.ready, true);
    assert.strictEqual(analysis.schema.hasStylePresetId, false);
    assert.strictEqual(analysis.presets.nonCoreToDelete.length, 1);
    assert.ok(analysis.comics.backfillCandidatesApprox >= 1);

    const executed = stylePresetsV2.execute(db);
    assert.strictEqual(executed.executed, true);
    assert.strictEqual(executed.result.addedStylePresetId, true);
    assert.ok(executed.result.backfillFilled >= 1);

    const columns = db.prepare('PRAGMA table_info(comics)').all().map(column => column.name);
    assert(columns.includes('style_preset_id'));

    const coreCount = db.prepare(
      `SELECT COUNT(*) AS c FROM style_presets WHERE code IN (${['jp_monochrome','jp_color','jp_shoujo','jp_chibi','cn_ink','cn_xianxia','us_hero','realistic_cyber'].map(() => '?').join(',')})`
    ).get('jp_monochrome','jp_color','jp_shoujo','jp_chibi','cn_ink','cn_xianxia','us_hero','realistic_cyber').c;
    assert.strictEqual(coreCount, 8);
    assert.strictEqual(
      db.prepare("SELECT COUNT(*) AS c FROM style_presets WHERE code = 'old_horror'").get().c,
      0
    );

    const bound = db.prepare(
      "SELECT style_preset_id FROM comics WHERE title = '测试'"
    ).get();
    assert(bound.style_preset_id != null);

    const custom = db.prepare(
      "SELECT style_preset_id FROM comics WHERE title = '自定义'"
    ).get();
    assert.strictEqual(custom.style_preset_id, null);

    // 幂等再跑
    const again = stylePresetsV2.execute(db);
    assert.strictEqual(again.result.addedStylePresetId, false);
    db.close();
  });

  it('seed module is loadable from maintain path', () => {
    const seedPath = path.join(__dirname, '../../../database/seeds/style_presets.js');
    assert(fs.existsSync(seedPath));
  });
});
