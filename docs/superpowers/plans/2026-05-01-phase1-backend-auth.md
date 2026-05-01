# Phase 1: 后端基础架构 + 认证 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建可运行的前后端项目，实现用户注册、登录、登出功能。

**Architecture:** 后端使用 Egg.js + SQLite，通过 JWT + HttpOnly Cookie 实现认证。前端使用 Vue 3 + Vuetify，通过 Pinia 管理认证状态。

**Tech Stack:** Egg.js, SQLite (better-sqlite3), JWT, Vue 3, Vite, Vuetify, Pinia, Vue Router

---

## 文件结构

### 后端新增文件

```
server/
├── app/
│   ├── controller/
│   │   └── auth.js          # 认证控制器
│   ├── service/
│   │   ├── auth.js          # 认证服务（注册、登录逻辑）
│   │   └── db.js            # 数据库封装
│   ├── middleware/
│   │   └── jwt.js           # JWT 验证中间件
│   └── router.js            # 路由定义
├── config/
│   ├── config.default.js    # 默认配置
│   └── config.prod.js       # 生产配置
├── database/
│   └── init.sql             # 数据库初始化脚本
├── run/                      # 运行目录（Egg.js 需要）
├── app.js                   # 应用入口
├── jsconfig.json            # JS 配置
└── package.json             # 依赖定义
```

### 前端新增文件

```
web/
├── src/
│   ├── views/
│   │   └── Login.vue        # 登录/注册页面
│   ├── api/
│   │   └── auth.js          # 认证 API 封装
│   ├── stores/
│   │   └── auth.js          # 认证状态管理
│   ├── router/
│   │   └── index.js         # 路由配置
│   ├── App.vue              # 根组件
│   └── main.js              # 入口文件
├── index.html
├── vite.config.js           # Vite 配置
└── package.json             # 依赖定义
```

---

## Task 1: 后端项目初始化

**Files:**
- Create: `server/package.json`
- Create: `server/app.js`
- Create: `server/jsconfig.json`
- Create: `server/config/config.default.js`
- Create: `server/config/config.prod.js`

- [ ] **Step 1: 创建 server 目录和 package.json**

```bash
mkdir -p server/config server/app/controller server/app/service server/app/middleware server/database server/run server/public/images/characters server/public/images/comics
```

- [ ] **Step 2: 写入 package.json**

```json
{
  "name": "ai-comic-server",
  "version": "1.0.0",
  "scripts": {
    "start": "egg-scripts start --daemon --title=ai-comic-server",
    "stop": "egg-scripts stop --title=ai-comic-server",
    "dev": "egg-bin dev",
    "test": "egg-bin test"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.0.0",
    "egg": "^3.17.0",
    "egg-scripts": "^2.17.0",
    "jsonwebtoken": "^9.0.2",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "egg-bin": "^6.6.0"
  },
  "egg": {
    "declarations": true
  }
}
```

- [ ] **Step 3: 写入 app.js**

```javascript
// server/app.js
module.exports = app => {
  // 应用启动时初始化数据库
  app.beforeStart(async () => {
    const db = require('./database/init');
    app.db = db;
    app.logger.info('Database initialized');
  });
};
```

- [ ] **Step 4: 写入 jsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "commonjs",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"]
    }
  },
  "exclude": ["node_modules", "run"]
}
```

- [ ] **Step 5: 写入 config/config.default.js**

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
```

- [ ] **Step 6: 写入 config/config.prod.js**

```javascript
// server/config/config.prod.js
exports.keys = process.env.EGG_KEYS;
exports.jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
};
```

- [ ] **Step 7: 安装依赖**

```bash
cd server && npm install
```

- [ ] **Step 8: 提交**

```bash
git add server/
git commit -m "$(cat <<'EOF'
feat(server): initialize backend project with Egg.js

- Add package.json with core dependencies
- Add app.js for database initialization hook
- Add config files for dev and prod environments

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 数据库初始化

**Files:**
- Create: `server/database/init.js`
- Create: `server/database/init.sql`

- [ ] **Step 1: 写入 init.sql**

```sql
-- server/database/init.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  appearance TEXT,
  reference_image VARCHAR(255),
  reference_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 漫画表
CREATE TABLE IF NOT EXISTS comics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  style_prompt TEXT,
  cover_image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comic_id INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(200),
  layout_type INTEGER DEFAULT 4,
  script_content TEXT,
  page_image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

