// server/app/service/db.js
const Service = require('egg').Service;

class DbService extends Service {
  constructor(ctx) {
    super(ctx);
    this.db = ctx.app.db;
  }

  // 用户相关
  createUser(username, hashedPassword) {
    const stmt = this.db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    );
    const result = stmt.run(username, hashedPassword);
    return result.lastInsertRowid;
  }

  createUserWithAdminCheck(username, hashedPassword) {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password, is_admin)
      VALUES (?, ?, (SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END FROM users))
    `);
    const result = stmt.run(username, hashedPassword);
    return result.lastInsertRowid;
  }

  findUserByUsername(username) {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE username = ?'
    );
    return stmt.get(username);
  }

  findUserById(id) {
    const stmt = this.db.prepare(
      'SELECT id, username, is_admin, created_at, oidc_sub, oidc_issuer, auth_provider, display_name, avatar_url FROM users WHERE id = ?'
    );
    return stmt.get(id);
  }

  findUserByOidc(issuer, sub) {
    const stmt = this.db.prepare(
      'SELECT id, username, is_admin, created_at, oidc_sub, oidc_issuer, auth_provider, display_name, avatar_url FROM users WHERE oidc_issuer = ? AND oidc_sub = ?'
    );
    return stmt.get(issuer, sub);
  }

  countUsers() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get();
    return result.count;
  }

  countAdmins() {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = 1'
    );
    const result = stmt.get();
    return result.count;
  }

  updateUserAdmin(id, isAdmin) {
    const stmt = this.db.prepare(
      'UPDATE users SET is_admin = ? WHERE id = ?'
    );
    const result = stmt.run(isAdmin ? 1 : 0, id);
    return result.changes > 0;
  }

  /**
   * 绑定 OIDC 身份到本地用户
   * @returns {{ ok: true } | { ok: false, reason: string }}
   */
  bindUserOidc(userId, issuer, sub, profile = {}) {
    const user = this.db.prepare('SELECT id, oidc_sub, oidc_issuer FROM users WHERE id = ?').get(userId);
    if (!user) {
      return { ok: false, reason: 'user_not_found' };
    }
    if (user.oidc_sub) {
      return { ok: false, reason: 'already_bound' };
    }

    const existing = this.findUserByOidc(issuer, sub);
    if (existing && existing.id !== userId) {
      return { ok: false, reason: 'sub_taken' };
    }

    const stmt = this.db.prepare(`
      UPDATE users SET
        oidc_sub = ?,
        oidc_issuer = ?,
        display_name = COALESCE(?, display_name),
        avatar_url = COALESCE(?, avatar_url),
        auth_provider = 'both'
      WHERE id = ? AND oidc_sub IS NULL
    `);
    const result = stmt.run(
      sub,
      issuer,
      profile.displayName || null,
      profile.avatarUrl || null,
      userId
    );
    if (result.changes === 0) {
      return { ok: false, reason: 'already_bound' };
    }
    return { ok: true };
  }

  /**
   * 同事务：创建用户 + 绑定 OIDC。任一步失败则整单回滚。
   * @returns {{ ok: true, userId: number } | { ok: false, reason: string }}
   */
  createUserAndBindOidc(username, hashedPassword, issuer, sub, profile = {}) {
    const run = this.db.transaction(() => {
      const existingSub = this.findUserByOidc(issuer, sub);
      if (existingSub) {
        return { ok: false, reason: 'sub_taken' };
      }

      const userId = this.createUserWithAdminCheck(username, hashedPassword);
      const bindResult = this.bindUserOidc(userId, issuer, sub, profile);
      if (!bindResult.ok) {
        // 抛错触发 better-sqlite3 事务回滚，避免孤儿用户
        const rollbackError = new Error(bindResult.reason || 'bind_failed');
        rollbackError.bindReason = bindResult.reason || 'bind_failed';
        throw rollbackError;
      }
      return { ok: true, userId };
    });

    try {
      return run();
    } catch (error) {
      if (error.bindReason) {
        return { ok: false, reason: error.bindReason };
      }
      throw error;
    }
  }

  unbindUserOidc(userId) {
    const stmt = this.db.prepare(`
      UPDATE users SET
        oidc_sub = NULL,
        oidc_issuer = NULL,
        display_name = NULL,
        avatar_url = NULL,
        auth_provider = 'local'
      WHERE id = ?
    `);
    const result = stmt.run(userId);
    return result.changes > 0;
  }

  findAllUsers() {
    const stmt = this.db.prepare(`
      SELECT id, username, is_admin, created_at,
             oidc_sub, oidc_issuer, auth_provider, display_name
      FROM users
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  // 角色相关
  createCharacter(userId, name, description, appearance) {
    const stmt = this.db.prepare(
      'INSERT INTO characters (user_id, name, description, appearance) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(userId, name, description, appearance);
    return result.lastInsertRowid;
  }

  findCharactersByUserId(userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId);
  }

  findCharacterById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE id = ?'
    );
    return stmt.get(id);
  }

  findCharacterByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  updateCharacter(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.appearance !== undefined) {
      fields.push('appearance = ?');
      values.push(data.appearance);
    }
    if (data.reference_image !== undefined) {
      fields.push('reference_image = ?');
      values.push(data.reference_image);
    }
    if (data.reference_prompt !== undefined) {
      fields.push('reference_prompt = ?');
      values.push(data.reference_prompt);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE characters SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteCharacter(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM characters WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // 图片存储配置相关（历史：复用 ai_configs type=image_storage；模型提供商走 ai-provider 服务）
  findStorageConfig() {
    const stmt = this.db.prepare(
      'SELECT * FROM ai_configs WHERE user_id IS NULL AND type = ?'
    );
    const config = stmt.get('image_storage');
    if (!config) return null;

    try {
      const data = JSON.parse(config.api_key);
      return {
        id: config.id,
        accessMode: data.accessMode || 'direct',
        ossSecretId: data.ossSecretId || '',
        ossSecretKey: data.ossSecretKey || '',
        ossBucket: data.ossBucket || '',
        ossRegion: data.ossRegion || '',
        ossPublicBaseUrl: data.ossPublicBaseUrl || '',
      };
    } catch (e) {
      this.ctx.logger.warn('解析存储配置失败:', e);
      return null;
    }
  }

  upsertStorageConfig(data) {
    const jsonData = JSON.stringify({
      accessMode: data.accessMode || 'direct',
      ossSecretId: data.ossSecretId || '',
      ossSecretKey: data.ossSecretKey || '',
      ossBucket: data.ossBucket || '',
      ossRegion: data.ossRegion || '',
      ossPublicBaseUrl: data.ossPublicBaseUrl || '',
    });

    const existing = this.findStorageConfig();
    if (existing) {
      const stmt = this.db.prepare(
        'UPDATE ai_configs SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run(jsonData, existing.id);
      return existing.id;
    } else {
      const stmt = this.db.prepare(
        `INSERT INTO ai_configs
          (user_id, type, name, protocol, provider, api_key, base_url, model, enabled, is_default, extra)
         VALUES (NULL, ?, '', '', ?, ?, '', '', 1, 0, '{}')`
      );
      const result = stmt.run('image_storage', '', jsonData);
      return result.lastInsertRowid;
    }
  }

  // 漫画相关
  createComic(userId, title, stylePrompt, stylePresetId = null) {
    const stmt = this.db.prepare(
      'INSERT INTO comics (user_id, title, style_prompt, style_preset_id) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(
      userId,
      title,
      stylePrompt || null,
      stylePresetId !== undefined && stylePresetId !== null ? stylePresetId : null
    );
    return result.lastInsertRowid;
  }

  findComicsByUserId(userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId);
  }

  findComicById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE id = ?'
    );
    return stmt.get(id);
  }

  findComicByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  updateComic(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.style_prompt !== undefined) {
      fields.push('style_prompt = ?');
      values.push(data.style_prompt);
    }
    if (data.style_preset_id !== undefined) {
      fields.push('style_preset_id = ?');
      values.push(data.style_preset_id);
    }
    if (data.cover_image !== undefined) {
      fields.push('cover_image = ?');
      values.push(data.cover_image);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE comics SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteComic(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM comics WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // 章节相关
  createChapter(comicId, chapterNumber, title, layoutType) {
    const stmt = this.db.prepare(
      'INSERT INTO chapters (comic_id, chapter_number, title, layout_type) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(comicId, chapterNumber, title || null, layoutType || 4);
    return result.lastInsertRowid;
  }

  findChaptersByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC'
    );
    return stmt.all(comicId);
  }

  findChapterByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number LIMIT 1'
    );
    return stmt.get(comicId);
  }

  findChapterById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE id = ?'
    );
    return stmt.get(id);
  }

  findChapterByIdAndComicId(id, comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE id = ? AND comic_id = ?'
    );
    return stmt.get(id, comicId);
  }

  findLatestChapter(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number DESC LIMIT 1'
    );
    return stmt.get(comicId);
  }

  updateChapter(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.layout_type !== undefined) {
      fields.push('layout_type = ?');
      values.push(data.layout_type);
    }
    if (data.chapter_prompt !== undefined) {
      fields.push('chapter_prompt = ?');
      values.push(data.chapter_prompt);
    }
    if (data.character_ids !== undefined) {
      fields.push('character_ids = ?');
      values.push(data.character_ids);
    }
    if (data.script_content !== undefined) {
      fields.push('script_content = ?');
      values.push(data.script_content);
    }
    if (data.page_image !== undefined) {
      fields.push('page_image = ?');
      values.push(data.page_image);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteChapter(id) {
    const stmt = this.db.prepare(
      'DELETE FROM chapters WHERE id = ?'
    );
    const result = stmt.run(id);
    return result.changes > 0;
  }

  countChaptersByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM chapters WHERE comic_id = ?'
    );
    const result = stmt.get(comicId);
    return result.count;
  }

  // 小说相关
  createNovel(userId, title, content) {
    const wordCount = content.length;
    const stmt = this.db.prepare(
      'INSERT INTO novels (user_id, title, content, word_count) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(userId, title || null, content, wordCount);
    return result.lastInsertRowid;
  }

  findNovelById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE id = ?'
    );
    return stmt.get(id);
  }

  findNovelByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  findNovelByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE comic_id = ?'
    );
    return stmt.get(comicId);
  }

  updateNovel(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.comic_id !== undefined) {
      fields.push('comic_id = ?');
      values.push(data.comic_id);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE novels SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteNovel(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM novels WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // 通用配置表相关方法
  getConfig(category, key) {
    const stmt = this.db.prepare(
      'SELECT value FROM configs WHERE category = ? AND key = ?'
    );
    const row = stmt.get(category, key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch (e) {
      this.ctx.logger.warn(`解析配置失败 [${category}/${key}]:`, e);
      return null;
    }
  }

  setConfig(category, key, value) {
    const jsonValue = JSON.stringify(value);
    const stmt = this.db.prepare(`
      INSERT INTO configs (category, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(category, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(category, key, jsonValue);
  }

  // 数据迁移：从 ai_configs 迁移到 configs
  migrateToConfigs() {
    // 检查是否已迁移（使用迁移标记）
    const migrated = this.getConfig('_migration', 'configs');
    if (migrated?.completed) {
      this.ctx.logger.info('配置已迁移，跳过');
      return;
    }

    try {
      // 迁移存储配置
      const storageConfig = this.findStorageConfig();
      if (storageConfig) {
        // 迁移腾讯云 COS 配置
        if (storageConfig.ossSecretId) {
          this.setConfig('storage', 'tencent-cos', {
            secretId: storageConfig.ossSecretId,
            secretKey: storageConfig.ossSecretKey,
            bucket: storageConfig.ossBucket,
            region: storageConfig.ossRegion,
            publicBaseUrl: storageConfig.ossPublicBaseUrl || '',
          });
        }

        // 设置默认提供商
        this.setConfig('storage', 'default', {
          provider: storageConfig.accessMode === 'oss' ? 'tencent-cos' : 'direct',
        });
      } else {
        // 没有旧配置时，设置默认值
        this.setConfig('storage', 'default', { provider: 'direct' });
      }

      // AI 模型配置已迁移至多提供商表（ai-provider），不再写入 configs.category=ai

      // 设置迁移标记
      this.setConfig('_migration', 'configs', { completed: true });
      this.ctx.logger.info('配置迁移完成');
    } catch (err) {
      this.ctx.logger.error('配置迁移失败:', err);
      throw err;
    }
  }
}

module.exports = DbService;
