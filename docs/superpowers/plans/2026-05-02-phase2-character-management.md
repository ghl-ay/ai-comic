# Phase 2: 角色管理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现角色库管理功能，包括角色的 CRUD 操作和 AI 生成角色参考图。

**Architecture:** 后端扩展现有的 db.js 和 router.js，新增 character 控制器和服务。前端新增角色管理页面和 API 封装。AI 图片生成使用 OpenAI SDK。

**Tech Stack:** Egg.js, SQLite, OpenAI SDK, Vue 3, Vuetify, Pinia

---

## 文件结构

### 后端新增/修改文件

```
server/
├── app/
│   ├── controller/
│   │   └── character.js      # 角色控制器（新增）
│   ├── service/
│   │   ├── db.js             # 添加角色相关方法（修改）
│   │   ├── character.js      # 角色服务（新增）
│   │   └── ai-image.js       # AI 图片生成服务（新增）
│   └── router.js             # 添加角色路由（修改）
```

### 前端新增/修改文件

```
web/
├── src/
│   ├── views/
│   │   └── Characters.vue    # 角色管理页面（新增）
│   ├── components/
│   │   └── CharacterForm.vue # 角色创建/编辑表单（新增）
│   ├── api/
│   │   └── character.js      # 角色 API 封装（新增）
│   └── router/
│       └── index.js          # 添加角色路由（修改）
```

---

## Task 1: 扩展数据库服务

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 添加角色相关数据库方法**

在 `server/app/service/db.js` 的 `DbService` 类中添加以下方法：

```javascript
// server/app/service/db.js
const Service = require('egg').Service;

class DbService extends Service {
  constructor(ctx) {
    super(ctx);
    this.db = ctx.app.db;
  }

  // 用户相关
  createUser(username, hashedPassword) {
    const stmt = this.db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    );
    const result = stmt.run(username, hashedPassword);
    return result.lastInsertRowid;
  }

  findUserByUsername(username) {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE username = ?'
    );
    return stmt.get(username);
  }

  findUserById(id) {
    const stmt = this.db.prepare(
      'SELECT id, username, created_at FROM users WHERE id = ?'
    );
    return stmt.get(id);
  }

  // 角色相关
  createCharacter(userId, name, description, appearance) {
    const stmt = this.db.prepare(
      'INSERT INTO characters (user_id, name, description, appearance) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(userId, name, description, appearance);
    return result.lastInsertRowid;
  }

  findCharactersByUserId(userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId);
  }

  findCharacterById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE id = ?'
    );
    return stmt.get(id);
  }

  findCharacterByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  updateCharacter(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.appearance !== undefined) {
      fields.push('appearance = ?');
      values.push(data.appearance);
    }
    if (data.reference_image !== undefined) {
      fields.push('reference_image = ?');
      values.push(data.reference_image);
    }
    if (data.reference_prompt !== undefined) {
      fields.push('reference_prompt = ?');
      values.push(data.reference_prompt);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE characters SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteCharacter(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM characters WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
}

module.exports = DbService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/db.js
git commit -m "feat(server): add character CRUD methods to db service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: AI 图片生成服务

**Files:**
- Create: `server/app/service/ai-image.js`

- [ ] **Step 1: 创建 AI 图片服务**

```javascript
// server/app/service/ai-image.js
const Service = require('egg').Service;
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class AiImageService extends Service {
  getClient() {
    // 从数据库获取用户配置或系统默认配置
    // 目前使用环境变量或默认配置
    const config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    };

    if (!config.apiKey) {
      return null;
    }

    return {
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      }),
      model: config.model,
    };
  }

  async generateCharacterReference(appearance) {
    const aiConfig = this.getClient();

    if (!aiConfig) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const { client, model } = aiConfig;

    const prompt = `Character reference sheet, full body front view, ${appearance}, white background, clean design, consistent character design, anime manga style, high quality, detailed. No text, no watermark.`;

    try {
      const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });

      const imageUrl = response.data[0].url;

      // 下载并保存图片
      const imageBuffer = await this.downloadImage(imageUrl);
      const filename = `character_${Date.now()}.png`;
      const filepath = path.join(this.app.config.characterImageDir || 'public/images/characters', filename);

      // 确保目录存在
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

  async downloadImage(url) {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          this.downloadImage(response.headers.location)
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
}

module.exports = AiImageService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/ai-image.js
git commit -m "feat(server): add AI image generation service

- Generate character reference images using OpenAI API
- Download and save images locally

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 角色服务

