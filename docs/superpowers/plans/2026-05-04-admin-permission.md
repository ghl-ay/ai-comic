# 管理员权限系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现管理员权限系统，区分管理员和普通用户，管理员可进入后台管理页面管理 AI 配置和用户。

**Architecture:** 用户表添加 is_admin 字段，首个注册用户自动成为管理员。后端新增管理员中间件和管理员 API，前端新增后台管理页面（带 Tab 导航），包含 AI 配置和用户管理两个功能。

**Tech Stack:** Egg.js (后端), SQLite (数据库), Vue 3 + Vuetify (前端), Pinia (状态管理)

---

## 文件结构

### 后端文件变更

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/database/init.sql` | 修改 | 添加 is_admin 字段到用户表 |
| `server/app/middleware/admin.js` | 新建 | 管理员权限验证中间件 |
| `server/app/middleware/jwt.js` | 修改 | JWT 解析时传递 is_admin |
| `server/app/service/db.js` | 修改 | 添加用户查询和更新方法 |
| `server/app/service/auth.js` | 修改 | 注册时检查首个用户设为管理员 |
| `server/app/controller/auth.js` | 修改 | me 方法返回 is_admin |
| `server/app/controller/admin.js` | 新建 | 管理员控制器（用户管理） |
| `server/app/router.js` | 修改 | 添加管理员路由 |

### 前端文件变更

| 文件 | 操作 | 职责 |
|------|------|------|
| `web/src/stores/auth.js` | 修改 | 添加 isAdmin 计算属性 |
| `web/src/api/admin.js` | 新建 | 管理员 API 封装 |
| `web/src/router/index.js` | 修改 | 添加后台管理路由和权限守卫 |
| `web/src/views/Admin.vue` | 新建 | 后台管理布局（Tab 导航） |
| `web/src/views/admin/AiConfig.vue` | 新建 | AI 配置页面（从旧页面迁移） |
| `web/src/views/admin/Users.vue` | 新建 | 用户管理页面 |
| `web/src/views/Comics.vue` | 修改 | 导航栏"AI 设置"改为"后台管理" |
| `web/src/views/AiConfig.vue` | 删除 | 迁移到 admin/AiConfig.vue |

---

## Task 1: 数据库添加 is_admin 字段

**Files:**
- Modify: `server/database/init.sql:4-9`

- [ ] **Step 1: 修改用户表结构**

在 `server/database/init.sql` 中修改 users 表定义：

```sql
-- server/database/init.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: 添加迁移脚本**

在 `server/database/` 目录创建迁移脚本 `migrate-admin.js`：

```javascript
// server/database/migrate-admin.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'comic.db');
const db = new Database(dbPath);

// 检查 is_admin 列是否存在
const tableInfo = db.prepare('PRAGMA table_info(users)').all();
const hasIsAdmin = tableInfo.some(col => col.name === 'is_admin');

if (!hasIsAdmin) {
  console.log('Adding is_admin column to users table...');
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  
  // 设置第一个用户为管理员（如果存在）
  const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  if (firstUser) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id);
    console.log(`Set user ${firstUser.id} as admin`);
  }
  
  console.log('Migration completed');
} else {
  console.log('is_admin column already exists, skipping migration');
}

db.close();
```

- [ ] **Step 3: 运行迁移脚本**

```bash
cd server && node database/migrate-admin.js
```

Expected output: `Migration completed` 或 `is_admin column already exists, skipping migration`

- [ ] **Step 4: 提交**

```bash
git add server/database/init.sql server/database/migrate-admin.js
git commit -m "feat(db): 添加用户 is_admin 字段

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: 修改 JWT 中间件传递 is_admin

**Files:**
- Modify: `server/app/middleware/jwt.js`

- [ ] **Step 1: 修改 JWT 中间件**

修改 `server/app/middleware/jwt.js`，在解析 token 后查询用户的 is_admin：

```javascript
// server/app/middleware/jwt.js
const jwt = require('jsonwebtoken');

