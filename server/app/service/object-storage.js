// server/app/service/object-storage.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class ObjectStorageService extends Service {
  static isOssConfigured(config) {
    return Boolean(
      config.ossSecretId &&
      config.ossSecretKey &&
      config.ossBucket &&
      config.ossRegion
    );
  }

  static buildObjectKey(params) {
    const { filePath, buffer, prefix } = params;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const ext = path.extname(filePath) || '.png';
    return `${prefix.replace(/^\/+|\/+$/g, '')}/${hash}${ext}`;
  }

  static buildPublicUrl(params) {
    const { key, ossPublicBaseUrl, ossBucket, ossRegion } = params;
    if (ossPublicBaseUrl) {
      return `${ossPublicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
    }

    return `https://${ossBucket}.cos.${ossRegion}.myqcloud.com/${key.replace(/^\/+/, '')}`;
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
        Bucket: config.ossBucket,
        Region: config.ossRegion,
        Key: key,
        Body: buffer,
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve(ObjectStorageService.buildPublicUrl({
          key,
          ossPublicBaseUrl: config.ossPublicBaseUrl,
          ossBucket: config.ossBucket,
          ossRegion: config.ossRegion,
        }));
      });
    });
  }

  async getStorageConfig() {
    return await this.ctx.service.storageConfig.getStorageConfig();
  }

  createTencentCosClient(config) {
    let COS;
    try {
      COS = require('cos-nodejs-sdk-v5');
    } catch (_) {
      throw new Error('腾讯云 COS SDK 未安装，请在 server 目录执行 npm install cos-nodejs-sdk-v5');
    }

    return new COS({
      SecretId: config.ossSecretId,
      SecretKey: config.ossSecretKey,
    });
  }

  generateDirectAccessUrl(filePath, type = 'characters') {
    const filename = path.basename(filePath);
    const token = jwt.sign(
      { type: 'image_access', path: `${type}/${filename}` },
      this.app.config.jwt.secret,
      { expiresIn: '5m' }
    );
    return `/api/images/${type}/${filename}?token=${token}`;
  }

  async uploadReferenceImage(filePath) {
    const config = await this.getStorageConfig();

    // 如果是直链模式，返回直接访问 URL
    if (config.accessMode === 'direct') {
      return this.generateDirectAccessUrl(filePath, 'characters');
    }

    // OSS 模式：上传到腾讯云 COS
    if (!ObjectStorageService.isOssConfigured(config)) {
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
