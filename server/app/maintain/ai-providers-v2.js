'use strict';

/**
 * 维护任务：ai-providers-v2
 * 从正式服 2263ea1 升级：ai_configs 多提供商字段 + 清空旧 text/image 配置
 *
 * 注意：step=2 会删除 type 为 text/image 的 ai_configs 行及 configs.category=ai 的 KV，不可恢复。
 */

const {
  columnExists,
  listColumns,
  tableExists,
  addColumnIfMissing,
  getMigrationFlag,
  setMigrationFlag,
} = require('./lib');

const NAME = 'ai-providers-v2';

const REQUIRED_COLUMNS = [
  { name: 'name', definition: 'TEXT' },
  { name: 'protocol', definition: 'TEXT' },
  { name: 'enabled', definition: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'is_default', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'extra', definition: "TEXT NOT NULL DEFAULT '{}'" },
];

/**
 * @param {import('better-sqlite3').Database} db
 */
function collectAnalysis(db) {
  if (!tableExists(db, 'ai_configs')) {
    return {
      ready: false,
      error: '表 ai_configs 不存在，请先确认应用是否正常初始化数据库',
    };
  }

  const existingColumns = listColumns(db, 'ai_configs');
  const missingColumns = REQUIRED_COLUMNS
    .filter(column => !existingColumns.includes(column.name))
    .map(column => column.name);

  // 旧库可能尚无 name/protocol 列，SELECT 需兼容
  const selectParts = ['id', 'type', 'provider', 'model'];
  if (existingColumns.includes('name')) selectParts.push('name');
  if (existingColumns.includes('protocol')) selectParts.push('protocol');

  const providerRows = db
    .prepare(
      `SELECT ${selectParts.join(', ')} FROM ai_configs WHERE type IN ('text', 'image') OR type IS NULL`
    )
    .all();

  const storageRows = db
    .prepare("SELECT id, type, provider FROM ai_configs WHERE type = 'image_storage'")
    .all();

  let aiConfigKvCount = 0;
  if (tableExists(db, 'configs')) {
    aiConfigKvCount = db
      .prepare("SELECT COUNT(*) AS cnt FROM configs WHERE category = 'ai'")
      .get().cnt;
  }

  const migrationFlag = getMigrationFlag(db, 'ai_providers_v2');
  const alreadyMigrated = !!migrationFlag;

  const willDeleteProviderCount = providerRows.length;
  const willDeleteKvCount = aiConfigKvCount;
  const schemaAligned = missingColumns.length === 0;

  return {
    ready: true,
    alreadyMigrated,
    migrationFlag,
    schema: {
      existingColumns,
      missingColumns,
      schemaAligned,
      hasLegacyApiFormat: existingColumns.includes('api_format'),
    },
    dataImpact: {
      providerRowsToDelete: willDeleteProviderCount,
      providerSamples: providerRows.slice(0, 20).map(row => ({
        id: row.id,
        type: row.type,
        provider: row.provider,
        model: row.model,
        name: row.name,
        protocol: row.protocol,
      })),
      imageStorageRowsPreserved: storageRows.length,
      configsAiKvToDelete: willDeleteKvCount,
    },
    warnings: [
      willDeleteProviderCount > 0
        ? `将删除 ${willDeleteProviderCount} 条旧 text/image 提供商配置，部署后需在管理端重新配置 AI 提供商`
        : '无旧 text/image 提供商行需要删除',
      willDeleteKvCount > 0
        ? `将删除 configs 中 category=ai 的 ${willDeleteKvCount} 条 KV`
        : '无 configs.category=ai 需要删除',
      alreadyMigrated
        ? '迁移标记 ai_providers_v2 已存在；step=2 仍会幂等补列，并刷新标记，不会重复误删 image_storage'
        : '尚未写入迁移标记',
    ],
    safeToExecute: true,
    summary: schemaAligned && alreadyMigrated && willDeleteProviderCount === 0 && willDeleteKvCount === 0
      ? '结构与数据已对齐，step=2 基本为空操作'
      : `待补列 ${missingColumns.length} 个；将清理提供商 ${willDeleteProviderCount} 行、AI KV ${willDeleteKvCount} 条`,
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

  const addedColumns = [];
  const run = db.transaction(() => {
    for (const column of REQUIRED_COLUMNS) {
      if (addColumnIfMissing(db, 'ai_configs', column.name, column.definition)) {
        addedColumns.push(column.name);
      }
    }

    // 仅清理模型提供商，保留 image_storage
    const deletedProviders = db
      .prepare("DELETE FROM ai_configs WHERE type IN ('text', 'image') OR type IS NULL")
      .run();

    let deletedKv = { changes: 0 };
    if (tableExists(db, 'configs')) {
      deletedKv = db.prepare("DELETE FROM configs WHERE category = 'ai'").run();
    }

    setMigrationFlag(db, 'ai_providers_v2', {
      completed: true,
      at: new Date().toISOString(),
      destructive: true,
      source: 'maintain/ai-providers-v2',
      deletedProviders: deletedProviders.changes,
      deletedKv: deletedKv.changes,
      addedColumns,
    });

    return {
      addedColumns,
      deletedProviders: deletedProviders.changes,
      deletedKv: deletedKv.changes,
    };
  });

  const result = run();
  const after = collectAnalysis(db);

  return {
    executed: true,
    result,
    after,
  };
}

module.exports = {
  name: NAME,
  description: 'AI 多提供商 schema（name/protocol/enabled/is_default/extra）并对齐清理旧 text/image 配置',
  fromCommit: '2263ea1',
  destructive: true,
  analyze(db) {
    return collectAnalysis(db);
  },
  execute(db) {
    return executeMigration(db);
  },
};
