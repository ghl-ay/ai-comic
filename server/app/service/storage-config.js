// server/app/service/storage-config.js
const Service = require('egg').Service;

class StorageConfigService extends Service {
  async getStorageConfig() {
    let config = await this.ctx.service.db.findStorageConfig();

    // 如果数据库没有配置，从配置文件迁移
    if (!config) {
      config = await this.migrateFromConfigFile();
    }

    return config;
  }

  async migrateFromConfigFile() {
    const cosConfig = this.app.config.tencentCos || {};

    const config = {
      accessMode: this.determineAccessMode(cosConfig),
      ossSecretId: cosConfig.secretId || '',
      ossSecretKey: cosConfig.secretKey || '',
      ossBucket: cosConfig.bucket || '',
      ossRegion: cosConfig.region || '',
      ossPublicBaseUrl: cosConfig.publicBaseUrl || '',
    };

    // 写入数据库
    await this.ctx.service.db.upsertStorageConfig(config);

    return config;
  }

  determineAccessMode(cosConfig) {
    // 如果 COS 配置完整，使用 OSS 模式
    const hasFullConfig = Boolean(
      cosConfig.secretId &&
      cosConfig.secretKey &&
      cosConfig.bucket &&
      cosConfig.region
    );
    return hasFullConfig ? 'oss' : 'direct';
  }

  async updateStorageConfig(data) {
    await this.ctx.service.db.upsertStorageConfig(data);
    return await this.getStorageConfig();
  }
}

module.exports = StorageConfigService;
