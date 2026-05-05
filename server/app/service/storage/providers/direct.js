const BaseProvider = require('./base');
const jwt = require('jsonwebtoken');
const path = require('path');

class DirectProvider extends BaseProvider {
  constructor(ctx, config) {
    super(ctx, config);
    this.name = 'direct';
  }

  isConfigured() {
    return true; // Direct 模式无需配置
  }

  async upload(buffer, filename) {
    // Direct 模式不实际上传，生成带 token 的访问 URL
    const basename = path.basename(filename);
    const type = filename.includes('/') ? filename.split('/')[0] : 'images';
    const tokenPath = `${type}/${basename}`;

    const token = jwt.sign(
      { type: 'image_access', path: tokenPath },
      this.ctx.app.config.jwt.secret,
      { expiresIn: '5m' }
    );
    return `/api/images/${type}/${basename}?token=${token}`;
  }
}

module.exports = DirectProvider;
