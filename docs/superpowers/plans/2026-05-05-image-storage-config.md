# 图片存储配置实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Grsai Provider 提供 OSS 和直链两种图片访问模式配置

**Architecture:** 复用 ai_configs 表存储配置，JWT 生成短期访问 token，通过认证接口访问本地图片

**Tech Stack:** Egg.js, SQLite, JWT, Vue 3, Vuetify

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/app/service/db.js` | 修改 | 新增 image_storage 配置存取方法 |
| `server/app/service/storage-config.js` | 新增 | 存储配置服务，含配置迁移逻辑 |
| `server/app/controller/storage-config.js` | 新增 | 存储配置 API 控制器 |
| `server/app/controller/images.js` | 新增 | 认证图片访问控制器 |
| `server/app/service/object-storage.js` | 修改 | 从数据库读取配置，新增直链 URL 生成 |
| `server/app/service/ai-image.js` | 修改 | 根据配置选择上传方式 |
| `server/app/router.js` | 修改 | 新增路由 |
| `web/src/api/storage-config.js` | 新增 | 前端 API 调用 |
| `web/src/views/admin/Storage.vue` | 新增 | 图片存储配置页面 |
| `web/src/views/Admin.vue` | 修改 | 添加图片存储 Tab |
| `web/src/router/index.js` | 修改 | 添加子路由 |
| `server/config/config.default.js` | 修改 | 移除静态文件公开访问 |

---

### Task 1: 数据库 Service - 新增存储配置方法

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 新增 findStorageConfig 方法**

在 `db.js` 的 `DbService` 类中，`upsertAiConfig` 方法之后添加：

```javascript
  // 图片存储配置相关
  findStorageConfig() {
    const stmt = this.db.prepare(
      'SELECT * FROM ai_configs WHERE user_id IS NULL AND type = ?'
    );
    const config = stmt.get('image_storage');
    if (!config) return null;
    
    try {
      const data = JSON.parse(config.api_key);
      return {
        id: config.id,
        accessMode: data.accessMode || 'direct',
        ossSecretId: data.ossSecretId || '',
        ossSecretKey: data.ossSecretKey || '',
        ossBucket: data.ossBucket || '',
        ossRegion: data.ossRegion || '',
        ossPublicBaseUrl: data.ossPublicBaseUrl || '',
      };
    } catch {
      return null;
    }
  }

  upsertStorageConfig(data) {
    const jsonData = JSON.stringify({
      accessMode: data.accessMode || 'direct',
      ossSecretId: data.ossSecretId || '',
      ossSecretKey: data.ossSecretKey || '',
      ossBucket: data.ossBucket || '',
      ossRegion: data.ossRegion || '',
      ossPublicBaseUrl: data.ossPublicBaseUrl || '',
    });

    const existing = this.findStorageConfig();
    if (existing) {
      const stmt = this.db.prepare(
        'UPDATE ai_configs SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run(jsonData, existing.id);
      return existing.id;
    } else {
      const stmt = this.db.prepare(
        'INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model, api_format) VALUES (NULL, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run('image_storage', '', jsonData, '', '', '');
      return result.lastInsertRowid;
    }
  }
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/db.js
git commit -m "feat(db): 添加图片存储配置存取方法"
```

---

### Task 2: 存储配置 Service - 配置迁移和服务方法

**Files:**
- Create: `server/app/service/storage-config.js`

- [ ] **Step 1: 创建 storage-config.js**

```javascript
// server/app/service/storage-config.js
const Service = require('egg').Service;

class StorageConfigService extends Service {
  async getStorageConfig() {
    let config = this.ctx.service.db.findStorageConfig();
    
    // 如果数据库没有配置，从配置文件迁移
    if (!config) {
      config = this.migrateFromConfigFile();
    }
    
    return config;
  }

  migrateFromConfigFile() {
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
    this.ctx.service.db.upsertStorageConfig(config);
    
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
    this.ctx.service.db.upsertStorageConfig(data);
    return await this.getStorageConfig();
  }
}

module.exports = StorageConfigService;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/storage-config.js
git commit -m "feat(service): 添加存储配置服务，支持配置文件迁移"
```

---

### Task 3: 存储配置 Controller 和路由

**Files:**
- Create: `server/app/controller/storage-config.js`
- Modify: `server/app/router.js`

- [ ] **Step 1: 创建 storage-config controller**

```javascript
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
```

- [ ] **Step 2: 添加路由**

在 `server/app/router.js` 的管理员接口部分添加：

```javascript
  // 存储配置相关（需要管理员权限）
  router.get('/api/storage-config', app.middleware.jwt(), app.middleware.admin(), controller.storageConfig.index);
  router.put('/api/storage-config', app.middleware.jwt(), app.middleware.admin(), controller.storageConfig.update);
```

- [ ] **Step 3: 提交**

```bash
git add server/app/controller/storage-config.js server/app/router.js
git commit -m "feat(api): 添加存储配置 API 接口"
```

---

### Task 4: 认证图片访问 Controller

**Files:**
- Create: `server/app/controller/images.js`
- Modify: `server/app/router.js`

- [ ] **Step 1: 创建 images controller**

```javascript
// server/app/controller/images.js
const Controller = require('egg').Controller;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

class ImagesController extends Controller {
  async show() {
    const { ctx } = this;
    const { type, filename } = ctx.params;
    const { token } = ctx.query;

    // 验证 token
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: '缺少访问 token' };
      return;
    }

    try {
      const decoded = jwt.verify(token, ctx.app.config.jwt.secret);
      
      if (decoded.type !== 'image_access') {
        ctx.status = 401;
        ctx.body = { error: '无效的 token 类型' };
        return;
      }

      // 验证路径匹配
      const expectedPath = `${type}/${filename}`;
      if (decoded.path !== expectedPath) {
        ctx.status = 403;
        ctx.body = { error: 'token 与请求路径不匹配' };
        return;
      }
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'token 无效或已过期' };
      return;
    }

    // 验证 type 参数
    if (!['characters', 'comics'].includes(type)) {
      ctx.status = 400;
      ctx.body = { error: '无效的图片类型' };
      return;
    }

    // 构建文件路径
    const baseDir = type === 'characters' 
      ? (ctx.app.config.characterImageDir || 'public/images/characters')
      : (ctx.app.config.comicImageDir || 'public/images/comics');
    
    const filePath = path.join(baseDir, filename);

    // 安全检查：防止路径穿越
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      ctx.status = 403;
      ctx.body = { error: '禁止访问' };
      return;
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      ctx.status = 404;
      ctx.body = { error: '图片不存在' };
      return;
    }

    // 返回图片
    ctx.set('Content-Type', 'image/png');
    ctx.body = fs.createReadStream(filePath);
  }
}

