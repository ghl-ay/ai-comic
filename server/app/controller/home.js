// server/app/controller/home.js
const Controller = require('egg').Controller;
const fs = require('fs');
const path = require('path');

class HomeController extends Controller {
  async fallback() {
    const { ctx } = this;
    // API / 鉴权图片路径不应回退到 SPA（兼容无尾斜杠）
    if (
      ctx.path === '/api' ||
      ctx.path.startsWith('/api/') ||
      ctx.path === '/images' ||
      ctx.path.startsWith('/images/')
    ) {
      ctx.status = 404;
      return;
    }

    const indexPath = path.join(ctx.app.baseDir, 'app/public/index.html');
    if (!fs.existsSync(indexPath)) {
      ctx.status = 404;
      ctx.body = 'Frontend not built';
      return;
    }

    ctx.type = 'html';
    ctx.body = fs.readFileSync(indexPath);
  }
}

module.exports = HomeController;
