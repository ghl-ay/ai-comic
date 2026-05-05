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
      'SELECT id, username, is_admin, created_at FROM users WHERE id = ?'
    );
    return stmt.get(id);
  }

  countUsers() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
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

  findAllUsers() {
    const stmt = this.db.prepare(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
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

  // AI 配置相关（全局配置，user_id 为 null）
  findGlobalAiConfigs() {
    const stmt = this.db.prepare(
      'SELECT id, type, provider, base_url, model, api_format, created_at, updated_at FROM ai_configs WHERE user_id IS NULL'
    );
    return stmt.all();
  }

  findGlobalAiConfigByType(type) {
    const stmt = this.db.prepare(
      'SELECT * FROM ai_configs WHERE user_id IS NULL AND type = ?'
    );
    const config = stmt.get(type);
    if (!config) return null;
    return {
      id: config.id,
      provider: config.provider,
      apiKey: config.api_key,
      baseUrl: config.base_url,
      model: config.model,
      apiFormat: config.api_format || 'openai',
    };
  }

  upsertGlobalAiConfig(type, provider, apiKey, baseUrl, model, apiFormat = 'openai') {
    const existing = this.findGlobalAiConfigByType(type);
    if (existing) {
      const stmt = this.db.prepare(
        'UPDATE ai_configs SET provider = ?, api_key = ?, base_url = ?, model = ?, api_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run(provider, apiKey, baseUrl, model, apiFormat, existing.id);
      return existing.id;
    } else {
      const stmt = this.db.prepare(
        'INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model, api_format) VALUES (NULL, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(type, provider, apiKey, baseUrl, model, apiFormat);
      return result.lastInsertRowid;
    }
  }

  // 旧方法保留用于兼容
  createAiConfig(userId, type, provider, apiKey, baseUrl, model) {
    const stmt = this.db.prepare(
      'INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(userId, type, provider, apiKey, baseUrl, model);
    return result.lastInsertRowid;
  }

  findAiConfigsByUserId(userId) {
    const stmt = this.db.prepare(
      'SELECT id, user_id, type, provider, base_url, model, created_at, updated_at FROM ai_configs WHERE user_id = ?'
    );
    return stmt.all(userId);
  }

  findAiConfigByUserIdAndType(userId, type) {
    const stmt = this.db.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND type = ?'
    );
    return stmt.get(userId, type);
  }

  updateAiConfig(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.provider !== undefined) {
      fields.push('provider = ?');
      values.push(data.provider);
    }
    if (data.api_key !== undefined) {
      fields.push('api_key = ?');
      values.push(data.api_key);
    }
    if (data.base_url !== undefined) {
      fields.push('base_url = ?');
      values.push(data.base_url);
    }
    if (data.model !== undefined) {
      fields.push('model = ?');
      values.push(data.model);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE ai_configs SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  upsertAiConfig(userId, type, provider, apiKey, baseUrl, model) {
    const existing = this.findAiConfigByUserIdAndType(userId, type);
    if (existing) {
      this.updateAiConfig(existing.id, userId, {
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model,
      });
      return existing.id;
    } else {
      return this.createAiConfig(userId, type, provider, apiKey, baseUrl, model);
    }
  }

  // 图片存储配置相关
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
    } catch {
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
        'INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model, api_format) VALUES (NULL, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run('image_storage', '', jsonData, '', '', '');
      return result.lastInsertRowid;
    }
  }

  // 漫画相关
  createComic(userId, title, stylePrompt) {
    const stmt = this.db.prepare(
      'INSERT INTO comics (user_id, title, style_prompt) VALUES (?, ?, ?)'
    );
    const result = stmt.run(userId, title, stylePrompt || null);
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
    if (data.style_prompt !== undefined) {
      fields.push('style_prompt = ?');
      values.push(data.style_prompt);
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
}

module.exports = DbService;
