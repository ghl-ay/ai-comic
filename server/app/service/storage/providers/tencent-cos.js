const BaseProvider = require('./base');

class TencentCosProvider extends BaseProvider {
  constructor(ctx, config) {
    super(ctx, config);
    this.name = 'tencent-cos';
  }

  isConfigured() {
    return Boolean(
      this.config.secretId &&
      this.config.secretKey &&
      this.config.bucket &&
      this.config.region
    );
  }

  getCosClient() {
    let COS;
    try {
      COS = require('cos-nodejs-sdk-v5');
    } catch (_) {
      throw new Error('腾讯云 COS SDK 未安装，请在 server 目录执行 npm install cos-nodejs-sdk-v5');
    }
    return new COS({
      SecretId: this.config.secretId,
      SecretKey: this.config.secretKey,
    });
  }

  buildPublicUrl(key) {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
    }
    return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${key.replace(/^\/+/, '')}`;
  }

  async upload(buffer, originalName) {
    if (!this.isConfigured()) {
      throw new Error('腾讯云 COS 配置不完整');
    }

    const cosClient = this.getCosClient();
    const key = this.generateFilename(buffer, originalName, 'ai-print/images');

    return new Promise((resolve, reject) => {
      cosClient.putObject({
        Bucket: this.config.bucket,
        Region: this.config.region,
        Key: key,
        Body: buffer,
      }, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.buildPublicUrl(key));
      });
    });
  }
}

module.exports = TencentCosProvider;
