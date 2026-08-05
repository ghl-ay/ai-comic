// server/app/service/stylePreset.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const { CORE_CODES } = require('../../database/seeds/style_presets');

class StylePresetService extends Service {
  constructor(ctx) {
    super(ctx);
    this.db = ctx.app.db;
  }

  isCoreCode(code) {
    return CORE_CODES.includes(code);
  }

  /**
   * @param {object|null} row
   * @param {{ includeAdminFields?: boolean }} [options]
   */
  mapPresetRow(row, options = {}) {
    if (!row) return null;
    const mapped = {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      stylePrompt: row.style_prompt,
      description: row.description,
      coverImage: row.cover_image,
      sortOrder: row.sort_order,
      isCore: this.isCoreCode(row.code),
    };
    if (options.includeAdminFields) {
      mapped.isEnabled = row.is_enabled === 1;
      mapped.createdAt = row.created_at;
      mapped.updatedAt = row.updated_at;
    }
    return mapped;
  }

  async getEnabledPresets() {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE is_enabled = 1 ORDER BY sort_order, category'
    );
    return stmt.all();
  }

  async getCategories() {
    const stmt = this.db.prepare(
      `SELECT DISTINCT category, MIN(sort_order) as category_order
       FROM style_presets
       WHERE is_enabled = 1
       GROUP BY category
       ORDER BY category_order`
    );
    return stmt.all().map(row => row.category);
  }

  async getDefaultStylePrompt() {
    const stmt = this.db.prepare(
      'SELECT style_prompt FROM style_presets WHERE code = ? AND is_enabled = 1'
    );
    const preset = stmt.get('jp_monochrome');
    return preset ? preset.style_prompt : '日系黑白漫画风格';
  }

  async getDefaultPreset() {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE code = ? AND is_enabled = 1'
    );
    return stmt.get('jp_monochrome') || null;
  }

  async getAllPresets() {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets ORDER BY sort_order, category'
    );
    return stmt.all();
  }

  async getById(id) {
    const stmt = this.db.prepare('SELECT * FROM style_presets WHERE id = ?');
    return stmt.get(id);
  }

  async getEnabledById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE id = ? AND is_enabled = 1'
    );
    return stmt.get(id);
  }

  async getByCode(code) {
    const stmt = this.db.prepare('SELECT * FROM style_presets WHERE code = ?');
    return stmt.get(code);
  }

  async getPresetsByIds(ids) {
    const uniqueIds = [...new Set((ids || []).filter(id => id != null))];
    if (uniqueIds.length === 0) return [];
    const placeholders = uniqueIds.map(() => '?').join(', ');
    return this.db.prepare(
      `SELECT id, code, name, cover_image, style_prompt, description
       FROM style_presets WHERE id IN (${placeholders})`
    ).all(...uniqueIds);
  }

  /**
   * 解析创建/更新时的风格绑定（唯一入口）
   *
   * create:
   *   - stylePresetId 显式 null → 解绑/自定义；prompt 空则默认文案
   *   - stylePresetId 为 id → 绑定；prompt 空则用预设文案
   *   - 未传 stylePresetId：有 prompt → 仅文本；无 prompt → 默认绑定日漫黑白
   *
   * update:
   *   - stylePresetId 显式传入 → 按 create 同类规则写绑定
   *   - 仅改 stylePrompt：若与当前绑定预设文案不同 → 自动解绑，避免封面错绑
   *
   * @param {{
   *   mode?: 'create'|'update',
   *   stylePrompt?: string|null,
   *   stylePresetId?: number|null,
   *   stylePresetIdProvided?: boolean,
   *   existing?: { style_prompt?: string|null, style_preset_id?: number|null }|null,
   * }} input
   * @returns {Promise<{ stylePrompt: string|null|undefined, stylePresetId: number|null|undefined, preset: object|null }>}
   */
  async resolveStyleBinding(input = {}) {
    const {
      mode = 'create',
      stylePrompt,
      stylePresetId,
      stylePresetIdProvided = false,
      existing = null,
    } = input;

    if (stylePresetIdProvided) {
      if (stylePresetId === null || stylePresetId === undefined || stylePresetId === '') {
        let prompt = null;
        if (stylePrompt !== undefined && stylePrompt !== null) {
          prompt = String(stylePrompt).trim() || null;
        }
        if (mode === 'create' && !prompt) {
          prompt = await this.getDefaultStylePrompt();
        }
        return { stylePrompt: prompt, stylePresetId: null, preset: null };
      }

      const id = parseInt(stylePresetId, 10);
      if (Number.isNaN(id)) {
        this.ctx.throw(400, '无效的风格预设 ID');
      }
      const preset = await this.getEnabledById(id);
      if (!preset) {
        this.ctx.throw(400, '风格预设不存在或已禁用');
      }
      const prompt =
        stylePrompt !== undefined && stylePrompt !== null && String(stylePrompt).trim()
          ? String(stylePrompt).trim()
          : preset.style_prompt;
      return { stylePrompt: prompt, stylePresetId: preset.id, preset };
    }

    if (mode === 'create') {
      if (stylePrompt !== undefined && stylePrompt !== null && String(stylePrompt).trim()) {
        return {
          stylePrompt: String(stylePrompt).trim(),
          stylePresetId: null,
          preset: null,
        };
      }
      const defaultPreset = await this.getDefaultPreset();
      if (defaultPreset) {
        return {
          stylePrompt: defaultPreset.style_prompt,
          stylePresetId: defaultPreset.id,
          preset: defaultPreset,
        };
      }
      return {
        stylePrompt: await this.getDefaultStylePrompt(),
        stylePresetId: null,
        preset: null,
      };
    }

    // update：未传 stylePresetId
    if (stylePrompt !== undefined) {
      const newPrompt =
        stylePrompt !== null ? (String(stylePrompt).trim() || null) : null;

      let nextPresetId = undefined;
      if (existing?.style_preset_id) {
        const boundPreset = await this.getById(existing.style_preset_id);
        // 文案与绑定预设不一致（或预设已不存在）→ 解绑，避免生图仍用旧封面
        if (!boundPreset || newPrompt !== boundPreset.style_prompt) {
          nextPresetId = null;
        }
      }

      return {
        stylePrompt: newPrompt,
        stylePresetId: nextPresetId,
        preset: null,
      };
    }

    return { stylePrompt: undefined, stylePresetId: undefined, preset: null };
  }

  /**
   * 解析本地风格示例图路径（供生图 reference）
   * @param {number|null} stylePresetId
   * @returns {{ coverImage: string|null, localPath: string|null }}
   */
  resolveStyleCoverLocalPath(stylePresetId) {
    if (!stylePresetId) {
      return { coverImage: null, localPath: null };
    }
    const preset = this.db.prepare(
      'SELECT cover_image FROM style_presets WHERE id = ?'
    ).get(stylePresetId);
    if (!preset?.cover_image) {
      return { coverImage: null, localPath: null };
    }

    const styleImageDir = this.app.config.styleImageDir || 'public/images/styles';
    const filename = path.basename(preset.cover_image);
    const localPath = path.join(styleImageDir, filename);

    if (!fs.existsSync(localPath)) {
      return { coverImage: preset.cover_image, localPath: null };
    }
    return { coverImage: preset.cover_image, localPath };
  }

  async create(data) {
    const { code, name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    const stmt = this.db.prepare(
      `INSERT INTO style_presets (code, name, category, style_prompt, description, cover_image, sort_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      code,
      name,
      category,
      stylePrompt,
      description,
      coverImage,
      sortOrder || 0,
      isEnabled ? 1 : 0
    );
    return result.lastInsertRowid;
  }

  async update(id, data) {
    const { name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    const stmt = this.db.prepare(
      `UPDATE style_presets
       SET name=?, category=?, style_prompt=?, description=?, cover_image=?, sort_order=?, is_enabled=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    );
    stmt.run(
      name,
      category,
      stylePrompt,
      description,
      coverImage,
      sortOrder,
      isEnabled ? 1 : 0,
      id
    );
  }

  async updateCover(id, coverImage) {
    const stmt = this.db.prepare(
      `UPDATE style_presets SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    stmt.run(coverImage, id);
  }

  async toggle(id) {
    const stmt = this.db.prepare(
      'UPDATE style_presets SET is_enabled = 1 - is_enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(id);
  }

  async destroy(id) {
    const existing = await this.getById(id);
    if (!existing) {
      this.ctx.throw(404, '预设不存在');
    }
    if (this.isCoreCode(existing.code)) {
      this.ctx.throw(400, '核心风格预设不可删除');
    }

    this.db.prepare(
      'UPDATE comics SET style_preset_id = NULL WHERE style_preset_id = ?'
    ).run(id);

    this.db.prepare('DELETE FROM style_presets WHERE id = ?').run(id);
  }
}

module.exports = StylePresetService;
