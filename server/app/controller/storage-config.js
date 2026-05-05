// server/app/controller/storage-config.js
const Controller = require('egg').Controller;

class StorageConfigController extends Controller {
  async index() {
    const { ctx } = this;
    const config = await ctx.service.storageConfig.getStorageConfig();
    ctx.body = { config };
  }

  async update() {
    const { ctx } = this;
    const { accessMode, ossSecretId, ossSecretKey, ossBucket, ossRegion, ossPublicBaseUrl } = ctx.request.body;

    if (!['oss', 'direct'].includes(accessMode)) {
      ctx.status = 400;
      ctx.body = { error: '访问模式必须是 oss 或 direct' };
      return;
    }

    if (accessMode === 'oss') {
      if (!ossSecretId || !ossSecretKey || !ossBucket || !ossRegion) {
        ctx.status = 400;
        ctx.body = { error: 'OSS 模式需要填写完整的 COS 配置' };
        return;
      }
    }

    try {
      const config = await ctx.service.storageConfig.updateStorageConfig({
        accessMode,
        ossSecretId,
        ossSecretKey,
        ossBucket,
        ossRegion,
        ossPublicBaseUrl,
      });
      ctx.body = { config };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = StorageConfigController;
