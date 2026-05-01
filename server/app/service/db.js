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
}

module.exports = DbService;