-- AI 配置表
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_comics_user ON comics(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_comic ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_ai_configs_user ON ai_configs(user_id);
```

- [ ] **Step 2: 写入 init.js**

```javascript
// server/database/init.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/comic.db');
const sqlPath = path.join(__dirname, 'init.sql');

// 确保目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 读取并执行初始化 SQL
const initSql = fs.readFileSync(sqlPath, 'utf-8');
db.exec(initSql);

module.exports = db;
```

- [ ] **Step 3: 测试数据库初始化**

```bash
cd server && node -e "const db = require('./database/init'); console.log('Tables:', db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all());"
```

预期输出：
```
Tables: [ { name: 'users' }, { name: 'characters' }, ... ]
```

- [ ] **Step 4: 提交**

```bash
git add server/database/
git commit -m "$(cat <<'EOF'
feat(server): add database initialization with SQLite

- Create init.sql with all table schemas
- Create init.js for database connection and setup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 数据库服务封装

**Files:**
- Create: `server/app/service/db.js`

- [ ] **Step 1: 写入 db.js**

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
}

module.exports = DbService;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/db.js
git commit -m "$(cat <<'EOF'
feat(server): add database service layer

- Add user CRUD methods for auth functionality

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: JWT 中间件

**Files:**
- Create: `server/app/middleware/jwt.js`

- [ ] **Step 1: 写入 jwt.js**

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
      const decoded = jwt.verify(token, app.config.jwt.secret);
      ctx.state.user = {
        id: decoded.id,
        username: decoded.username,
      };
      await next();
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'token 无效或已过期' };
    }
  };
};
```

- [ ] **Step 2: 提交**

```bash
git add server/app/middleware/jwt.js
git commit -m "$(cat <<'EOF'
feat(server): add JWT authentication middleware

- Verify token from HttpOnly cookie
- Set user info to ctx.state.user

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 认证服务

**Files:**
- Create: `server/app/service/auth.js`

- [ ] **Step 1: 写入 auth.js**

```javascript
// server/app/service/auth.js
const Service = require('egg').Service;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService extends Service {
  async register(username, password) {
    const { ctx, app } = this;

    // 检查用户名是否已存在
    const existingUser = await ctx.service.db.findUserByUsername(username);
    if (existingUser) {
      ctx.throw(400, '用户名已存在');
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const userId = await ctx.service.db.createUser(username, hashedPassword);

    // 生成 token
    const token = jwt.sign(
      { id: userId, username },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn }
    );

    return { userId, username, token };
  }

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

    return { userId: user.id, username: user.username, token };
  }

  setAuthCookie(token) {
    const { ctx, app } = this;
    ctx.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });
  }

  clearAuthCookie() {
    const { ctx } = this;
    ctx.cookies.set('token', null, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 0,
    });
  }
}

module.exports = AuthService;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/auth.js
git commit -m "$(cat <<'EOF'
feat(server): add authentication service

- Register with password hashing
- Login with password verification
- JWT token generation
- Cookie management methods

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 认证控制器

**Files:**
- Create: `server/app/controller/auth.js`

- [ ] **Step 1: 写入 auth.js**

```javascript
// server/app/controller/auth.js
const Controller = require('egg').Controller;

class AuthController extends Controller {
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
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

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
        },
      };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async logout() {
    const { ctx } = this;
    ctx.service.auth.clearAuthCookie();
    ctx.body = { message: '登出成功' };
  }

  async me() {
    const { ctx } = this;
    const user = await ctx.service.db.findUserById(ctx.state.user.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }
    ctx.body = { user };
  }
}

module.exports = AuthController;
```

- [ ] **Step 2: 提交**

```bash
git add server/app/controller/auth.js
git commit -m "$(cat <<'EOF'
feat(server): add auth controller with register/login/logout/me

- Input validation for register and login
- Set HttpOnly cookie for JWT token
- Return user info for /me endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 路由配置

**Files:**
- Create: `server/app/router.js`

- [ ] **Step 1: 写入 router.js**

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
};
```

- [ ] **Step 2: 启动后端测试**

```bash
cd server && npm run dev
```

预期输出：
```
... Egg started on http://127.0.0.1:7001
```

- [ ] **Step 3: 测试注册接口**

```bash
curl -X POST http://127.0.0.1:7001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

预期输出：
```json
{"user":{"id":1,"username":"testuser"}}
```

- [ ] **Step 4: 提交**