module.exports = (options, app) => {
  return async function jwtMiddleware(ctx, next) {
    // 从 cookie 获取 token
    const token = ctx.cookies.get('token', { signed: false });

    if (!token) {
      ctx.status = 401;
      ctx.body = { error: '未登录' };
      return;
    }

    try {
      const decoded = jwt.verify(token, ctx.app.config.jwt.secret);
      
      // 查询用户的 is_admin 字段
      const user = await ctx.service.db.findUserById(decoded.id);
      
      ctx.state.user = {
        id: decoded.id,
        username: decoded.username,
        is_admin: user ? user.is_admin === 1 : false,
      };
      await next();
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'token 无效或已过期' };
    }
  };
};
```

- [ ] **Step 2: 修改 db service 的 findUserById 方法**

修改 `server/app/service/db.js` 的 `findUserById` 方法，返回 is_admin 字段：

```javascript
// server/app/service/db.js 第 26-31 行
findUserById(id) {
  const stmt = this.db.prepare(
    'SELECT id, username, is_admin, created_at FROM users WHERE id = ?'
  );
  return stmt.get(id);
}
```

- [ ] **Step 3: 提交**

```bash
git add server/app/middleware/jwt.js server/app/service/db.js
git commit -m "feat(jwt): 中间件传递用户 is_admin 字段

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 创建管理员中间件

**Files:**
- Create: `server/app/middleware/admin.js`

- [ ] **Step 1: 创建管理员中间件**

创建 `server/app/middleware/admin.js`：

```javascript
// server/app/middleware/admin.js
module.exports = (options, app) => {
  return async function adminRequired(ctx, next) {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { error: '未登录' };
      return;
    }

    if (!ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = { error: '需要管理员权限' };
      return;
    }

    await next();
  };
};
```

- [ ] **Step 2: 提交**

```bash
git add server/app/middleware/admin.js
git commit -m "feat(middleware): 添加管理员权限验证中间件

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 修改注册逻辑（首个用户设为管理员）

**Files:**
- Modify: `server/app/service/auth.js`
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 添加 db service 方法**

在 `server/app/service/db.js` 中添加以下方法：

```javascript
// server/app/service/db.js - 添加到类中

countUsers() {
  const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get();
  return result.count;
}

updateUserAdmin(id, isAdmin) {
  const stmt = this.db.prepare(
    'UPDATE users SET is_admin = ? WHERE id = ?'
  );
  const result = stmt.run(isAdmin ? 1 : 0, id);
  return result.changes > 0;
}

findAllUsers() {
  const stmt = this.db.prepare(
    'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
  );
  return stmt.all();
}
```

- [ ] **Step 2: 修改注册逻辑**

修改 `server/app/service/auth.js` 的 `register` 方法：

```javascript
// server/app/service/auth.js
async register(username, password) {
  const { ctx, app } = this;

  // 检查用户名是否已存在
  const existingUser = await ctx.service.db.findUserByUsername(username);
  if (existingUser) {
    ctx.throw(400, '用户名已存在');
  }

  // 检查是否是第一个用户
  const userCount = await ctx.service.db.countUsers();
  const isFirstUser = userCount === 0;

  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户
  const userId = await ctx.service.db.createUser(username, hashedPassword);

  // 如果是第一个用户，设置为管理员
  if (isFirstUser) {
    await ctx.service.db.updateUserAdmin(userId, true);
  }

  // 生成 token
  const token = jwt.sign(
    { id: userId, username },
    app.config.jwt.secret,
    { expiresIn: app.config.jwt.expiresIn }
  );

  return { userId, username, token, isFirstUser };
}
```

- [ ] **Step 3: 提交**

```bash
git add server/app/service/auth.js server/app/service/db.js
git commit -m "feat(auth): 首个注册用户自动成为管理员

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 修改 auth 控制器返回 is_admin

**Files:**
- Modify: `server/app/controller/auth.js`

- [ ] **Step 1: 修改 register 方法返回 is_admin**

修改 `server/app/controller/auth.js` 的 `register` 方法：

```javascript
// server/app/controller/auth.js 第 28-36 行
async register() {
  const { ctx } = this;
  const { username, password } = ctx.request.body;

  // 参数验证
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: '用户名和密码不能为空' };
    return;
  }

  if (username.length < 3 || username.length > 50) {
    ctx.status = 400;
    ctx.body = { error: '用户名长度需在 3-50 之间' };
    return;
  }

  if (password.length < 6) {
    ctx.status = 400;
    ctx.body = { error: '密码长度至少 6 位' };
    return;
  }

  try {
    const result = await ctx.service.auth.register(username, password);
    ctx.service.auth.setAuthCookie(result.token);
    ctx.body = {
      user: {
        id: result.userId,
        username: result.username,
        is_admin: result.isFirstUser,
      },
    };
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
  }
}
```