**Files:**
- Create: `server/app/service/character.js`

- [ ] **Step 1: 创建角色服务**

```javascript
// server/app/service/character.js
const Service = require('egg').Service;

class CharacterService extends Service {
  async createCharacter(userId, name, description, appearance) {
    // 创建角色（无参考图）
    const characterId = await this.ctx.service.db.createCharacter(
      userId,
      name,
      description,
      appearance
    );
    return characterId;
  }

  async generateReferenceImage(characterId, userId) {
    // 获取角色
    const character = await this.ctx.service.db.findCharacterByIdAndUserId(
      characterId,
      userId
    );

    if (!character) {
      this.ctx.throw(404, '角色不存在');
    }

    if (!character.appearance) {
      this.ctx.throw(400, '角色缺少外观描述');
    }

    // 生成参考图
    const result = await this.ctx.service.aiImage.generateCharacterReference(
      character.appearance
    );

    // 更新角色
    await this.ctx.service.db.updateCharacter(characterId, userId, {
      reference_image: result.imagePath,
      reference_prompt: result.prompt,
    });

    return {
      imagePath: result.imagePath,
    };
  }

  async getCharacters(userId) {
    return await this.ctx.service.db.findCharactersByUserId(userId);
  }

  async getCharacter(id, userId) {
    const character = await this.ctx.service.db.findCharacterByIdAndUserId(
      id,
      userId
    );
    if (!character) {
      this.ctx.throw(404, '角色不存在');
    }
    return character;
  }

  async updateCharacter(id, userId, data) {
    const updated = await this.ctx.service.db.updateCharacter(id, userId, data);
    if (!updated) {
      this.ctx.throw(404, '角色不存在或无权修改');
    }
    return await this.ctx.service.db.findCharacterByIdAndUserId(id, userId);
  }

  async deleteCharacter(id, userId) {
    const deleted = await this.ctx.service.db.deleteCharacter(id, userId);
    if (!deleted) {
      this.ctx.throw(404, '角色不存在或无权删除');
    }
  }
}

module.exports = CharacterService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/character.js
git commit -m "feat(server): add character service

- CRUD operations for characters
- Reference image generation orchestration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 角色控制器

**Files:**
- Create: `server/app/controller/character.js`

- [ ] **Step 1: 创建角色控制器**

```javascript
// server/app/controller/character.js
const Controller = require('egg').Controller;

class CharacterController extends Controller {
  async index() {
    const { ctx } = this;
    const characters = await ctx.service.character.getCharacters(ctx.state.user.id);
    ctx.body = { characters };
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const character = await ctx.service.character.getCharacter(
      parseInt(id),
      ctx.state.user.id
    );
    ctx.body = { character };
  }

  async create() {
    const { ctx } = this;
    const { name, description, appearance } = ctx.request.body;

    // 参数验证
    if (!name || !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能为空' };
      return;
    }

    if (name.length > 100) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能超过 100 个字符' };
      return;
    }

    try {
      const characterId = await ctx.service.character.createCharacter(
        ctx.state.user.id,
        name.trim(),
        description || '',
        appearance || ''
      );

      const character = await ctx.service.character.getCharacter(
        characterId,
        ctx.state.user.id
      );

      ctx.status = 201;
      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { name, description, appearance } = ctx.request.body;

    // 参数验证
    if (name !== undefined && !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能为空' };
      return;
    }

    if (name && name.length > 100) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能超过 100 个字符' };
      return;
    }

    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (appearance !== undefined) updateData.appearance = appearance;

      const character = await ctx.service.character.updateCharacter(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );

      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.character.deleteCharacter(
        parseInt(id),
        ctx.state.user.id
      );
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateReference() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.character.generateReferenceImage(
        parseInt(id),
        ctx.state.user.id
      );

      const character = await ctx.service.character.getCharacter(
        parseInt(id),
        ctx.state.user.id
      );

      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = CharacterController;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/controller/character.js
git commit -m "feat(server): add character controller

- CRUD endpoints for characters
- Reference image generation endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 角色路由

**Files:**
- Modify: `server/app/router.js`

- [ ] **Step 1: 添加角色路由**

修改 `server/app/router.js`：

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
};
```

- [ ] **Step 2: 测试角色 API**

```bash
# 创建角色
curl -X POST http://127.0.0.1:7001/api/characters \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<your_token>" \
  -d '{"name":"小明","description":"阳光开朗的男孩","appearance":"黑发短发，蓝色眼睛，穿着白色T恤和牛仔裤"}'
