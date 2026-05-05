// server/app/service/storage/index.js
const Service = require('egg').Service;
const DirectProvider = require('./providers/direct');
const TencentCosProvider = require('./providers/tencent-cos');
const XyyCloudProvider = require('./providers/xyy-cloud');

const PROVIDERS = {
  direct: DirectProvider,
  'tencent-cos': TencentCosProvider,
  'xyy-cloud': XyyCloudProvider,
};

class StorageService extends Service {
  async getProviderConfig(providerName) {
    const config = this.ctx.service.db.getConfig('storage', providerName);
    return config || {};
  }

  async getDefaultProvider() {
    const defaultConfig = this.ctx.service.db.getConfig('storage', 'default');
    return defaultConfig?.provider || 'direct';
  }

  async getProvider(providerName) {
    const ProviderClass = PROVIDERS[providerName];
    if (!ProviderClass) {
      throw new Error(`未知的存储提供商: ${providerName}`);
    }

    const config = await this.getProviderConfig(providerName);
    return new ProviderClass(this.ctx, config);
  }

  async upload(buffer, filename) {
    const providerName = await this.getDefaultProvider();
    const provider = await this.getProvider(providerName);
    return provider.upload(buffer, filename);
  }
}

module.exports = StorageService;
