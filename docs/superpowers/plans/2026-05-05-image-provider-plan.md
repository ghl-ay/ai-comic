# 图片模型 Provider 策略模式重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将图片生成服务的 OpenAI 和 grsai 实现解耦为独立的 Provider 类，支持前端配置页面选择 API 格式。

**Architecture:** 采用策略模式，创建 providers 目录包含基类和各提供商实现。ai-image.js 简化为调用 provider 工厂方法。数据库新增 api_format 字段。

**Tech Stack:** Node.js, Egg.js, SQLite, Vue 3, Vuetify 3

---

### Task 1: 数据库迁移 - 添加 api_format 字段

**Files:**
- Modify: `server/database/init.sql`

- [ ] **Step 1: 添加 api_format 字段到 ai_configs 表**

在 `server/database/init.sql` 的 `ai_configs` 表定义中，添加 `api_format` 字段：

```sql
-- AI 配置表
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  api_format VARCHAR(20) DEFAULT 'openai',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: 创建迁移脚本**

创建 `server/database/migrate-api-format.js`：

```javascript
// server/database/migrate-api-format.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/comic.db');
const db = new Database(dbPath);

// 检查字段是否已存在
const tableInfo = db.prepare('PRAGMA table_info(ai_configs)').all();
const hasApiFormat = tableInfo.some(col => col.name === 'api_format');

if (!hasApiFormat) {
  db.exec('ALTER TABLE ai_configs ADD COLUMN api_format VARCHAR(20) DEFAULT \'openai\'');
  console.log('Added api_format column to ai_configs table');
} else {
  console.log('api_format column already exists');
}

db.close();
```

- [ ] **Step 3: 运行迁移脚本**

```bash
cd /Users/philip/Documents/code/ai-print/server && node database/migrate-api-format.js
```

---

### Task 2: 创建 Provider 基类

**Files:**
- Create: `server/app/providers/base.js`

- [ ] **Step 1: 创建 providers 目录和基类**

创建 `server/app/providers/base.js`：

```javascript
// server/app/providers/base.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class BaseImageProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * 生成图片 - 必须由子类实现
   * @param {Object} params - 生成参数
   * @returns {Promise<{imageBuffer: Buffer}>}
   */
  async generateImage(params) {
    throw new Error('必须实现 generateImage 方法');
  }

  /**
   * 带参考图生成图片 - 可选重写
   * @param {Object} params - 生成参数
   * @returns {Promise<{imageBuffer: Buffer}>}
   */
  async generateImageWithReference(params) {
    return this.generateImage(params);
  }

  /**
   * 下载图片
   */
  static async downloadImage(url) {
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          BaseImageProvider.downloadImage(response.headers.location)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * 构建漫画页面提示词
   */
  static buildComicPagePrompt(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;
    const charactersById = new Map(characterReferences.map(character => [character.id, character]));

    const panelDescriptions = script.panels.map((panel, index) => {
      const panelCharacters = Array.isArray(panel.characters) ? panel.characters : [];
      const characterNames = panelCharacters
        .map(id => charactersById.get(id)?.name || `Character ${id}`)
        .join(', ') || 'none specified';

      return [
        `Panel ${index + 1}:`,
        `Scene: ${panel.scene || ''}`,
        `Dialogue / speech bubbles: ${panel.dialogue || '(no dialogue)'}`,
        `Characters in panel: ${characterNames}`,
      ].join('\n');
    }).join('\n\n');

    const characterDescriptions = characterReferences.length > 0
      ? characterReferences.map(character => {
        return [
          `ID ${character.id} - ${character.name}`,
          `Description: ${character.description || 'Not provided'}`,
          `Appearance: ${character.appearance || 'Not provided'}`,
          `Reference image: ${character.imageUrl ? 'provided as input image' : 'not provided'}`,
        ].join('\n');
      }).join('\n\n')
      : 'No character library entries were provided.';

    let prompt = `Create a single ${layoutType}-panel comic page in this visual style: ${stylePrompt}.

Panel layout:
${layoutType} distinct panels arranged in a clean comic grid with clear panel borders.

Character library:
${characterDescriptions}

Panel script:
${panelDescriptions}

Requirements:
- Match each panel scene, action, and character list exactly.
- Use the character library as the source of truth for character design, clothing, body type, hairstyle, and visual personality.
- If reference images are provided, preserve those designs across every panel.
- Readable Chinese speech bubbles for every non-empty dialogue line.
- Do not omit dialogue. Keep speech bubble text concise, legible, and placed inside the correct panel.
- Preserve the requested visual style and do not override it with another color mode.`;

    if (previousChapterImage) {
      prompt += '\n- Maintain visual continuity with the previous chapter reference image.';
    }

    return prompt;
  }
}

