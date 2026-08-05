'use strict';

/**
 * 维护任务：configs-storage
 * 将历史 image_storage（ai_configs）中的腾讯云字段迁移到 configs.storage.*
 * （原 app.js 启动时 migrateToConfigs，现改为人工执行）
 */

const { tableExists, getMigrationFlag, setMigrationFlag } = require('./lib');

const NAME = 'configs-storage';

/**
 * @param {import('better-sqlite3').Database} db
 */
function findStorageConfig(db) {
  if (!tableExists(db, 'ai_configs')) return null;
  const row = db
    .prepare("SELECT * FROM ai_configs WHERE type = 'image_storage' LIMIT 1")
    .get();
  if (!row) return null;

  // 兼容可能存在的扩展字段（历史实现可能存在 oss* 列或仅存在基础列）
  return {
    id: row.id,
    type: row.type,
    provider: row.provider,
    accessMode: row.access_mode || row.accessMode,
    ossSecretId: row.oss_secret_id || row.ossSecretId,
    ossSecretKey: row.oss_secret_key || row.ossSecretKey,
    ossBucket: row.oss_bucket || row.ossBucket,
    ossRegion: row.oss_region || row.ossRegion,
    ossPublicBaseUrl: row.oss_public_base_url || row.ossPublicBaseUrl,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
function getConfig(db, category, key) {
  if (!tableExists(db, 'configs')) return null;
  const row = db
    .prepare('SELECT value FROM configs WHERE category = ? AND key = ?')
    .get(category, key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 */
function collectAnalysis(db) {
  if (!tableExists(db, 'configs')) {
    return { ready: false, error: '表 configs 不存在' };
  }

  const migrationFlag = getMigrationFlag(db, 'configs');
  const storageDefault = getConfig(db, 'storage', 'default');
  const storageCos = getConfig(db, 'storage', 'tencent-cos');
  const legacyStorage = findStorageConfig(db);

  return {
    ready: true,
    alreadyMigrated: !!migrationFlag?.completed,
    migrationFlag,
    current: {
      storageDefault,
      hasTencentCos: !!storageCos,
    },
    legacy: {
      hasImageStorageRow: !!legacyStorage,
      sample: legacyStorage
        ? {
          id: legacyStorage.id,
          provider: legacyStorage.provider,
          hasOssSecretId: !!legacyStorage.ossSecretId,
        }
        : null,
    },
    warnings: [
      migrationFlag?.completed
        ? '迁移标记 configs 已完成；step=2 将跳过写入（幂等）'
        : '尚未完成 storage 配置迁移',
      !legacyStorage && !storageDefault
        ? '无旧 image_storage 且无 storage.default：执行后将写入默认 provider=direct'
        : null,
    ].filter(Boolean),
    safeToExecute: true,
    summary: migrationFlag?.completed
      ? '已迁移，无需再写'
      : legacyStorage?.ossSecretId
        ? '将从 image_storage 迁移腾讯云 COS 到 configs.storage'
        : '将写入默认 storage.default=direct',
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

  if (before.alreadyMigrated) {
    return {
      executed: true,
      skipped: true,
      reason: 'migration flag configs already completed',
      after: collectAnalysis(db),
    };
  }

  const setConfig = (category, key, value) => {
    const jsonValue = JSON.stringify(value);
    db.prepare(`
      INSERT INTO configs (category, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(category, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(category, key, jsonValue);
  };

  const storageConfig = findStorageConfig(db);
  let wroteCos = false;
  let wroteDefault = false;

  const run = db.transaction(() => {
    if (storageConfig?.ossSecretId) {
      setConfig('storage', 'tencent-cos', {
        secretId: storageConfig.ossSecretId,
        secretKey: storageConfig.ossSecretKey,
        bucket: storageConfig.ossBucket,
        region: storageConfig.ossRegion,
        publicBaseUrl: storageConfig.ossPublicBaseUrl || '',
      });
      wroteCos = true;
      setConfig('storage', 'default', {
        provider: 'tencent-cos',
      });
      wroteDefault = true;
    } else if (storageConfig) {
      setConfig('storage', 'default', {
        provider: storageConfig.accessMode === 'oss' ? 'tencent-cos' : 'direct',
      });
      wroteDefault = true;
    } else {
      setConfig('storage', 'default', { provider: 'direct' });
      wroteDefault = true;
    }

    setMigrationFlag(db, 'configs', {
      completed: true,
      at: new Date().toISOString(),
      source: 'maintain/configs-storage',
    });
  });

  run();

  return {
    executed: true,
    skipped: false,
    result: { wroteCos, wroteDefault },
    after: collectAnalysis(db),
  };
}

module.exports = {
  name: NAME,
  description: '历史 image_storage → configs.storage（腾讯云/默认 direct）',
  fromCommit: 'pre-2263ea1+',
  destructive: false,
  analyze(db) {
    return collectAnalysis(db);
  },
  execute(db) {
    return executeMigration(db);
  },
};
