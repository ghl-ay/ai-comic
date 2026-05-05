// server/app/controller/images.js
const Controller = require('egg').Controller;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

class ImagesController extends Controller {
  async show() {
    const { ctx } = this;
    const { type, filename } = ctx.params;
    const { token } = ctx.query;

    // 验证 token
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: '缺少访问 token' };
      return;
    }

    try {
      const decoded = jwt.verify(token, ctx.app.config.jwt.secret);

      if (decoded.type !== 'image_access') {
        ctx.status = 401;
        ctx.body = { error: '无效的 token 类型' };
        return;
      }

      // 验证路径匹配
      const expectedPath = `${type}/${filename}`;
      if (decoded.path !== expectedPath) {
        ctx.status = 403;
        ctx.body = { error: 'token 与请求路径不匹配' };
        return;
      }
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'token 无效或已过期' };
      return;
    }

    // 验证 type 参数
    if (!['characters', 'comics'].includes(type)) {
      ctx.status = 400;
      ctx.body = { error: '无效的图片类型' };
      return;
    }

    // 构建文件路径
    const baseDir = type === 'characters'
      ? (ctx.app.config.characterImageDir || 'public/images/characters')
      : (ctx.app.config.comicImageDir || 'public/images/comics');

    const filePath = path.join(baseDir, filename);

    // 安全检查：防止路径穿越
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      ctx.status = 403;
      ctx.body = { error: '禁止访问' };
      return;
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      ctx.status = 404;
      ctx.body = { error: '图片不存在' };
      return;
    }

    // 返回图片
    ctx.set('Content-Type', 'image/png');
    ctx.body = fs.createReadStream(filePath);
  }
}

module.exports = ImagesController;
