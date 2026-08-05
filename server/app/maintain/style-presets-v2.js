'use strict';

/**
 * 维护任务：style-presets-v2
 * 从正式服 2263ea1 升级：comics.style_preset_id + 风格预设收敛 8 核心 + 按 prompt 精确回填
 */

const {
  columnExists,
  listColumns,
  tableExists,
  addColumnIfMissing,
  getMigrationFlag,
  setMigrationFlag,
} = require('./lib');
const {
  ensureCoreStylePresets,
  seedData,
  CORE_CODES,
} = require('../../database/seeds/style_presets');

const NAME = 'style-presets-v2';

/**
 * @param {import('better-sqlite3').Database} db
 */
function collectAnalysis(db) {
  if (!tableExists(db, 'comics')) {
    return {
      ready: false,
      error: '表 comics 不存在',
    };
  }
  if (!tableExists(db, 'style_presets')) {
    return {
      ready: false,
      error: '表 style_presets 不存在',
    };
  }

  const comicsColumns = listColumns(db, 'comics');
  const hasStylePresetId = comicsColumns.includes('style_preset_id');

  const allPresets = db
    .prepare('SELECT id, code, name, style_prompt, cover_image, is_enabled FROM style_presets ORDER BY id')
    .all();
  const nonCorePresets = allPresets.filter(preset => !CORE_CODES.includes(preset.code));
  const corePresets = allPresets.filter(preset => CORE_CODES.includes(preset.code));
  const missingCoreCodes = CORE_CODES.filter(
    code => !allPresets.some(preset => preset.code === code)
  );

  const comicStats = db
    .prepare(`
      SELECT
        COUNT(*) AS totalComics,
        SUM(CASE WHEN style_prompt IS NOT NULL AND TRIM(style_prompt) != '' THEN 1 ELSE 0 END) AS withStylePrompt
      FROM comics
    `)
    .get();

  let boundCount = 0;
  let unboundWithPrompt = 0;
  let backfillCandidates = 0;
  let sampleBackfill = [];

  if (hasStylePresetId) {
    boundCount = db
      .prepare('SELECT COUNT(*) AS cnt FROM comics WHERE style_preset_id IS NOT NULL')
      .get().cnt;
    unboundWithPrompt = db
      .prepare(`
        SELECT COUNT(*) AS cnt FROM comics
        WHERE style_preset_id IS NULL
          AND style_prompt IS NOT NULL AND TRIM(style_prompt) != ''
      `)
      .get().cnt;

    const prompts = db
      .prepare(`
        SELECT id, title, style_prompt FROM comics
        WHERE style_preset_id IS NULL
          AND style_prompt IS NOT NULL AND TRIM(style_prompt) != ''
        LIMIT 200
      `)
      .all();
    const promptToPreset = new Map(
      allPresets.map(preset => [preset.style_prompt, preset])
    );
    for (const comic of prompts) {
      const matched = promptToPreset.get(comic.style_prompt);
      if (matched) {
        backfillCandidates += 1;
        if (sampleBackfill.length < 15) {
          sampleBackfill.push({
            comicId: comic.id,
            title: comic.title,
            presetCode: matched.code,
            presetId: matched.id,
          });
        }
      }
    }
  } else {
    // 列不存在时，预估回填量（基于当前 preset 文案）
    const prompts = db
      .prepare(`
        SELECT id, title, style_prompt FROM comics
        WHERE style_prompt IS NOT NULL AND TRIM(style_prompt) != ''
        LIMIT 200
      `)
      .all();
    const promptToPreset = new Map(
      seedData.map(item => [item.style_prompt, item.code])
    );
    // 也匹配库内现有文案
    for (const preset of allPresets) {
      promptToPreset.set(preset.style_prompt, preset.code);
    }
    for (const comic of prompts) {
      if (promptToPreset.has(comic.style_prompt)) {
        backfillCandidates += 1;
        if (sampleBackfill.length < 15) {
          sampleBackfill.push({
            comicId: comic.id,
            title: comic.title,
            presetCode: promptToPreset.get(comic.style_prompt),
          });
        }
      }
    }
  }

  const comicsReferencingNonCore = hasStylePresetId
    ? db
      .prepare(`
        SELECT COUNT(*) AS cnt FROM comics
        WHERE style_preset_id IN (
          SELECT id FROM style_presets WHERE code NOT IN (${CORE_CODES.map(() => '?').join(',')})
        )
      `)
      .get(...CORE_CODES).cnt
    : 0;

  const migrationFlag = getMigrationFlag(db, 'style_presets_v2');
  const coversMissing = corePresets.filter(preset => !preset.cover_image).map(preset => preset.code);

  return {
    ready: true,
    alreadyMigrated: !!migrationFlag,
    migrationFlag,
    schema: {
      comicsColumns,
      hasStylePresetId,
      willAddStylePresetId: !hasStylePresetId,
    },
    presets: {
      total: allPresets.length,
      corePresent: corePresets.length,
      coreExpected: CORE_CODES.length,
      missingCoreCodes,
      nonCoreToDelete: nonCorePresets.map(preset => ({
        id: preset.id,
        code: preset.code,
        name: preset.name,
      })),
      coversMissingOnCore: coversMissing,
    },
    comics: {
      total: comicStats.totalComics,
      withStylePrompt: comicStats.withStylePrompt,
      alreadyBound: boundCount,
      unboundWithPrompt,
      backfillCandidatesApprox: backfillCandidates,
      sampleBackfill,
      referencingNonCorePresets: comicsReferencingNonCore,
    },
    warnings: [
      !hasStylePresetId ? '将 ADD COLUMN comics.style_preset_id' : 'comics.style_preset_id 已存在',
      nonCorePresets.length > 0
        ? `将删除非核心风格预设 ${nonCorePresets.length} 条（漫画绑定会先置空）`
        : '无非核心预设需要删除',
      missingCoreCodes.length > 0
        ? `将 upsert 补齐缺失核心风格：${missingCoreCodes.join(', ')}`
        : '8 个核心 code 均已存在（文案/排序仍会更新）',
      coversMissing.length > 0
        ? `核心预设 cover_image 为空：${coversMissing.join(', ')}（可依赖仓库 styles 资源或管理端重生）`
        : '核心预设均有 cover_image 字段值',
      comicsReferencingNonCore > 0
        ? `${comicsReferencingNonCore} 条漫画引用非核心预设，执行时会解绑`
        : null,
    ].filter(Boolean),
    safeToExecute: true,
    summary: [
      hasStylePresetId ? '列已存在' : '需加 style_preset_id',
      `非核心预设 ${nonCorePresets.length} 待删`,
      `约 ${backfillCandidates} 条可精确回填绑定`,
    ].join('；'),
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
function executeMigration(db) {
  const before = collectAnalysis(db);
  if (!before.ready) {
    const error = new Error(before.error);
    error.status = 400;
    throw error;
  }

  const addedStylePresetId = addColumnIfMissing(
    db,
    'comics',
    'style_preset_id',
    'INTEGER'
  );

  const ensureResult = ensureCoreStylePresets(db);

  let backfillFilled = 0;
  if (columnExists(db, 'comics', 'style_preset_id')) {
    const presets = db.prepare('SELECT id, style_prompt FROM style_presets').all();
    const update = db.prepare(
      'UPDATE comics SET style_preset_id = ? WHERE style_prompt = ? AND style_preset_id IS NULL'
    );
    const fill = db.transaction(() => {
      let filled = 0;
      for (const preset of presets) {
        const result = update.run(preset.id, preset.style_prompt);
        filled += result.changes;
      }
      return filled;
    });
    backfillFilled = fill();
  }

  setMigrationFlag(db, 'style_presets_v2', {
    completed: true,
    at: new Date().toISOString(),
    source: 'maintain/style-presets-v2',
    addedStylePresetId,
    ensureResult,
    backfillFilled,
  });

  const after = collectAnalysis(db);

  return {
    executed: true,
    result: {
      addedStylePresetId,
      ensureResult,
      backfillFilled,
      coreCount: seedData.length,
    },
    after,
  };
}

module.exports = {
  name: NAME,
  description: 'comics.style_preset_id + 风格预设收敛 8 核心 + 按 style_prompt 精确回填绑定',
  fromCommit: '2263ea1',
  destructive: false,
  analyze(db) {
    return collectAnalysis(db);
  },
  execute(db) {
    return executeMigration(db);
  },
};
