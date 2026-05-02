// server/app/service/object-storage.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ObjectStorageService extends Service {
  static isTencentCosConfigured(config) {
    return Boolean(config.secretId && config.secretKey && config.bucket && config.region);
  }

  static buildObjectKey(params) {
    const { filePath, buffer, prefix } = params;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const ext = path.extname(filePath) || '.png';
    return `${prefix.replace(/^\/+|\/+$/g, '')}/${hash}${ext}`;
  }

  static buildPublicUrl(params) {
    const { key, publicBaseUrl, bucket, region } = params;
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
    }

    return `https://${bucket}.cos.${region}.myqcloud.com/${key.replace(/^\/+/, '')}`;
  }

  static uploadBufferToTencentCos(params) {
    const { buffer, filePath, config, cosClient } = params;
    const key = ObjectStorageService.buildObjectKey({
      filePath,
      buffer,
      prefix: config.keyPrefix || 'ai-print/reference',
    });

    return new Promise((resolve, reject) => {
      cosClient.putObject({
        Bucket: config.bucket,
        Region: config.region,
        Key: key,
        Body: buffer,
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve(ObjectStorageService.buildPublicUrl({
          key,
          publicBaseUrl: config.publicBaseUrl,
          bucket: config.bucket,
          region: config.region,
        }));
      });
    });
  }

  getTencentCosConfig() {
    return this.app.config.tencentCos || {};
  }

  createTencentCosClient(config) {
    let COS;
    try {
      COS = require('cos-nodejs-sdk-v5');
    } catch (_) {
      throw new Error('腾讯云 COS SDK 未安装，请在 server 目录执行 npm install cos-nodejs-sdk-v5');
    }

    return new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
  }

  async uploadReferenceImage(filePath) {
    const config = this.getTencentCosConfig();
    if (!ObjectStorageService.isTencentCosConfigured(config)) {
      this.ctx.throw(500, '腾讯云 COS 未配置，无法上传角色参考图');
    }

    const buffer = fs.readFileSync(filePath);
    const cosClient = this.createTencentCosClient(config);
    return await ObjectStorageService.uploadBufferToTencentCos({
      buffer,
      filePath,
      config,
      cosClient,
    });
  }
}

module.exports = ObjectStorageService;
