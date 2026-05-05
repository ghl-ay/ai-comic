# 咸鱼云存储集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为图片存储新增咸鱼云存储提供商，同时重构配置表为通用架构。

**Architecture:** 采用 Provider 模式重构存储服务，每个存储提供商实现统一接口。配置存储从 `ai_configs` 表迁移到通用的 `configs` 表，使用 `category` + `key` 结构。

**Tech Stack:** Egg.js, SQLite (better-sqlite3), Vue 3, Vuetify

---

## 文件结构

### 新增文件

```
server/
├── app/service/
│   └── storage/
│       ├── index.js                 # 存储服务入口
│       └── providers/
│           ├── base.js              # Provider 基类
│           ├── direct.js            # 本地直链模式
│           ├── tencent-cos.js       # 腾讯云 COS
│           └── xyy-cloud.js         # 咸鱼云存储
├── app/controller/
│   └── configs.js                   # 配置 API 控制器

web/
└── src/api/
    └── configs.js                   # 配置 API 客户端
```

### 修改文件

```
server/
├── database/init.sql                # 新增 configs 表
├── app/service/db.js                # 新增配置表操作方法
├── app/service/object-storage.js    # 重构为使用新存储服务
├── app/router.js                    # 新增配置 API 路由

web/
└── src/views/admin/Storage.vue      # 支持多提供商配置
```

### 删除文件

```
server/
├── app/service/storage-config.js    # 合并到 config.js
├── app/controller/storage-config.js # 替换为 configs.js
```

---

## Task 1: 创建 configs 表

**Files:**
- Modify: `server/database/init.sql`

- [ ] **Step 1: 在 init.sql 中添加 configs 表定义**

在 `ai_configs` 表定义之后添加：

```sql
-- 通用配置表
CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
);

-- 配置表索引
CREATE INDEX IF NOT EXISTS idx_configs_category_key ON configs(category, key);
```

- [ ] **Step 2: 验证表结构**

启动后端服务，检查表是否创建成功：

```bash
cd server && npm run dev &
sqlite3 database/comic.db ".schema configs"
```

Expected: 显示 configs 表结构

---

## Task 2: 实现存储 Provider 基类

**Files:**
- Create: `server/app/service/storage/providers/base.js`

- [ ] **Step 1: 创建 providers 目录和基类**

```javascript
// server/app/service/storage/providers/base.js
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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/storage/providers/base.js
git commit -m "feat: 添加存储 Provider 基类

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 实现 Direct Provider

**Files:**
- Create: `server/app/service/storage/providers/direct.js`

- [ ] **Step 1: 创建 Direct Provider**

```javascript
// server/app/service/storage/providers/direct.js
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
    const token = jwt.sign(
      { type: 'image_access', path: filename },
      this.ctx.app.config.jwt.secret,
      { expiresIn: '5m' }
    );
    const basename = path.basename(filename);
    const type = filename.split('/')[0] || 'images';
    return `/api/images/${type}/${basename}?token=${token}`;
  }
}

module.exports = DirectProvider;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/storage/providers/direct.js
git commit -m "feat: 添加 Direct 存储提供商

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 实现腾讯云 COS Provider

**Files:**
- Create: `server/app/service/storage/providers/tencent-cos.js`

- [ ] **Step 1: 创建腾讯云 COS Provider**

```javascript
// server/app/service/storage/providers/tencent-cos.js
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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/storage/providers/tencent-cos.js
git commit -m "feat: 添加腾讯云 COS 存储提供商

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 实现咸鱼云存储 Provider

**Files:**
- Create: `server/app/service/storage/providers/xyy-cloud.js`

- [ ] **Step 1: 创建咸鱼云存储 Provider**

```javascript
// server/app/service/storage/providers/xyy-cloud.js
const BaseProvider = require('./base');
const path = require('path');
const FormData = require('form-data');

const DEFAULT_API_BASE_URL = 'https://your-api-server.example.com';
const DEFAULT_PUBLIC_BASE_URL = 'https://your-image-server.example.com';

class XyyCloudProvider extends BaseProvider {
  constructor(ctx, config) {
    super(ctx, config);
    this.name = 'xyy-cloud';
    this.token = null;
    this.uid = null;
  }

  isConfigured() {
    return Boolean(this.config.username && this.config.password);
  }

  get apiBaseUrl() {
    return this.config.apiBaseUrl || DEFAULT_API_BASE_URL;
  }