```bash
git add server/app/router.js
git commit -m "$(cat <<'EOF'
feat(server): add auth routes

- Public routes: register, login, logout
- Protected route: /me with JWT middleware

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 前端项目初始化

**Files:**
- Create: `web/package.json`
- Create: `web/index.html`
- Create: `web/vite.config.js`
- Create: `web/src/main.js`
- Create: `web/src/App.vue`

- [ ] **Step 1: 创建前端目录结构**

```bash
mkdir -p web/src/views web/src/api web/src/stores web/src/router
```

- [ ] **Step 2: 写入 package.json**

```json
{
  "name": "ai-comic-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mdi/font": "^7.4.47",
    "axios": "^1.7.0",
    "pinia": "^2.1.0",
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "vuetify": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 3: 写入 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI 漫画创作</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: 写入 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:7001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 5: 写入 src/main.js**

```javascript
// web/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
```

- [ ] **Step 6: 写入 src/App.vue**

```vue
<!-- web/src/App.vue -->
<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
```

- [ ] **Step 7: 安装依赖**

```bash
cd web && npm install
```

- [ ] **Step 8: 提交**

```bash
git add web/
git commit -m "$(cat <<'EOF'
feat(web): initialize frontend project with Vue 3 + Vuetify

- Add Vite configuration with proxy to backend
- Add main.js with Vuetify and Pinia setup
- Add App.vue as root component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 前端路由配置

**Files:**
- Create: `web/src/router/index.js`

- [ ] **Step 1: 写入 router/index.js**

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
git add web/src/router/
git commit -m "$(cat <<'EOF'
feat(web): add router with auth guard

- Check auth status before navigation
- Redirect unauthenticated users to login
- Prevent logged-in users from accessing login page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 认证 API 封装

**Files:**
- Create: `web/src/api/auth.js`

- [ ] **Step 1: 写入 api/auth.js**

```javascript
// web/src/api/auth.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // 携带 cookie
})