- [ ] **Step 2: 修改 login 方法返回 is_admin**

修改 `server/app/controller/auth.js` 的 `login` 方法：

```javascript
// server/app/controller/auth.js 第 43-65 行
async login() {
  const { ctx } = this;
  const { username, password } = ctx.request.body;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: '用户名和密码不能为空' };
    return;
  }

  try {
    const result = await ctx.service.auth.login(username, password);
    ctx.service.auth.setAuthCookie(result.token);
    ctx.body = {
      user: {
        id: result.userId,
        username: result.username,
        is_admin: result.is_admin,
      },
    };
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
  }
}
```

- [ ] **Step 3: 修改 auth service 的 login 方法**

修改 `server/app/service/auth.js` 的 `login` 方法：

```javascript
// server/app/service/auth.js 第 32-55 行
async login(username, password) {
  const { ctx, app } = this;

  // 查找用户
  const user = await ctx.service.db.findUserByUsername(username);
  if (!user) {
    ctx.throw(401, '用户名或密码错误');
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    ctx.throw(401, '用户名或密码错误');
  }

  // 生成 token
  const token = jwt.sign(
    { id: user.id, username: user.username },
    app.config.jwt.secret,
    { expiresIn: app.config.jwt.expiresIn }
  );

  return { 
    userId: user.id, 
    username: user.username, 
    is_admin: user.is_admin === 1,
    token 
  };
}
```

- [ ] **Step 4: 提交**

```bash
git add server/app/controller/auth.js server/app/service/auth.js
git commit -m "feat(auth): 登录注册返回用户 is_admin 状态

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 创建管理员控制器和路由

**Files:**
- Create: `server/app/controller/admin.js`
- Modify: `server/app/router.js`

- [ ] **Step 1: 创建管理员控制器**

创建 `server/app/controller/admin.js`：

```javascript
// server/app/controller/admin.js
const Controller = require('egg').Controller;

class AdminController extends Controller {
  async getUsers() {
    const { ctx } = this;
    const users = await ctx.service.db.findAllUsers();
    ctx.body = { users };
  }

  async setUserAdmin() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id);
    const { is_admin } = ctx.request.body;

    if (typeof is_admin !== 'boolean') {
      ctx.status = 400;
      ctx.body = { error: 'is_admin 必须是布尔值' };
      return;
    }

    const user = await ctx.service.db.findUserById(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }

    await ctx.service.db.updateUserAdmin(userId, is_admin);
    ctx.body = { 
      user: {
        id: userId,
        is_admin 
      }
    };
  }
}

module.exports = AdminController;
```

- [ ] **Step 2: 添加管理员路由**

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

  // AI 配置相关（需要登录）
  router.get('/api/ai-config', app.middleware.jwt(), controller.aiConfig.index);
  router.put('/api/ai-config/text', app.middleware.jwt(), controller.aiConfig.updateText);
  router.put('/api/ai-config/image', app.middleware.jwt(), controller.aiConfig.updateImage);

  // 管理员接口（需要管理员权限）
  router.get('/api/admin/users', app.middleware.jwt(), app.middleware.admin(), controller.admin.getUsers);
  router.put('/api/admin/users/:id/admin', app.middleware.jwt(), app.middleware.admin(), controller.admin.setUserAdmin);
};
```

- [ ] **Step 3: 提交**