  get publicBaseUrl() {
    return this.config.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  }

  async login() {
    const axios = this.ctx.app.axios || require('axios');

    // 获取 token
    const tokenRes = await axios.get(`${this.apiBaseUrl}/api/user/token`, {
      params: {
        user: this.config.username,
        passwd: this.config.password,
      },
    });

    if (tokenRes.data.code !== 200) {
      throw new Error(tokenRes.data.msg || '咸鱼云登录失败');
    }

    this.token = tokenRes.data.data;

    // 获取用户信息
    const userRes = await axios.get(`${this.apiBaseUrl}/api/user`, {
      headers: { Token: this.token },
    });

    if (userRes.data.code !== 200) {
      throw new Error(userRes.data.msg || '获取用户信息失败');
    }

    this.uid = userRes.data.data.id;
  }

  async upload(buffer, originalName) {
    if (!this.isConfigured()) {
      throw new Error('咸鱼云存储配置不完整');
    }

    // 确保已登录
    if (!this.token || !this.uid) {
      await this.login();
    }

    const axios = this.ctx.app.axios || require('axios');
    const filename = path.basename(this.generateFilename(buffer, originalName, 'images'));

    // 构建 multipart/form-data
    const form = new FormData();
    form.append('file', buffer, filename);

    const uploadUrl = `${this.apiBaseUrl}/api/diskFile/${this.uid}/file/images`;

    const resp = await axios.put(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        Token: this.token,
      },
    });

    if (resp.status === 404) {
      throw new Error(resp.data?.msg || '上传路径不存在');
    }
    if (resp.status !== 200) {
      throw new Error(resp.data?.msg || '上传失败');
    }

    return `${this.publicBaseUrl}/${filename}`;
  }
}

module.exports = XyyCloudProvider;
```

- [ ] **Step 2: 检查 form-data 依赖**

```bash
cd server && npm ls form-data || npm install form-data
```

- [ ] **Step 3: 提交**

```bash
git add server/app/service/storage/providers/xyy-cloud.js
git add server/package.json server/package-lock.json
git commit -m "feat: 添加咸鱼云存储提供商

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 实现存储服务入口

**Files:**
- Create: `server/app/service/storage/index.js`

- [ ] **Step 1: 创建存储服务入口**

```javascript
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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/storage/index.js
git commit -m "feat: 添加存储服务入口

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 更新 object-storage.js 使用新服务

**Files:**
- Modify: `server/app/service/object-storage.js`

- [ ] **Step 1: 重构 object-storage.js**

```javascript
// server/app/service/object-storage.js
const Service = require('egg').Service;
const fs = require('fs');

class ObjectStorageService extends Service {
  async uploadReferenceImage(filePath) {
    const buffer = fs.readFileSync(filePath);
    const filename = `characters/${filePath.split('/').pop()}`;
    return await this.ctx.service.storage.upload(buffer, filename);
  }
}

module.exports = ObjectStorageService;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/object-storage.js
git commit -m "refactor: 重构 object-storage 使用新存储服务

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 实现配置 API 控制器

**Files:**
- Create: `server/app/controller/configs.js`

- [ ] **Step 1: 创建配置控制器**

