const crypto = require('crypto');
const path = require('path');

class BaseProvider {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.name = 'base';
  }

  /**
   * 生成唯一文件名
   * @param {Buffer} buffer - 文件内容
   * @param {string} originalName - 原始文件名
   * @param {string} prefix - 路径前缀
   * @returns {string} 唯一文件名（含路径）
   */
  generateFilename(buffer, originalName, prefix = 'images') {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const timestamp = Date.now();
    const ext = path.extname(originalName) || '.png';
    return `${prefix}/${hash}-${timestamp}${ext}`;
  }

  /**
   * 上传文件
   * @param {Buffer} buffer - 文件内容
   * @param {string} filename - 文件名
   * @returns {Promise<string>} 公开访问 URL
   */
  async upload(buffer, filename) {
    throw new Error('upload() must be implemented by subclass');
  }

  /**
   * 检查配置是否有效
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }
}

module.exports = BaseProvider;