export default {
  async register(username, password) {
    const res = await api.post('/auth/register', { username, password })
    return res.data
  },

  async login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    return res.data
  },

  async logout() {
    const res = await api.post('/auth/logout')
    return res.data
  },

  async getMe() {
    const res = await api.get('/auth/me')
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add web/src/api/auth.js
git commit -m "$(cat <<'EOF'
feat(web): add auth API wrapper with axios

- Configure axios with credentials for cookie
- Wrap register, login, logout, getMe endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 认证状态管理

**Files:**
- Create: `web/src/stores/auth.js`

- [ ] **Step 1: 写入 stores/auth.js**

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
git commit -m "$(cat <<'EOF'
feat(web): add auth store with Pinia

- Manage user state and auth status
- Handle register, login, logout actions
- Check auth status on app load

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 登录/注册页面

**Files:**
- Create: `web/src/views/Login.vue`
- Create: `web/src/views/Comics.vue` (占位)

- [ ] **Step 1: 写入 views/Login.vue**

注意：此页面必须使用 `/frontend-design` 技能进行设计。

```vue
<!-- web/src/views/Login.vue -->
<template>
  <v-container fluid class="fill-height bg-grey-lighten-4">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>AI 漫画创作</v-toolbar-title>
          </v-toolbar>

          <v-tabs v-model="tab" grow>
            <v-tab value="login">登录</v-tab>
            <v-tab value="register">注册</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="tab">
              <!-- 登录表单 -->
              <v-window-item value="login">
                <v-form @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="loginForm.username"
                    label="用户名"
                    prepend-icon="mdi-account"
                    :rules="[v => !!v || '请输入用户名']"
                  />
                  <v-text-field
                    v-model="loginForm.password"
                    label="密码"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[v => !!v || '请输入密码']"
                  />
                  <v-alert v-if="authStore.error" type="error" class="mb-4">
                    {{ authStore.error }}
                  </v-alert>
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="authStore.loading"
                  >
                    登录
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- 注册表单 -->
              <v-window-item value="register">
                <v-form @submit.prevent="handleRegister">
                  <v-text-field
                    v-model="registerForm.username"
                    label="用户名"
                    prepend-icon="mdi-account"
                    :rules="[
                      v => !!v || '请输入用户名',
                      v => v.length >= 3 || '用户名至少 3 个字符'
                    ]"
                  />
                  <v-text-field
                    v-model="registerForm.password"
                    label="密码"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[
                      v => !!v || '请输入密码',
                      v => v.length >= 6 || '密码至少 6 位'
                    ]"
                  />
                  <v-text-field
                    v-model="registerForm.confirmPassword"
                    label="确认密码"
                    prepend-icon="mdi-lock-check"
                    type="password"
                    :rules="[
                      v => v === registerForm.password || '两次密码不一致'
                    ]"
                  />
                  <v-alert v-if="authStore.error" type="error" class="mb-4">
                    {{ authStore.error }}
                  </v-alert>
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="authStore.loading"
                  >
                    注册
                  </v-btn>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const tab = ref('login')
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '' })

async function handleLogin() {
  const success = await authStore.login(
    loginForm.value.username,
    loginForm.value.password
  )
  if (success) {
    router.push('/comics')
  }
}

async function handleRegister() {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    return
  }
  const success = await authStore.register(
    registerForm.value.username,
    registerForm.value.password
  )
  if (success) {
    router.push('/comics')
  }
}
</script>
```

- [ ] **Step 2: 写入 views/Comics.vue (占位)**

```vue
<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col>
        <h1>漫画列表</h1>
        <p>欢迎, {{ authStore.user?.username }}</p>
        <v-btn @click="logout" color="error">登出</v-btn>
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

- [ ] **Step 3: 启动前端测试**

```bash
cd web && npm run dev
```

- [ ] **Step 4: 手动测试完整流程**

1. 访问 http://localhost:3000
2. 应自动跳转到登录页
3. 切换到注册 tab，注册新用户
4. 注册成功后应跳转到漫画列表页
5. 点击登出，应跳回登录页
6. 用刚才注册的账号登录，应成功

- [ ] **Step 5: 提交**

```bash
git add web/src/views/
git commit -m "$(cat <<'EOF'
feat(web): add Login and Comics placeholder pages

- Login page with register/login tabs
- Form validation and error display
- Comics page with logout button (placeholder)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: 更新项目文档

**Files:**
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: 写入 CLAUDE.md**

```markdown
# CLAUDE.md

AI 漫画创作平台 - 前后端分离架构。

## 项目概述

用户通过 AI 生成连载漫画，支持角色库管理、分镜脚本生成、漫画图片生成。

## 开发命令

\`\`\`bash
# 后端开发 (server 目录)
cd server && npm run dev      # 启动开发服务器 (端口 7001)
cd server && npm test         # 运行测试

# 前端开发 (web 目录)
cd web && npm run dev         # 启动开发服务器 (端口 3000，代理到后端 7001)
cd web && npm run build       # 构建生产版本
\`\`\`

## 架构

### 后端 (server/)
- **框架**: Egg.js
- **数据库**: SQLite (better-sqlite3)，初始化脚本在 `database/init.js`
- **认证**: JWT + HttpOnly Cookie，中间件在 `app/middleware/jwt.js`

### 前端 (web/)
- **框架**: Vue 3 + Vite
- **UI**: Vuetify (Material Design)
- **状态管理**: Pinia
- **路由**: Vue Router

## 环境变量

生产环境必须设置:
- `EGG_KEYS`: 应用密钥
- `JWT_SECRET`: JWT 签名密钥

## 开发约束

**前端开发必须使用 \`frontend-design\` 技能**：所有前端页面和组件开发时，必须调用 \`/frontend-design\` 技能确保设计质量。
```

- [ ] **Step 2: 写入 README.md**

```markdown
# AI 漫画创作平台

AI 驱动的漫画创作工具，支持连载漫画生成。

## 功能特性

- AI 生成漫画内容（文本 + 图像）
- 角色库管理，保证角色一致性
- 连载模式，章节间保持连续性
- 传统分镜格布局

## 快速开始

\`\`\`bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd web && npm install

# 启动后端 (端口 7001)
cd server && npm run dev

# 启动前端 (端口 3000)
cd web && npm run dev
\`\`\`

## 技术栈

- **前端**: Vue 3 + Vite + Vuetify + Pinia
- **后端**: Egg.js + SQLite + JWT
- **AI**: OpenAI SDK (支持多供应商)
```

- [ ] **Step 3: 提交**

```bash
git add CLAUDE.md README.md
git commit -m "$(cat <<'EOF'
docs: add project documentation

- Add CLAUDE.md with development guide
- Add README.md with quick start guide

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## 完成检查

- [ ] 后端可正常启动，端口 7001
- [ ] 前端可正常启动，端口 3000
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 用户登出功能正常
- [ ] 未登录访问 /comics 自动跳转到登录页
- [ ] 已登录访问 /login 自动跳转到漫画列表

---

**Phase 1 完成标志**：用户可以注册、登录、登出，认证流程完整可用。