```javascript
// server/app/controller/configs.js
const Controller = require('egg').Controller;

class ConfigsController extends Controller {
  async show() {
    const { ctx } = this;
    const { category, key } = ctx.params;

    const config = ctx.service.db.getConfig(category, key);
    ctx.body = { config };
  }

  async update() {
    const { ctx } = this;
    const { category, key } = ctx.params;
    const value = ctx.request.body;

    // 验证 category
    if (!['storage', 'ai'].includes(category)) {
      ctx.status = 400;
      ctx.body = { error: '无效的配置类别' };
      return;
    }

    // 特殊验证：storage/default 必须有 provider 字段
    if (category === 'storage' && key === 'default') {
      if (!value.provider || !['direct', 'tencent-cos', 'xyy-cloud'].includes(value.provider)) {
        ctx.status = 400;
        ctx.body = { error: '无效的存储提供商' };
        return;
      }
    }

    ctx.service.db.setConfig(category, key, value);
    ctx.body = { success: true };
  }
}

module.exports = ConfigsController;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/controller/configs.js
git commit -m "feat: 添加配置 API 控制器

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 更新路由

**Files:**
- Modify: `server/app/router.js`

- [ ] **Step 1: 添加配置 API 路由，删除旧路由**

在现有存储配置路由后添加新路由，并删除旧路由：

```javascript
// server/app/router.js
module.exports = app => {
  const { router, controller } = app;

  // 认证相关（无需登录）
  router.post('/api/auth/register', controller.auth.register);
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', controller.auth.logout);

  // 需要登录的接口
  router.get('/api/auth/me', app.middleware.jwt(), controller.auth.me);

  // 角色相关（需要登录）
  router.get('/api/characters', app.middleware.jwt(), controller.character.index);
  router.post('/api/characters', app.middleware.jwt(), controller.character.create);
  router.get('/api/characters/:id', app.middleware.jwt(), controller.character.show);
  router.put('/api/characters/:id', app.middleware.jwt(), controller.character.update);
  router.delete('/api/characters/:id', app.middleware.jwt(), controller.character.destroy);
  router.post('/api/characters/:id/generate-reference', app.middleware.jwt(), controller.character.generateReference);

  // 漫画相关（需要登录）
  router.get('/api/comics', app.middleware.jwt(), controller.comic.index);
  router.post('/api/comics', app.middleware.jwt(), controller.comic.create);
  router.get('/api/comics/:id', app.middleware.jwt(), controller.comic.show);
  router.put('/api/comics/:id', app.middleware.jwt(), controller.comic.update);
  router.delete('/api/comics/:id', app.middleware.jwt(), controller.comic.destroy);

  // 章节相关（需要登录）
  router.post('/api/comics/:id/chapters', app.middleware.jwt(), controller.chapter.create);
  router.get('/api/chapters/:id', app.middleware.jwt(), controller.chapter.show);
  router.put('/api/chapters/:id', app.middleware.jwt(), controller.chapter.update);
  router.delete('/api/chapters/:id', app.middleware.jwt(), controller.chapter.destroy);
  router.post('/api/chapters/:id/generate-script', app.middleware.jwt(), controller.chapter.generateScript);
  router.post('/api/chapters/:id/generate-image', app.middleware.jwt(), controller.chapter.generateImage);

  // AI 配置相关（读取需要登录，修改需要管理员权限）
  router.get('/api/ai-config', app.middleware.jwt(), controller.aiConfig.index);
  router.put('/api/ai-config/text', app.middleware.jwt(), app.middleware.admin(), controller.aiConfig.updateText);
  router.put('/api/ai-config/image', app.middleware.jwt(), app.middleware.admin(), controller.aiConfig.updateImage);

  // 通用配置 API（需要管理员权限）
  router.get('/api/configs/:category/:key', app.middleware.jwt(), app.middleware.admin(), controller.configs.show);
  router.put('/api/configs/:category/:key', app.middleware.jwt(), app.middleware.admin(), controller.configs.update);

  // 管理员接口（需要管理员权限）
  router.get('/api/admin/users', app.middleware.jwt(), app.middleware.admin(), controller.admin.getUsers);
  router.put('/api/admin/users/:id/admin', app.middleware.jwt(), app.middleware.admin(), controller.admin.setUserAdmin);

  // 图片访问（通过 token 认证，无需登录）
  router.get('/api/images/:type/:filename', controller.images.show);

  // 图片访问（通过 Cookie 认证，需要登录）
  router.get('/images/:type/:filename', app.middleware.jwt(), controller.images.showAuth);
};
```

- [ ] **Step 2: 删除旧的 storage-config 相关文件**

```bash
rm server/app/service/storage-config.js
rm server/app/controller/storage-config.js
```

- [ ] **Step 3: 提交**

```bash
git add server/app/router.js
git add -u server/app/service/storage-config.js server/app/controller/storage-config.js
git commit -m "refactor: 使用通用配置 API 替换旧的存储配置 API

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 实现数据迁移

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 在 db.js 中添加迁移方法**

在 `DbService` 类中添加以下方法：

