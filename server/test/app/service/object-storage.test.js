'use strict';

const assert = require('assert');
const ObjectStorageService = require('../../../app/service/object-storage');

describe('test/app/service/object-storage.test.js', () => {
  describe('Tencent COS helpers', () => {
    it('detects whether Tencent COS is configured', () => {
      assert.strictEqual(ObjectStorageService.isTencentCosConfigured({
        secretId: 'sid',
        secretKey: 'skey',
        bucket: 'bucket-123',
        region: 'ap-guangzhou',
      }), true);

      assert.strictEqual(ObjectStorageService.isTencentCosConfigured({
        secretId: 'sid',
        secretKey: '',
        bucket: 'bucket-123',
        region: 'ap-guangzhou',
      }), false);
    });

    it('builds stable object keys using file content hash', () => {
      const key = ObjectStorageService.buildObjectKey({
        filePath: '/tmp/character.png',
        buffer: Buffer.from('same image'),
        prefix: 'ai-print/reference',
      });

      assert.match(key, /^ai-print\/reference\/[a-f0-9]{16}\.png$/);
    });

    it('builds public COS URLs from custom public base URL', () => {
      assert.strictEqual(
        ObjectStorageService.buildPublicUrl({
          key: 'ai-print/reference/a.png',
          publicBaseUrl: 'https://cdn.example.com/',
          bucket: 'bucket-123',
          region: 'ap-guangzhou',
        }),
        'https://cdn.example.com/ai-print/reference/a.png'
      );
    });

    it('builds public COS URLs from bucket and region when no custom domain exists', () => {
      assert.strictEqual(
        ObjectStorageService.buildPublicUrl({
          key: 'ai-print/reference/a.png',
          publicBaseUrl: '',
          bucket: 'bucket-123',
          region: 'ap-guangzhou',
        }),
        'https://bucket-123.cos.ap-guangzhou.myqcloud.com/ai-print/reference/a.png'
      );
    });

    it('uploads a local file and returns the public URL', async () => {
      const calls = [];
      const url = await ObjectStorageService.uploadBufferToTencentCos({
        buffer: Buffer.from('image'),
        filePath: '/tmp/character.png',
        config: {
          secretId: 'sid',
          secretKey: 'skey',
          bucket: 'bucket-123',
          region: 'ap-guangzhou',
          publicBaseUrl: 'https://cdn.example.com',
          keyPrefix: 'refs',
        },
        cosClient: {
          putObject(params, callback) {
            calls.push(params);
            callback(null, { statusCode: 200 });
          },
        },
      });

      assert.strictEqual(url.startsWith('https://cdn.example.com/refs/'), true);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].Bucket, 'bucket-123');
      assert.strictEqual(calls[0].Region, 'ap-guangzhou');
      assert.strictEqual(calls[0].Body.toString(), 'image');
    });
  });
});