module.exports = BaseImageProvider;
```

---

### Task 3: 创建 OpenAI Provider

**Files:**
- Create: `server/app/providers/openai.js`

- [ ] **Step 1: 创建 OpenAI Provider 实现**

创建 `server/app/providers/openai.js`：

```javascript
// server/app/providers/openai.js
const OpenAI = require('openai');
const BaseImageProvider = require('./base');
const fs = require('fs');

class OpenAIImageProvider extends BaseImageProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async generateImage(params) {
    const { prompt } = params;
    const model = this.config.model;

    const body = {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    };

    if (!this.isGptImageModel(model)) {
      body.response_format = 'url';
    }

    const response = await this.client.images.generate(body);
    return this.extractImageResponse(response);
  }

  async generateImageWithReference(params) {
    const { prompt, imagePaths } = params;
    const model = this.config.model;

    if (imagePaths && imagePaths.length > 0) {
      const imageInputs = imagePaths.map(p => fs.createReadStream(p));

      try {
        const response = await this.client.images.edit({
          model,
          prompt,
          image: imageInputs,
          n: 1,
          size: '1024x1024',
        });
        return this.extractImageResponse(response);
      } catch (err) {
        if (err.status !== 404) {
          throw err;
        }
        // 回退到生成模式
      }
    }

    return this.generateImage(params);
  }

  isGptImageModel(model) {
    return typeof model === 'string' && model.startsWith('gpt-image');
  }

  extractImageResponse(response) {
    const image = response.data && response.data[0];
    if (!image) {
      throw new Error('AI 图片服务未返回图片');
    }

    if (image.b64_json) {
      return { imageBuffer: Buffer.from(image.b64_json, 'base64') };
    }

    return { imageUrl: image.url };
  }
}

module.exports = OpenAIImageProvider;
```

---

### Task 4: 创建 grsai Provider

**Files:**
- Create: `server/app/providers/grsai.js`

- [ ] **Step 1: 创建 grsai Provider 实现**

创建 `server/app/providers/grsai.js`：

```javascript
// server/app/providers/grsai.js
const BaseImageProvider = require('./base');

class GrsaiImageProvider extends BaseImageProvider {
  static DEFAULT_POLL_INTERVAL_MS = 2000;
  static DEFAULT_MAX_POLL_ATTEMPTS = 300;

  constructor(config) {
    super(config);
    this.pollIntervalMs = config.pollIntervalMs || GrsaiImageProvider.DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts || GrsaiImageProvider.DEFAULT_MAX_POLL_ATTEMPTS;
  }

  async generateImage(params) {
    const { prompt, referenceUrls = [] } = params;
    const { apiKey, baseUrl, model } = this.config;

    const result = await this.executeGrsaiDrawRequest({
      apiKey,
      baseUrl,
      model,
      prompt,
      referenceUrls,
    });

    return this.convertGrsaiResultToImageResponse(result);
  }

  async generateImageWithReference(params) {
    return this.generateImage(params);
  }

