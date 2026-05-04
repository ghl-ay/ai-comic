---
name: admin-permission-system
description: 管理员权限系统设计 - 区分管理员和普通用户，后台管理页面
type: project
---

# 管理员权限系统设计

## 概述

实现账号权限管理，区分管理员和普通用户。管理员可以进入后台管理页面，管理 AI 配置和用户。

## 需求

1. 用户表区分管理员和普通用户
2. 首个注册用户自动成为管理员
3. 只有管理员能进入后台管理页面
4. 后台管理包含 AI 配置和用户管理两个功能
5. 原 AI 配置入口改为后台管理入口

## 技术方案

采用简单布尔字段方案：用户表添加 `is_admin` 字段。

## 数据库设计

### 用户表变更

```sql
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;
```

### 操作日志表（预留第二阶段）

```sql
CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 后端 API 设计

### 新增接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取当前用户信息（含 is_admin） | 登录 |
| GET | `/api/admin/users` | 获取用户列表 | 管理员 |
| PUT | `/api/admin/users/:id/admin` | 设置/取消管理员 | 管理员 |
| GET | `/api/admin/stats` | 获取统计数据（预留） | 管理员 |

### 修改逻辑

1. 注册时检查是否首个用户，自动设置 `is_admin = 1`
2. JWT 中间件传递 `is_admin` 到 `ctx.state.user`

### 中间件

```javascript
// app/middleware/admin.js
module.exports = () => {
  return async function adminRequired(ctx, next) {
    if (!ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = { error: '需要管理员权限' };
      return;
    }
    await next();
  };
};
```

## 前端设计

### 路由变更

| 路径 | 名称 | 组件 | 变更 |
|------|------|------|------|
| `/admin` | Admin | Admin.vue | 新增（后台管理布局） |
| `/admin/ai-config` | AdminAiConfig | AdminAiConfig.vue | 新增（从 /settings/ai 迁移） |
| `/admin/users` | AdminUsers | AdminUsers.vue | 新增（用户管理） |
| `/settings/ai` | AiConfig | — | 删除 |

### 页面结构

```
Admin.vue（后台管理布局）
├── 侧边栏/Tab 导航
│   ├── AI 配置
│   └── 用户管理
└── <router-view>（子页面内容）
```

### 导航栏

- 原"AI 配置"入口改为"后台管理"
- 仅管理员可见

## 权限控制流程

### 后端

1. JWT 中间件解析 token，将 `is_admin` 存入 `ctx.state.user`
2. 管理员接口添加 `adminRequired` 中间件
3. 返回 403 错误给非管理员

### 前端

1. 登录成功后获取用户信息，存储 `is_admin` 到 Pinia store
2. 路由守卫检查 `/admin/*` 路由，非管理员跳转到首页
3. 导航栏根据 `is_admin` 控制显示"后台管理"入口

### 流程图

```
用户访问 /admin
    ↓
前端路由守卫检查 authStore.isAdmin
    ↓
非管理员 → 跳转到 /comics
    ↓
管理员 → 渲染 Admin.vue
    ↓
用户点击"用户管理"
    ↓
前端请求 GET /api/admin/users
    ↓
后端 adminRequired 中间件验证
    ↓
非管理员 → 403 错误
管理员 → 返回用户列表
```

## 第一阶段范围

- [x] 用户表添加 `is_admin` 字段
- [x] 首个注册用户自动成为管理员
- [x] 后台管理页面框架（带 tab 布局）
- [x] AI 配置 tab（迁移现有功能）
- [x] 用户管理 tab（查看用户列表、设置/取消管理员）

## 后续阶段

- 操作日志模块
- 数据统计模块

## Why

当前系统所有登录用户都可以访问 AI 配置页面，缺乏权限控制。需要区分管理员和普通用户，让管理员可以管理 AI 配置和用户。

## How to apply

实现时按以下顺序进行：
1. 数据库变更（添加字段、迁移脚本）
2. 后端中间件和 API
3. 前端路由和页面
4. 测试验证
