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

  findUserByUsername(username) {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE username = ?'
    );
    return stmt.get(username);
  }

  findUserById(id) {
    const stmt = this.db.prepare(
      'SELECT id, username, created_at FROM users WHERE id = ?'
    );
    return stmt.get(id);
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
}

module.exports = DbService;