  buildGrsaiApiUrl(baseUrl, endpoint) {
    const normalized = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
    return `${normalized}/v1/draw/${endpoint}`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async readJsonResponse(response) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Grsai API request failed: ${response.status} ${text}`);
    }
    return await response.json();
  }

  extractGrsaiResultPayload(payload) {
    return payload.data && payload.data.status ? payload.data : payload;
  }

  convertGrsaiResultToImageResponse(result) {
    const firstUrl = result.url || (result.results && result.results[0] && result.results[0].url);
    if (!firstUrl) {
      throw new Error('Grsai 绘图结果中没有图片 URL');
    }

    return { imageUrl: firstUrl };
  }

  async executeGrsaiDrawRequest(params) {
    const { apiKey, baseUrl, model, prompt, referenceUrls = [] } = params;

    const completionsUrl = this.buildGrsaiApiUrl(baseUrl, 'completions');
    const resultUrl = this.buildGrsaiApiUrl(baseUrl, 'result');

    const requestBody = {
      model,
      prompt,
      aspectRatio: '1:1',
      webHook: '-1',
      shutProgress: false,
    };

    if (referenceUrls.length > 0) {
      requestBody.urls = referenceUrls;
    }

    const createPayload = await this.readJsonResponse(await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }));

    const taskId = createPayload.data && createPayload.data.id;
    if (!taskId) {
      throw new Error(`Grsai 绘图任务创建失败: ${createPayload.msg || 'missing task id'}`);
    }

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      if (attempt > 0 && this.pollIntervalMs > 0) {
        await this.sleep(this.pollIntervalMs);
      }

      const resultPayload = await this.readJsonResponse(await fetch(resultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: taskId }),
      }));

      if (resultPayload.code !== undefined && resultPayload.code !== 0) {
        throw new Error(`Grsai 绘图结果获取失败: ${resultPayload.msg || resultPayload.code}`);
      }

      const result = this.extractGrsaiResultPayload(resultPayload);
      if (result.status === 'succeeded') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(`Grsai 绘图失败: ${result.error || result.failure_reason || 'unknown error'}`);
      }
    }

    throw new Error('Grsai 绘图任务超时');
  }
}

module.exports = GrsaiImageProvider;
```

---

### Task 5: 创建 Provider 工厂

**Files:**
- Create: `server/app/providers/index.js`

- [ ] **Step 1: 创建 Provider 注册表和工厂方法**

创建 `server/app/providers/index.js`：

```javascript
// server/app/providers/index.js
const OpenAIImageProvider = require('./openai');
const GrsaiImageProvider = require('./grsai');

const providers = {
  openai: OpenAIImageProvider,
  grsai: GrsaiImageProvider,
};

/**
 * 创建图片 Provider 实例
 * @param {string} format - API 格式标识 (openai, grsai)
 * @param {Object} config - 配置对象
 * @returns {BaseImageProvider}
 */
function createImageProvider(format, config) {
  const Provider = providers[format];
  if (!Provider) {
    throw new Error(`不支持的 API 格式: ${format}`);
  }
  return new Provider(config);
}

/**
 * 获取支持的 API 格式列表
 * @returns {string[]}
 */
function getSupportedFormats() {
  return Object.keys(providers);
}

module.exports = {
  createImageProvider,
  getSupportedFormats,
  providers,
};
```

---

### Task 6: 更新 db.js 支持 api_format

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 修改 findGlobalAiConfigs 方法**

将 `findGlobalAiConfigs` 方法修改为：

```javascript
findGlobalAiConfigs() {
  const stmt = this.db.prepare(
    'SELECT id, type, provider, base_url, model, api_format, created_at, updated_at FROM ai_configs WHERE user_id IS NULL'
  );
  return stmt.all();
}
```

- [ ] **Step 2: 修改 findGlobalAiConfigByType 方法**

将 `findGlobalAiConfigByType` 方法修改为：

```javascript
findGlobalAiConfigByType(type) {
  const stmt = this.db.prepare(
    'SELECT * FROM ai_configs WHERE user_id IS NULL AND type = ?'
  );
  const config = stmt.get(type);
  if (!config) return null;
  return {
    provider: config.provider,
    apiKey: config.api_key,
    baseUrl: config.base_url,
    model: config.model,
    apiFormat: config.api_format || 'openai',
  };
}
```

- [ ] **Step 3: 修改 upsertGlobalAiConfig 方法**

将 `upsertGlobalAiConfig` 方法修改为：

```javascript
upsertGlobalAiConfig(type, provider, apiKey, baseUrl, model, apiFormat = 'openai') {
  const existing = this.findGlobalAiConfigByType(type);
  if (existing) {
    const stmt = this.db.prepare(
      'UPDATE ai_configs SET provider = ?, api_key = ?, base_url = ?, model = ?, api_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(provider, apiKey, baseUrl, model, apiFormat, existing.id);
    return existing.id;
  } else {
    const stmt = this.db.prepare(
      'INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model, api_format) VALUES (NULL, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(type, provider, apiKey, baseUrl, model, apiFormat);
    return result.lastInsertRowid;
  }
}
```

---

### Task 7: 更新 aiConfig 服务和控制器

**Files:**
- Modify: `server/app/service/aiConfig.js`
- Modify: `server/app/controller/aiConfig.js`

- [ ] **Step 1: 修改 aiConfig 服务**

修改 `server/app/service/aiConfig.js`：

```javascript
// server/app/service/ai-config.js
const Service = require('egg').Service;

class AiConfigService extends Service {
  async getAiConfigs() {
    const configs = await this.ctx.service.db.findGlobalAiConfigs();
    return configs.map(c => ({
      id: c.id,
      type: c.type,
      provider: c.provider,
      baseUrl: c.base_url,
      model: c.model,
      apiFormat: c.api_format || 'openai',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async saveAiConfig(type, data) {
    const { provider, apiKey, baseUrl, model, apiFormat } = data;

    await this.ctx.service.db.upsertGlobalAiConfig(
      type,
      provider,
      apiKey,
      baseUrl,
      model,
      apiFormat || 'openai'
    );

    return await this.getAiConfigs();
  }

  async getAiConfigWithKey(type) {
    return await this.ctx.service.db.findGlobalAiConfigByType(type);
  }
}

module.exports = AiConfigService;
```

- [ ] **Step 2: 修改 aiConfig 控制器**

修改 `server/app/controller/aiConfig.js`：

```javascript
// server/app/controller/ai-config.js
const Controller = require('egg').Controller;

class AiConfigController extends Controller {
  async index() {
    const { ctx } = this;
    const configs = await ctx.service.aiConfig.getAiConfigs();
    ctx.body = { configs };
  }

  async updateText() {
    const { ctx } = this;
    const { provider, apiKey, baseUrl, model, apiFormat } = ctx.request.body;

    if (!provider || !apiKey || !baseUrl || !model) {
      ctx.status = 400;
      ctx.body = { error: '请填写完整配置' };
      return;
    }

    try {
      const configs = await ctx.service.aiConfig.saveAiConfig(
        'text',
        { provider, apiKey, baseUrl, model, apiFormat }
      );
      ctx.body = { configs };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }

  async updateImage() {
    const { ctx } = this;
    const { provider, apiKey, baseUrl, model, apiFormat } = ctx.request.body;

    if (!provider || !apiKey || !baseUrl || !model) {
      ctx.status = 400;
      ctx.body = { error: '请填写完整配置' };
      return;
    }

    try {
      const configs = await ctx.service.aiConfig.saveAiConfig(
        'image',
        { provider, apiKey, baseUrl, model, apiFormat }
      );
      ctx.body = { configs };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = AiConfigController;
```

---

### Task 8: 重构 ai-image.js 使用 Provider

**Files:**
- Modify: `server/app/service/ai-image.js`

- [ ] **Step 1: 重写 ai-image.js**

完全重写 `server/app/service/ai-image.js`：

```javascript
// server/app/service/ai-image.js
const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const { createImageProvider } = require('../providers');
const BaseImageProvider = require('../providers/base');

class AiImageService extends Service {
  static DEFAULT_IMAGE_MODEL = 'gpt-image-2';

  async getClient() {
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey('image');

    if (!config || !config.apiKey) {
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_IMAGE_MODEL || AiImageService.DEFAULT_IMAGE_MODEL,
        apiFormat: 'openai',
      };

      if (!envConfig.apiKey) {
        return null;
      }

      return envConfig;
    }

    return config;
  }

  async generateCharacterReference(appearance) {
    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = `Character reference sheet, full body front view, ${appearance}, white background, clean design, consistent character design, anime manga style, high quality, detailed. No text, no watermark.`;

    try {
      const result = await provider.generateImage({ prompt });

      let imageBuffer;
      if (result.imageBuffer) {
        imageBuffer = result.imageBuffer;
      } else if (result.imageUrl) {
        imageBuffer = await BaseImageProvider.downloadImage(result.imageUrl);
      }

      const filename = `character_${Date.now()}.png`;
      const filepath = path.join(this.app.config.characterImageDir || 'public/images/characters', filename);

      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filepath, imageBuffer);

      return {
        imagePath: `/images/characters/${filename}`,
        prompt,
      };
    } catch (err) {
      this.ctx.logger.error('AI image generation error:', err);
      this.ctx.throw(500, `AI 图片生成失败: ${err.message}`);
    }
  }

  async generateComicPage(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;

    const config = await this.getClient();
    if (!config) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const provider = createImageProvider(config.apiFormat, config);
    const prompt = BaseImageProvider.buildComicPagePrompt({
      stylePrompt,
      layoutType,
      script,
      characterReferences,
      previousChapterImage,
    });

    try {
      const referenceImagePaths = [];
      for (const charRef of characterReferences) {
        if (charRef.imageUrl) {
          const imagePath = path.join(
            this.app.config.characterImageDir || 'public/images/characters',
            path.basename(charRef.imageUrl)
          );
          if (fs.existsSync(imagePath)) {
            referenceImagePaths.push(imagePath);
          }
        }
      }

      let previousChapterImagePath = null;
      if (previousChapterImage) {
        const prevImagePath = path.join(
          this.app.config.comicImageDir || 'public/images/comics',
          previousChapterImage
        );
        if (fs.existsSync(prevImagePath)) {
          previousChapterImagePath = prevImagePath;
        }
      }

      let result;
      if (config.apiFormat === 'grsai') {
        const uploadPaths = [...referenceImagePaths];
        if (previousChapterImagePath) {
          uploadPaths.push(previousChapterImagePath);
        }

        const referenceUrls = await this.uploadReferenceImages(uploadPaths);

        if (uploadPaths.length > 0 && referenceUrls.length === 0) {
          throw new Error('角色参考图上传失败');
        }

        result = await provider.generateImage({ prompt, referenceUrls });
      } else {
        const imageInputs = [...referenceImagePaths];
        if (previousChapterImagePath) {
          imageInputs.push(previousChapterImagePath);
        }

        result = await provider.generateImageWithReference({ prompt, imageInputs });
      }

      let imageBuffer;
      if (result.imageBuffer) {
        imageBuffer = result.imageBuffer;
      } else if (result.imageUrl) {
        imageBuffer = await BaseImageProvider.downloadImage(result.imageUrl);
      }

      const filename = `page_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      return { imagePath: filename };
    } catch (err) {
      this.ctx.logger.error('Comic page generation error:', err);
      this.ctx.throw(500, `漫画页面生成失败: ${err.message}`);
    }
  }

  async uploadReferenceImages(imagePaths) {
    const urls = [];
    for (const imagePath of imagePaths) {
      urls.push(await this.ctx.service.objectStorage.uploadReferenceImage(imagePath));
    }
    return urls;
  }
}