module.exports = ImagesController;
```

- [ ] **Step 2: 添加路由**

在 `server/app/router.js` 添加（无需登录，通过 token 验证）：

```javascript
  // 图片访问（通过 token 认证）
  router.get('/api/images/:type/:filename', controller.images.show);
```

- [ ] **Step 3: 提交**

```bash
git add server/app/controller/images.js server/app/router.js
git commit -m "feat(api): 添加认证图片访问接口"
```

---

### Task 5: 修改 Object-Storage Service

**Files:**
- Modify: `server/app/service/object-storage.js`

- [ ] **Step 1: 重写 object-storage.js**

```javascript
// server/app/service/object-storage.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class ObjectStorageService extends Service {
  static isTencentCosConfigured(config) {
    return Boolean(config.ossSecretId && config.ossSecretKey && config.ossBucket && config.ossRegion);
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
          publicBaseUrl: config.ossPublicBaseUrl,
          bucket: config.ossBucket,
          region: config.ossRegion,
        }));
      });
    });
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
    const config = await this.ctx.service.storageConfig.getStorageConfig();

    if (config.accessMode === 'direct') {
      return this.generateDirectAccessUrl(filePath, 'characters');
    }

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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/object-storage.js
git commit -m "refactor(object-storage): 从数据库读取配置，支持直链模式"
```

---

### Task 6: 前端 API - storage-config.js

**Files:**
- Create: `web/src/api/storage-config.js`

- [ ] **Step 1: 创建 storage-config.js**

```javascript
// web/src/api/storage-config.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getConfig() {
    const res = await api.get('/storage-config')
    return res.data
  },

  async saveConfig(data) {
    const res = await api.put('/storage-config', data)
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add web/src/api/storage-config.js
git commit -m "feat(frontend): 添加存储配置 API"
```

---

### Task 7: 前端页面 - AdminStorage.vue

**Files:**
- Create: `web/src/views/admin/Storage.vue`

- [ ] **Step 1: 创建 Storage.vue**

```vue
<!-- web/src/views/admin/Storage.vue -->
<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>图片存储配置</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveConfig">
            <v-radio-group v-model="form.accessMode" label="图片访问模式">
              <v-radio
                label="直链访问（本地存储 + 认证访问）"
                value="direct"
              />
              <v-radio
                label="OSS 上传（需要配置腾讯云 COS）"
                value="oss"
              />
            </v-radio-group>

            <template v-if="form.accessMode === 'oss'">
              <v-divider class="my-4" />
              <div class="text-subtitle-1 mb-2">OSS 配置</div>
              
              <v-text-field
                v-model="form.ossSecretId"
                label="Secret ID"
                type="password"
                hint="腾讯云 API 密钥 ID"
              />
              <v-text-field
                v-model="form.ossSecretKey"
                label="Secret Key"
                type="password"
                hint="腾讯云 API 密钥 Key"
              />
              <v-text-field
                v-model="form.ossBucket"
                label="Bucket"
                hint="COS 存储桶名称"
              />
              <v-text-field
                v-model="form.ossRegion"
                label="Region"
                hint="COS 地域，如 ap-guangzhou"
              />
              <v-text-field
                v-model="form.ossPublicBaseUrl"
                label="公网域名（可选）"
                hint="自定义 CDN 域名"
              />
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
import storageConfigApi from '../../api/storage-config'

const saving = ref(false)

const form = ref({
  accessMode: 'direct',
  ossSecretId: '',
  ossSecretKey: '',
  ossBucket: '',
  ossRegion: '',
  ossPublicBaseUrl: '',
})

async function loadConfig() {
  try {
    const res = await storageConfigApi.getConfig()
    if (res.config) {
      form.value.accessMode = res.config.accessMode || 'direct'
      form.value.ossSecretId = res.config.ossSecretId || ''
      form.value.ossSecretKey = res.config.ossSecretKey || ''
      form.value.ossBucket = res.config.ossBucket || ''
      form.value.ossRegion = res.config.ossRegion || ''
      form.value.ossPublicBaseUrl = res.config.ossPublicBaseUrl || ''
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await storageConfigApi.saveConfig(form.value)
    alert('配置已保存')
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

- [ ] **Step 2: 提交**

```bash
git add web/src/views/admin/Storage.vue
git commit -m "feat(frontend): 添加图片存储配置页面"
```

---

### Task 8: 前端路由和导航更新

**Files:**
- Modify: `web/src/views/Admin.vue`
- Modify: `web/src/router/index.js`

- [ ] **Step 1: 修改 Admin.vue 添加 Tab**

将 `Admin.vue` 中的 `<v-tabs>` 部分修改为：

```vue
        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab to="/admin/ai-config">
            <v-icon left>mdi-cog</v-icon>
            AI 配置
          </v-tab>
          <v-tab to="/admin/users">
            <v-icon left>mdi-account-group</v-icon>
            用户管理
          </v-tab>
          <v-tab to="/admin/storage">
            <v-icon left>mdi-image</v-icon>
            图片存储
          </v-tab>
        </v-tabs>
```

- [ ] **Step 2: 修改 router/index.js 添加子路由**

在 `/admin` 的 `children` 数组中添加：

```javascript
      {
        path: 'storage',
        name: 'AdminStorage',
        component: () => import('../views/admin/Storage.vue'),
      },
```

- [ ] **Step 3: 提交**

```bash
git add web/src/views/Admin.vue web/src/router/index.js
git commit -m "feat(frontend): 添加图片存储配置路由和导航"
```

---

### Task 9: 移除静态文件公开访问

**Files:**
- Modify: `server/config/config.default.js`

- [ ] **Step 1: 移除静态文件配置**

删除 `server/config/config.default.js` 中的静态文件配置：

```javascript
// 删除以下配置
exports.static = {
  prefix: '/images/',
  dir: 'public/images/',
};
```

- [ ] **Step 2: 提交**

```bash
git add server/config/config.default.js
git commit -m "refactor(config): 移除图片静态文件公开访问"
```

---

### Task 10: 集成测试验证

- [ ] **Step 1: 启动后端服务**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 测试 API**

```bash
# 1. 登录获取 cookie
curl -X POST http://localhost:7001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  -c cookies.txt

# 2. 获取存储配置
curl http://localhost:7001/api/storage-config \
  -b cookies.txt

# 3. 更新存储配置
curl -X PUT http://localhost:7001/api/storage-config \
  -H "Content-Type: application/json" \
  -d '{"accessMode":"direct"}' \
  -b cookies.txt
```

- [ ] **Step 3: 启动前端验证界面**

```bash
cd web && npm run dev
```

访问 http://localhost:3000/admin/storage 验证配置页面。

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成图片存储配置功能"
```

---

## 检查清单

- [ ] 数据库配置存取正常
- [ ] 配置文件迁移逻辑正确
- [ ] 存储配置 API 正常工作
- [ ] 认证图片访问接口正常
- [ ] 直链模式生成正确的 URL
- [ ] OSS 模式上传正常
- [ ] 前端页面显示正常
- [ ] 导航 Tab 正确显示