```

- [ ] **Step 3: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/router.js
git commit -m "feat(server): add character routes

- All routes protected with JWT middleware

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 前端角色 API 封装

**Files:**
- Create: `web/src/api/character.js`

- [ ] **Step 1: 创建角色 API 封装**

```javascript
// web/src/api/character.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getCharacters() {
    const res = await api.get('/characters')
    return res.data
  },

  async getCharacter(id) {
    const res = await api.get(`/characters/${id}`)
    return res.data
  },

  async createCharacter(data) {
    const res = await api.post('/characters', data)
    return res.data
  },

  async updateCharacter(id, data) {
    const res = await api.put(`/characters/${id}`, data)
    return res.data
  },

  async deleteCharacter(id) {
    const res = await api.delete(`/characters/${id}`)
    return res.data
  },

  async generateReference(id) {
    const res = await api.post(`/characters/${id}/generate-reference`)
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/api/character.js
git commit -m "feat(web): add character API wrapper

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 前端路由更新

**Files:**
- Modify: `web/src/router/index.js`

- [ ] **Step 1: 添加角色路由**

修改 `web/src/router/index.js`：

```javascript
// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/comics',
  },
  {
    path: '/comics',
    name: 'Comics',
    component: () => import('../views/Comics.vue'),
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('../views/Characters.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果还没检查过登录状态，先检查
  if (!authStore.checked) {
    await authStore.checkAuth()
  }

  // 非公开页面需要登录
  if (!to.meta.public && !authStore.user) {
    return next('/login')
  }

  // 已登录用户不能访问登录页
  if (to.meta.public && authStore.user && to.path === '/login') {
    return next('/comics')
  }

  next()
})

export default router
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/router/index.js
git commit -m "feat(web): add characters route

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 角色管理页面

**Files:**
- Create: `web/src/views/Characters.vue`

注意：此页面必须使用 `/frontend-design` 技能进行设计。

- [ ] **Step 1: 创建角色管理页面**

```vue
<!-- web/src/views/Characters.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>角色库</h1>
          <v-btn color="primary" @click="openCreateDialog">
            <v-icon left>mdi-plus</v-icon>
            创建角色
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- 角色列表 -->
    <v-row v-if="characters.length > 0">
      <v-col
        v-for="character in characters"
        :key="character.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card>
          <v-img
            v-if="character.reference_image"
            :src="character.reference_image"
            height="200"
            cover
          />
          <v-sheet v-else height="200" class="d-flex align-center justify-center bg-grey-lighten-2">
            <v-icon size="64" color="grey">mdi-account</v-icon>
          </v-sheet>

          <v-card-title>{{ character.name }}</v-card-title>
          <v-card-text>
            <div v-if="character.description" class="mb-2">
              {{ character.description }}
            </div>
            <div v-if="character.appearance" class="text-caption text-grey">
              外观：{{ character.appearance }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              size="small"
              color="primary"
              variant="text"
              @click="openEditDialog(character)"
            >
              编辑
            </v-btn>
            <v-btn
              size="small"
              color="secondary"
              variant="text"
              @click="generateReference(character)"
              :loading="generatingId === character.id"
              :disabled="!character.appearance"
            >
              {{ character.reference_image ? '重新生成' : '生成参考图' }}
            </v-btn>
            <v-spacer />
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click="confirmDelete(character)"
            >
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 空状态 -->
    <v-row v-else>
      <v-col cols="12" class="text-center py-8">
        <v-icon size="64" color="grey">mdi-account-group</v-icon>
        <p class="text-grey mt-4">还没有角色，点击上方按钮创建第一个角色</p>
      </v-col>
    </v-row>

    <!-- 创建/编辑对话框 -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑角色' : '创建角色' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveCharacter">
            <v-text-field
              v-model="form.name"
              label="角色名称"
              :rules="[v => !!v || '请输入角色名称']"
              required
            />
            <v-textarea
              v-model="form.description"
              label="角色描述"
              hint="描述角色的性格、背景等"
              rows="3"
            />
            <v-textarea
              v-model="form.appearance"
              label="外观描述"
              hint="描述角色的外貌特征，用于生成参考图"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn
            color="primary"
            @click="saveCharacter"
            :loading="saving"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除角色「{{ deleteTarget?.name }}」吗？此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn
            color="error"
            @click="deleteCharacter"
            :loading="deleting"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import characterApi from '../api/character'

const characters = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)
const saving = ref(false)
const deleting = ref(false)
const generatingId = ref(null)

const form = ref({
  name: '',
  description: '',
  appearance: '',
})

async function loadCharacters() {
  try {
    const res = await characterApi.getCharacters()
    characters.value = res.characters
  } catch (e) {
    console.error('加载角色失败', e)
  }
}

function openCreateDialog() {
  isEdit.value = false
  editingId.value = null
  form.value = { name: '', description: '', appearance: '' }
  dialog.value = true
}

function openEditDialog(character) {
  isEdit.value = true
  editingId.value = character.id
  form.value = {
    name: character.name,
    description: character.description || '',
    appearance: character.appearance || '',
  }
  dialog.value = true
}

async function saveCharacter() {
  if (!form.value.name.trim()) return

  saving.value = true
  try {
    if (isEdit.value) {
      const res = await characterApi.updateCharacter(editingId.value, form.value)
      const index = characters.value.findIndex(c => c.id === editingId.value)
      if (index !== -1) {
        characters.value[index] = res.character
      }
    } else {
      const res = await characterApi.createCharacter(form.value)
      characters.value.unshift(res.character)
    }
    dialog.value = false
  } catch (e) {
    console.error('保存失败', e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(character) {
  deleteTarget.value = character
  deleteDialog.value = true
}

async function deleteCharacter() {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    await characterApi.deleteCharacter(deleteTarget.value.id)
    characters.value = characters.value.filter(c => c.id !== deleteTarget.value.id)
    deleteDialog.value = false
    deleteTarget.value = null
  } catch (e) {
    console.error('删除失败', e)
  } finally {
    deleting.value = false
  }
}

async function generateReference(character) {
  generatingId.value = character.id
  try {
    const res = await characterApi.generateReference(character.id)
    const index = characters.value.findIndex(c => c.id === character.id)
    if (index !== -1) {
      characters.value[index] = res.character
    }
  } catch (e) {
    console.error('生成参考图失败', e)
    alert('生成参考图失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingId.value = null
  }
}

onMounted(() => {
  loadCharacters()
})
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/views/Characters.vue
git commit -m "feat(web): add Characters management page

- Character list with cards
- Create/edit dialog
- Delete confirmation
- Reference image generation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 更新导航

**Files:**
- Modify: `web/src/views/Comics.vue`

- [ ] **Step 1: 添加导航到角色管理**

修改 `web/src/views/Comics.vue`：

```vue
<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>漫画列表</h1>
          <div>
            <v-btn
              color="primary"
              variant="text"
              to="/characters"
              class="mr-2"
            >
              <v-icon left>mdi-account-group</v-icon>
              角色库
            </v-btn>
            <v-btn color="error" variant="text" @click="logout">
              <v-icon left>mdi-logout</v-icon>
              登出
            </v-btn>
          </div>
        </div>
        <p>欢迎, {{ authStore.user?.username }}</p>
        <v-card class="mt-4">
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
            <p class="text-grey mt-4">漫画功能开发中...</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/views/Comics.vue
git commit -m "feat(web): add navigation to characters page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 静态文件服务配置

**Files:**
- Modify: `server/config/config.default.js`

- [ ] **Step 1: 添加静态文件和图片目录配置**

修改 `server/config/config.default.js`：

```javascript
// server/config/config.default.js
exports.keys = 'CHANGE-ME-IN-PRODUCTION';

exports.security = {
  csrf: {
    enable: false,
  },
};

exports.jwt = {
  secret: 'CHANGE-ME-IN-PRODUCTION',
  expiresIn: '7d',
};

exports.cookie = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
};

exports.database = {
  path: './database/comic.db',
};

// 角色参考图存储目录
exports.characterImageDir = 'public/images/characters';

// 静态文件配置
exports.static = {
  prefix: '/images/',
  dir: 'public/images/',
};
```

- [ ] **Step 2: 确保图片目录存在**

```bash
mkdir -p /Users/philip/Documents/code/ai-print/server/public/images/characters
```

- [ ] **Step 3: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/config/config.default.js
git commit -m "feat(server): add static file config for images

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 完成检查

- [ ] 后端角色 API 可正常访问
- [ ] 前端角色页面可正常显示
- [ ] 可以创建、编辑、删除角色
- [ ] 可以生成角色参考图（需配置 AI API Key）

---

**Phase 2 完成标志**：用户可以管理角色库，创建角色并生成参考图。