```bash
git add server/app/controller/admin.js server/app/router.js
git commit -m "feat(admin): 添加管理员 API 接口

- GET /api/admin/users 获取用户列表
- PUT /api/admin/users/:id/admin 设置用户管理员状态

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 前端 auth store 添加 isAdmin

**Files:**
- Modify: `web/src/stores/auth.js`

- [ ] **Step 1: 修改 auth store**

修改 `web/src/stores/auth.js`，添加 isAdmin 计算属性：

```javascript
// web/src/stores/auth.js
import { defineStore } from 'pinia'
import authApi from '../api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    checked: false,
    loading: false,
    error: null,
  }),

  getters: {
    isAdmin: (state) => state.user?.is_admin === true,
  },

  actions: {
    async register(username, password) {
      this.loading = true
      this.error = null
      try {
        const res = await authApi.register(username, password)
        this.user = res.user
        return true
      } catch (err) {
        this.error = err.response?.data?.error || '注册失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async login(username, password) {
      this.loading = true
      this.error = null
      try {
        const res = await authApi.login(username, password)
        this.user = res.user
        return true
      } catch (err) {
        this.error = err.response?.data?.error || '登录失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await authApi.logout()
      } catch (e) {
        // ignore
      }
      this.user = null
    },

    async checkAuth() {
      try {
        const res = await authApi.getMe()
        this.user = res.user
      } catch (e) {
        this.user = null
      } finally {
        this.checked = true
      }
    },
  },
})
```

- [ ] **Step 2: 提交**

```bash
git add web/src/stores/auth.js
git commit -m "feat(store): 添加 isAdmin 计算属性

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 创建前端 admin API

**Files:**
- Create: `web/src/api/admin.js`

- [ ] **Step 1: 创建 admin API**

创建 `web/src/api/admin.js`：

```javascript
// web/src/api/admin.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getUsers() {
    const res = await api.get('/admin/users')
    return res.data
  },

  async setUserAdmin(userId, isAdmin) {
    const res = await api.put(`/admin/users/${userId}/admin`, { is_admin: isAdmin })
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add web/src/api/admin.js
git commit -m "feat(api): 添加管理员 API 封装

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 修改前端路由添加后台管理

**Files:**
- Modify: `web/src/router/index.js`

- [ ] **Step 1: 修改路由配置**

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
    path: '/comics/:id',
    name: 'ComicDetail',
    component: () => import('../views/ComicDetail.vue'),
  },
  {
    path: '/create/:comicId/:chapterId?',
    name: 'CreateChapter',
    component: () => import('../views/CreateChapter.vue'),
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('../views/Characters.vue'),
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/ai-config',
      },
      {
        path: 'ai-config',
        name: 'AdminAiConfig',
        component: () => import('../views/admin/AiConfig.vue'),
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue'),
      },
    ],
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

  // 管理员页面需要管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/comics')
  }

  next()
})

export default router
```

- [ ] **Step 2: 提交**

```bash
git add web/src/router/index.js
git commit -m "feat(router): 添加后台管理路由和权限守卫

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 创建后台管理布局页面

**Files:**
- Create: `web/src/views/Admin.vue`

- [ ] **Step 1: 创建后台管理布局页面**

创建 `web/src/views/Admin.vue`：

```vue
<!-- web/src/views/Admin.vue -->
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn to="/comics" variant="text" class="mr-2">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <h1>后台管理</h1>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab to="/admin/ai-config">
            <v-icon left>mdi-cog</v-icon>
            AI 配置
          </v-tab>
          <v-tab to="/admin/users">
            <v-icon left>mdi-account-group</v-icon>
            用户管理
          </v-tab>
        </v-tabs>

        <router-view />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref(route.path)
</script>
```

- [ ] **Step 2: 提交**

```bash
git add web/src/views/Admin.vue
git commit -m "feat(admin): 添加后台管理布局页面

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 创建 AI 配置页面（迁移）

**Files:**
- Create: `web/src/views/admin/AiConfig.vue`

- [ ] **Step 1: 创建 admin 目录**

```bash
mkdir -p web/src/views/admin
```

- [ ] **Step 2: 创建 AI 配置页面**

创建 `web/src/views/admin/AiConfig.vue`：

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

- [ ] **Step 3: 提交**

