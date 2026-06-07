// server/app/service/stylePreset.js
const Service = require('egg').Service;

class StylePresetService extends Service {
  constructor(ctx) {
    super(ctx);
    this.db = ctx.app.db;
  }

  async getEnabledPresets() {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE is_enabled = 1 ORDER BY category, sort_order'
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
    const rows = stmt.all();
    return rows.map(row => row.category);
  }

  async getDefaultStylePrompt() {
    const stmt = this.db.prepare(
      'SELECT style_prompt FROM style_presets WHERE code = ? AND is_enabled = 1'
    );
    const preset = stmt.get('jp_monochrome');
    return preset ? preset.style_prompt : '日系黑白漫画风格';
  }

  async getAllPresets() {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets ORDER BY category, sort_order'
    );
    return stmt.all();
  }

  async getById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE id = ?'
    );
    return stmt.get(id);
  }

  async getByCode(code) {
    const stmt = this.db.prepare(
      'SELECT * FROM style_presets WHERE code = ?'
    );
    return stmt.get(code);
  }

  async create(data) {
    const { code, name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    const stmt = this.db.prepare(
      `INSERT INTO style_presets (code, name, category, style_prompt, description, cover_image, sort_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(code, name, category, stylePrompt, description, coverImage, sortOrder || 0, isEnabled ? 1 : 0);
    return result.lastInsertRowid;
  }

  async update(id, data) {
    const { name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    const stmt = this.db.prepare(
      `UPDATE style_presets 
       SET name=?, category=?, style_prompt=?, description=?, cover_image=?, sort_order=?, is_enabled=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    );
    stmt.run(name, category, stylePrompt, description, coverImage, sortOrder, isEnabled ? 1 : 0, id);
  }

  async toggle(id) {
    const stmt = this.db.prepare(
      'UPDATE style_presets SET is_enabled = 1 - is_enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(id);
  }

  async destroy(id) {
    const stmt = this.db.prepare('DELETE FROM style_presets WHERE id = ?');
    stmt.run(id);
  }
}

module.exports = StylePresetService;