```javascript
  // 配置表相关方法
  getConfig(category, key) {
    const stmt = this.db.prepare(
      'SELECT value FROM configs WHERE category = ? AND key = ?'
    );
    const row = stmt.get(category, key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch (e) {
      this.ctx.logger.warn(`解析配置失败 [${category}/${key}]:`, e);
      return null;
    }
  }

  setConfig(category, key, value) {
    const jsonValue = JSON.stringify(value);
    const stmt = this.db.prepare(`
      INSERT INTO configs (category, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(category, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(category, key, jsonValue);
  }

  // 数据迁移：从 ai_configs 迁移到 configs
  migrateToConfigs() {
    // 检查是否已迁移
    const existing = this.getConfig('storage', 'default');
    if (existing) {
      this.ctx.logger.info('配置已迁移，跳过');
      return;
    }

    // 迁移存储配置
    const storageConfig = this.findStorageConfig();
    if (storageConfig) {
      // 迁移腾讯云 COS 配置
      if (storageConfig.ossSecretId) {
        this.setConfig('storage', 'tencent-cos', {
          secretId: storageConfig.ossSecretId,
          secretKey: storageConfig.ossSecretKey,
          bucket: storageConfig.ossBucket,
          region: storageConfig.ossRegion,
          publicBaseUrl: storageConfig.ossPublicBaseUrl || '',
        });
      }

      // 设置默认提供商
      this.setConfig('storage', 'default', {
        provider: storageConfig.accessMode === 'oss' ? 'tencent-cos' : 'direct',
      });
    }

    // 迁移 AI 配置
    const textConfig = this.findGlobalAiConfigByType('text');
    if (textConfig) {
      this.setConfig('ai', textConfig.provider || 'openai', {
        apiKey: textConfig.apiKey,
        baseUrl: textConfig.baseUrl,
        model: textConfig.model,
        apiFormat: textConfig.apiFormat,
      });
    }

    const imageConfig = this.findGlobalAiConfigByType('image');
    if (imageConfig) {
      this.setConfig('ai', imageConfig.provider || 'openai', {
        apiKey: imageConfig.apiKey,
        baseUrl: imageConfig.baseUrl,
        model: imageConfig.model,
        apiFormat: imageConfig.apiFormat,
      });
    }

    // 设置 AI 默认提供商
    if (textConfig || imageConfig) {
      this.setConfig('ai', 'default', {
        textProvider: textConfig?.provider || 'openai',
        imageProvider: imageConfig?.provider || 'openai',
      });
    }

    this.ctx.logger.info('配置迁移完成');
  }
```

- [ ] **Step 2: 在应用启动时执行迁移**

修改 `server/app.js`（如果不存在则创建）：

```javascript
// server/app.js
module.exports = app => {
  app.beforeStart(async () => {
    // 执行配置迁移
    const ctx = app.createAnonymousContext();
    await ctx.service.db.migrateToConfigs();
  });
};
```

- [ ] **Step 3: 提交**

```bash
git add server/app/service/db.js server/app.js
git commit -m "feat: 添加配置迁移逻辑

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 创建前端配置 API

**Files:**
- Create: `web/src/api/configs.js`

- [ ] **Step 1: 创建配置 API 客户端**

```javascript
// web/src/api/configs.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async get(category, key) {
    const res = await api.get(`/configs/${category}/${key}`)
    return res.data
  },

  async set(category, key, value) {
    const res = await api.put(`/configs/${category}/${key}`, value)
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add web/src/api/configs.js
git commit -m "feat: 添加前端配置 API 客户端

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: 更新前端存储配置页面

**Files:**
- Modify: `web/src/views/admin/Storage.vue`
- Delete: `web/src/api/storage-config.js`

- [ ] **Step 1: 重写存储配置页面**

```vue
<!-- web/src/views/admin/Storage.vue -->
<template>
  <v-row>
    <v-col cols="12" md="8">
      <v-card>
        <v-card-title>图片存储配置</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveConfig">
            <v-select
              v-model="defaultProvider"
              :items="providerOptions"
              label="存储提供商"
              hint="选择默认的图片存储方式"
              persistent-hint
              @update:modelValue="onProviderChange"
            />

            <v-divider class="my-4" />

            <!-- 腾讯云 COS 配置 -->
            <template v-if="defaultProvider === 'tencent-cos'">
              <div class="text-subtitle-1 mb-2">腾讯云 COS 配置</div>
              <v-text-field
                v-model="tencentCos.secretId"
                label="Secret ID"
                type="password"
              />
              <v-text-field
                v-model="tencentCos.secretKey"
                label="Secret Key"
                type="password"
              />
              <v-text-field
                v-model="tencentCos.bucket"
                label="Bucket 名称"
              />
              <v-text-field
                v-model="tencentCos.region"
                label="Region"
                hint="如 ap-guangzhou"
              />
              <v-text-field
                v-model="tencentCos.publicBaseUrl"
                label="公开访问地址（可选）"
              />
            </template>

            <!-- 咸鱼云配置 -->
            <template v-if="defaultProvider === 'xyy-cloud'">
              <div class="text-subtitle-1 mb-2">咸鱼云存储配置</div>
              <v-text-field
                v-model="xyyCloud.username"
                label="用户名"
              />
              <v-text-field
                v-model="xyyCloud.password"
                label="密码"
                type="password"
              />
              <v-text-field
                v-model="xyyCloud.apiBaseUrl"
                label="API 地址"
                hint="默认: https://your-api-server.example.com"
              />
              <v-text-field
                v-model="xyyCloud.publicBaseUrl"
                label="访问域名"
                hint="默认: https://your-image-server.example.com"
              />
            </template>

            <!-- Direct 模式提示 -->
            <template v-if="defaultProvider === 'direct'">
              <v-alert type="info" variant="tonal">
                本地存储模式：图片保存在服务器本地，通过带 token 的 URL 访问。
              </v-alert>
            </template>

            <v-btn
              color="primary"
              type="submit"
              :loading="saving"
              class="mt-4"
            >
              保存配置
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import configsApi from '../../api/configs'

const saving = ref(false)
const defaultProvider = ref('direct')

const providerOptions = [
  { title: '本地存储', value: 'direct' },
  { title: '腾讯云 COS', value: 'tencent-cos' },
  { title: '咸鱼云存储', value: 'xyy-cloud' },
]

const tencentCos = ref({
  secretId: '',
  secretKey: '',
  bucket: '',
  region: '',
  publicBaseUrl: '',
})

const xyyCloud = ref({
  username: '',
  password: '',
  apiBaseUrl: 'https://your-api-server.example.com',
  publicBaseUrl: 'https://your-image-server.example.com',
})

async function loadConfig() {
  try {
    // 加载默认提供商
    const defaultRes = await configsApi.get('storage', 'default')
    if (defaultRes.config) {
      defaultProvider.value = defaultRes.config.provider || 'direct'
    }

    // 加载对应提供商的配置
    await loadProviderConfig(defaultProvider.value)
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function loadProviderConfig(provider) {
  if (provider === 'tencent-cos') {
    const res = await configsApi.get('storage', 'tencent-cos')
    if (res.config) {
      tencentCos.value = { ...tencentCos.value, ...res.config }
    }
  } else if (provider === 'xyy-cloud') {
    const res = await configsApi.get('storage', 'xyy-cloud')
    if (res.config) {
      xyyCloud.value = { ...xyyCloud.value, ...res.config }
    }
  }
}

async function onProviderChange(newProvider) {
  await loadProviderConfig(newProvider)
}

async function saveConfig() {
  saving.value = true
  try {
    // 保存默认提供商
    await configsApi.set('storage', 'default', { provider: defaultProvider.value })

    // 保存提供商配置
    if (defaultProvider.value === 'tencent-cos') {
      await configsApi.set('storage', 'tencent-cos', tencentCos.value)
    } else if (defaultProvider.value === 'xyy-cloud') {
      await configsApi.set('storage', 'xyy-cloud', xyyCloud.value)
    }

    alert('存储配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
```

- [ ] **Step 2: 删除旧的 storage-config API 文件**

```bash
rm web/src/api/storage-config.js
```

- [ ] **Step 3: 提交**

```bash
git add web/src/views/admin/Storage.vue web/src/api/configs.js
git add -u web/src/api/storage-config.js
git commit -m "feat: 重构前端存储配置页面支持多提供商

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: 测试验证

- [ ] **Step 1: 启动后端服务**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 测试配置 API**

```bash
# 获取默认存储配置
curl -X GET http://localhost:7001/api/configs/storage/default \
  -H "Cookie: jwt=<your-jwt-token>"

# 设置咸鱼云配置
curl -X PUT http://localhost:7001/api/configs/storage/xyy-cloud \
  -H "Cookie: jwt=<your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 切换默认提供商
curl -X PUT http://localhost:7001/api/configs/storage/default \
  -H "Cookie: jwt=<your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"xyy-cloud"}'
```

- [ ] **Step 3: 启动前端服务**

```bash
cd web && npm run dev
```

- [ ] **Step 4: 手动测试前端**

1. 访问 `/admin/storage`
2. 切换存储提供商
3. 填写配置并保存
4. 验证配置是否正确保存

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "test: 验证咸鱼云存储集成

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
