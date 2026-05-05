---
name: image-storage-config
description: 图片存储配置设计 - 支持 OSS 和直链两种访问模式
type: project
---

# 图片存储配置设计

## 概述

为 Grsai Provider 提供两种图片访问模式配置：
1. **OSS 模式**：上传到腾讯云 COS，返回公网 URL
2. **直链模式**：本地存储，通过认证接口访问（URL 带 token）

## 需求

1. 后台管理新增"图片存储"Tab，配置图片访问模式
2. OSS 配置从配置文件迁移到数据库
3. 直链模式需要认证访问，token 5 分钟有效
4. 仅影响 Grsai Provider 上传参考图的场景

## 技术方案

采用简单 JWT Token 方案：复用现有 JWT 基础设施生成短期 token，无需数据库存储 token。

## 数据库设计

复用 `ai_configs` 表，新增一条记录：

```sql
INSERT INTO ai_configs (user_id, type, provider, api_key, base_url, model, api_format)
VALUES (NULL, 'image_storage', '', '{"accessMode":"direct","ossSecretId":"","ossSecretKey":"","ossBucket":"","ossRegion":"","ossPublicBaseUrl":""}', '', '', '');
```

存储字段（JSON 存在 api_key 字段）：
- `accessMode`: "direct" | "oss"
- `ossSecretId`: 腾讯云 Secret ID
- `ossSecretKey`: 腾讯云 Secret Key
- `ossBucket`: COS Bucket 名称
- `ossRegion`: COS Region
- `ossPublicBaseUrl`: 公网域名（可选）

### 配置迁移

应用启动时：
1. 检查数据库是否存在 `type='image_storage'` 配置
2. 如果不存在，从 `config.tencentCos` 读取并写入数据库
3. 保留配置文件作为首次部署的默认值

## 后端 API 设计

### 新增接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/storage-config` | 获取图片存储配置 | 登录 |
| PUT | `/api/storage-config` | 更新图片存储配置 | 管理员 |
| GET | `/api/images/:type/:filename` | 认证访问图片 | token 参数 |

### 认证图片访问接口

**请求**：`GET /api/images/characters/xxx.png?token=xxx`

**Token 生成**：
```javascript
jwt.sign(
  { type: 'image_access', path: `${type}/${filename}` },
  config.jwt.secret,
  { expiresIn: '5m' }
)
```

**响应**：
- 验证通过：返回图片文件（Content-Type: image/png）
- 验证失败：返回 401

### 修改接口

`object-storage.js` 服务变更：
- 从数据库读取配置
- 新增 `generateDirectAccessUrl()` 方法
- `uploadReferenceImage()` 根据配置决定上传 OSS 或生成直链 URL

## 前端设计

### 路由变更

| 路径 | 名称 | 组件 | 变更 |
|------|------|------|------|
| `/admin/storage` | AdminStorage | AdminStorage.vue | 新增 |

### 页面结构

```
Admin.vue（后台管理布局）
├── 顶部 Tab 导航
│   ├── AI 配置
│   ├── 用户管理
│   └── 图片存储  ← 新增
└── <router-view>
```

### 图片存储 Tab 界面

```
┌─────────────────────────────────────────────────────────┐
│  图片访问模式                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ OSS 上传（需要配置腾讯云 COS）                │   │
│  │  ● 直链访问（本地存储 + 认证访问）               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [OSS 配置 - 仅 OSS 模式显示]                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Secret ID:    [__________________]             │   │
│  │  Secret Key:   [__________________]             │   │
│  │  Bucket:       [__________________]             │   │
│  │  Region:       [__________________]             │   │
│  │  公网域名:     [__________________] (可选)      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [保存配置]                 │
└─────────────────────────────────────────────────────────┘
```

## 核心流程变更

### ai-image.js 中 uploadReferenceImages 逻辑

```
当前配置 = 从数据库读取 image_storage 配置

accessMode = 'oss' ?
  ├── 是：调用 objectStorage.uploadReferenceImage() 上传到 COS
  │        返回公网 URL
  │
  └── 否：调用 objectStorage.generateDirectAccessUrl()
           返回 /api/images/characters/xxx.png?token=xxx
```

### 静态文件配置

移除或限制 Egg.js 静态文件公开访问：
- 当前：`/images/*` 公开访问
- 改为：移除静态文件配置，所有图片通过 `/api/images/*` 认证访问

## 实现范围

- [ ] 数据库：复用 ai_configs 表，新增 image_storage 类型
- [ ] 数据库迁移：启动时从配置文件迁移 OSS 配置
- [ ] 后端：新增 storage-config controller
- [ ] 后端：新增 images controller（认证访问）
- [ ] 后端：修改 object-storage service
- [ ] 后端：修改 ai-image service
- [ ] 前端：新增 AdminStorage.vue
- [ ] 前端：修改 Admin.vue 添加 Tab
- [ ] 前端：新增 api/storage-config.js
- [ ] 配置：移除或保留静态文件配置

## Why

当前 Grsai Provider 必须将参考图上传到 OSS 才能使用，增加了外部依赖和配置成本。直链模式允许用户在不配置 OSS 的情况下使用 Grsai Provider。

## How to apply

实现时按以下顺序进行：
1. 数据库变更（复用表、迁移逻辑）
2. 后端 service 变更（object-storage、ai-image）
3. 后端 API（storage-config、images）
4. 前端页面和路由
5. 移除静态文件公开访问
6. 测试验证