```bash
git add web/src/views/admin/AiConfig.vue
git commit -m "feat(admin): 添加 AI 配置管理页面

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: 创建用户管理页面

**Files:**
- Create: `web/src/views/admin/Users.vue`

- [ ] **Step 1: 创建用户管理页面**

创建 `web/src/views/admin/Users.vue`：

```vue
<!-- web/src/views/admin/Users.vue -->
<template>
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title>用户管理</v-card-title>
        <v-card-text>
          <v-table v-if="users.length > 0">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>
                  <v-chip :color="user.is_admin ? 'primary' : 'default'" size="small">
                    {{ user.is_admin ? '管理员' : '普通用户' }}
                  </v-chip>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <v-btn
                    v-if="!user.is_admin"
                    color="primary"
                    size="small"
                    variant="text"
                    @click="setAdmin(user, true)"
                    :loading="user._loading"
                  >
                    设为管理员
                  </v-btn>
                  <v-btn
                    v-else
                    color="error"
                    size="small"
                    variant="text"
                    @click="setAdmin(user, false)"
                    :loading="user._loading"
                  >
                    取消管理员
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-progress-circular v-else-if="loading" indeterminate />
          <v-empty-state v-else text="暂无用户" />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import adminApi from '../../api/admin'

const users = ref([])
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminApi.getUsers()
    users.value = res.users.map(u => ({ ...u, _loading: false }))
  } catch (e) {
    console.error('加载用户列表失败', e)
    alert('加载用户列表失败：' + (e.response?.data?.error || e.message))
  } finally {
    loading.value = false
  }
}

async function setAdmin(user, isAdmin) {
  user._loading = true
  try {
    await adminApi.setUserAdmin(user.id, isAdmin)
    user.is_admin = isAdmin
  } catch (e) {
    console.error('设置管理员失败', e)
    alert('设置失败：' + (e.response?.data?.error || e.message))
  } finally {
    user._loading = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadUsers()
})
</script>
```

- [ ] **Step 2: 提交**

```bash
git add web/src/views/admin/Users.vue
git commit -m "feat(admin): 添加用户管理页面

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: 修改导航栏入口

**Files:**
- Modify: `web/src/views/Comics.vue`

- [ ] **Step 1: 修改导航栏**

修改 `web/src/views/Comics.vue`，将"AI 设置"改为"后台管理"，并添加管理员权限判断：

```vue
<!-- web/src/views/Comics.vue 第 6-41 行 -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>我的漫画</h1>
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
            <v-btn
              v-if="authStore.isAdmin"
              color="secondary"
              variant="text"
              to="/admin"
              class="mr-2"
            >
              <v-icon left>mdi-shield-account</v-icon>
              后台管理
            </v-btn>
            <v-btn
              color="default"
              variant="text"
              class="mr-2"
              @click="toggleTheme"
            >
              <v-icon left>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
              {{ isDark ? '浅色' : '深色' }}
            </v-btn>
            <v-btn color="error" variant="text" @click="logout">
              <v-icon left>mdi-logout</v-icon>
              登出
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
    <!-- 其余内容保持不变 -->
  </v-container>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add web/src/views/Comics.vue
git commit -m "feat(nav): 导航栏\"AI 设置\"改为\"后台管理\"，仅管理员可见

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: 删除旧的 AI 配置页面

**Files:**
- Delete: `web/src/views/AiConfig.vue`

- [ ] **Step 1: 删除旧文件**

```bash
rm web/src/views/AiConfig.vue
```

- [ ] **Step 2: 提交**

```bash
git add web/src/views/AiConfig.vue
git commit -m "refactor: 删除旧的 AI 配置页面，已迁移到后台管理

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 15: 测试验证

- [ ] **Step 1: 启动后端服务**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 启动前端服务**

```bash
cd web && npm run dev
```

- [ ] **Step 3: 测试场景**

1. **测试首个注册用户成为管理员**
   - 清空数据库中的用户
   - 注册第一个用户
   - 确认该用户 is_admin 为 true
   - 确认导航栏显示"后台管理"入口

2. **测试普通用户注册**
   - 注册第二个用户
   - 确认该用户 is_admin 为 false
   - 确认导航栏不显示"后台管理"入口

3. **测试后台管理访问**
   - 以管理员身份登录，访问 `/admin`
   - 确认可以访问 AI 配置和用户管理
   - 以普通用户身份登录，访问 `/admin`
   - 确认被重定向到 `/comics`

4. **测试用户管理功能**
   - 管理员在用户管理页面设置/取消其他用户的管理员状态
   - 确认操作成功

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成管理员权限系统实现

- 用户表添加 is_admin 字段
- 首个注册用户自动成为管理员
- 后台管理页面（AI 配置 + 用户管理）
- 路由权限守卫

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