module.exports = AiImageService;
```

---

### Task 9: 更新前端配置页面

**Files:**
- Modify: `web/src/views/admin/AiConfig.vue`

- [ ] **Step 1: 添加 API 格式选择器**

修改 `web/src/views/admin/AiConfig.vue`，在图片模型配置表单中添加 API 格式选择：

```vue
<!-- web/src/views/admin/AiConfig.vue -->
<template>
  <v-row>
    <!-- 文本模型配置 -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>文本模型</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveTextConfig">
            <v-text-field
              v-model="textForm.provider"
              label="供应商名称"
              hint="如: openai, deepseek"
            />
            <v-text-field
              v-model="textForm.baseUrl"
              label="API 地址"
              hint="如: https://api.openai.com"
            />
            <v-text-field
              v-model="textForm.model"
              label="模型名称"
              hint="如: gpt-4o, deepseek-chat"
            />
            <v-text-field
              v-model="textForm.apiKey"
              label="API Key"
              type="password"
              hint="您的 API 密钥将安全存储"
            />
            <v-btn
              color="primary"
              type="submit"
              :loading="textSaving"
            >
              保存文本模型配置
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- 图片模型配置 -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>图片模型</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveImageConfig">
            <v-select
              v-model="imageForm.apiFormat"
              :items="apiFormatOptions"
              label="API 格式"
              hint="选择图片生成服务的 API 格式"
            />
            <v-text-field
              v-model="imageForm.provider"
              label="供应商名称"
              hint="如: openai"
            />
            <v-text-field
              v-model="imageForm.baseUrl"
              label="API 地址"
              hint="如: https://api.openai.com"
            />
            <v-text-field
              v-model="imageForm.model"
              label="模型名称"
              hint="如: dall-e-3"
            />
            <v-text-field
              v-model="imageForm.apiKey"
              label="API Key"
              type="password"
              hint="您的 API 密钥将安全存储"
            />
            <v-btn
              color="primary"
              type="submit"
              :loading="imageSaving"
            >
              保存图片模型配置
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import aiConfigApi from '../../api/ai-config'

const textSaving = ref(false)
const imageSaving = ref(false)

const apiFormatOptions = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'GRS AI', value: 'grsai' },
]

const textForm = ref({
  provider: '',
  baseUrl: '',
  model: '',
  apiKey: '',
})

const imageForm = ref({
  provider: '',
  baseUrl: '',
  model: '',
  apiKey: '',
  apiFormat: 'openai',
})

async function loadConfigs() {
  try {
    const res = await aiConfigApi.getConfigs()
    const textConfig = res.configs.find(c => c.type === 'text')
    const imageConfig = res.configs.find(c => c.type === 'image')

    if (textConfig) {
      textForm.value.provider = textConfig.provider || ''
      textForm.value.baseUrl = textConfig.baseUrl || ''
      textForm.value.model = textConfig.model || ''
    }

    if (imageConfig) {
      imageForm.value.provider = imageConfig.provider || ''
      imageForm.value.baseUrl = imageConfig.baseUrl || ''
      imageForm.value.model = imageConfig.model || ''
      imageForm.value.apiFormat = imageConfig.apiFormat || 'openai'
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function saveTextConfig() {
  textSaving.value = true
  try {
    await aiConfigApi.saveTextConfig(textForm.value)
    alert('文本模型配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    textSaving.value = false
  }
}

async function saveImageConfig() {
  imageSaving.value = true
  try {
    await aiConfigApi.saveImageConfig(imageForm.value)
    alert('图片模型配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    imageSaving.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>
```

---

### Task 10: 测试和提交

**Files:**
- All modified files

- [ ] **Step 1: 运行后端测试**

```bash
cd /Users/philip/Documents/code/ai-print/server && npm test
```

- [ ] **Step 2: 手动测试前端功能**

1. 启动后端：`cd /Users/philip/Documents/code/ai-print/server && npm run dev`
2. 启动前端：`cd /Users/philip/Documents/code/ai-print/web && npm run dev`
3. 访问后台管理页面，测试图片模型配置：
   - 选择不同 API 格式
   - 保存配置
   - 验证配置正确加载

- [ ] **Step 3: 提交代码**

```bash
git add .
git commit -m "refactor(ai-image): 采用策略模式重构图片生成服务

- 创建 providers 目录，包含基类和 OpenAI/grsai 实现
- 数据库新增 api_format 字段
- 前端配置页面支持选择 API 格式
- 解耦不同提供商的实现代码

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
