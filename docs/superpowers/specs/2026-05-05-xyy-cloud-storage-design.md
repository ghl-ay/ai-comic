# 咸鱼云存储集成设计文档

## 概述

为图片存储新增咸鱼云存储提供商，同时重构配置表架构，使其更加通用。

## 目标

1. 支持咸鱼云存储作为图片存储提供商
2. 重构配置表，从 `ai_configs` 迁移到通用的 `configs` 表
3. 采用 Provider 模式，便于未来扩展其他存储提供商

## 数据库设计

### 新配置表结构

```sql
CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
);
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `category` | VARCHAR(50) | 配置类别：`ai` 或 `storage` |
| `key` | VARCHAR(50) | 配置项标识，如 `default`、`tencent-cos`、`xyy-cloud` |
| `value` | TEXT | JSON 格式的配置值 |

### 配置数据示例

**存储配置：**

| category | key | value |
|----------|-----|-------|
| `storage` | `default` | `{"provider": "xyy-cloud"}` |
| `storage` | `tencent-cos` | `{"secretId": "xxx", "secretKey": "xxx", "bucket": "xxx", "region": "xxx"}` |
| `storage` | `xyy-cloud` | `{"username": "xxx", "password": "xxx", "apiBaseUrl": "https://your-api-server.example.com", "publicBaseUrl": "https://your-image-server.example.com"}` |

**AI 配置：**

| category | key | value |
|----------|-----|-------|
| `ai` | `default` | `{"provider": "openai"}` |
| `ai` | `openai` | `{"apiKey": "xxx", "baseUrl": "xxx", "model": "gpt-4"}` |

### 数据迁移

从 `ai_configs` 表迁移数据：

1. `type='image_storage'` 的记录 → `category='storage'`, `key='tencent-cos'`
2. 创建 `storage.default` 记录，根据 `accessMode` 设置初始提供商
3. AI 相关记录 → `category='ai'`
4. 迁移完成后删除 `ai_configs` 表

## 存储服务架构

### Provider 模式

每个存储提供商实现统一接口：

```javascript
interface StorageProvider {
  name: string;
  upload(buffer: Buffer, filename: string): Promise<string>;
}
```

### 文件结构

```
server/app/service/storage/
├── index.js           # 存储服务入口
├── config.js          # 存储配置服务
└── providers/
    ├── base.js        # 基类
    ├── direct.js      # 本地直链模式
    ├── tencent-cos.js # 腾讯云 COS
    └── xyy-cloud.js   # 咸鱼云存储
```

### 咸鱼云存储 Provider

**配置参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `username` | string | — | 登录用户名（必填） |
| `password` | string | — | 登录密码（必填） |
| `apiBaseUrl` | string | `https://your-api-server.example.com` | API 基础地址 |
| `publicBaseUrl` | string | `https://your-image-server.example.com` | 公开访问域名 |

**上传流程：**

1. 使用 `username` 和 `password` 登录获取 `token` 和 `uid`
2. 生成唯一文件名（SHA256 hash + 时间戳）
3. 上传到 `/api/diskFile/{uid}/file/images/{filename}`
4. 返回公开访问 URL：`{publicBaseUrl}/{filename}`

**登录逻辑：**

```
GET {apiBaseUrl}/api/user/token?user={username}&passwd={password}
→ 返回 token

GET {apiBaseUrl}/api/user (Header: Token: {token})
→ 返回用户信息，包含 uid
```

**上传逻辑：**

```
PUT {apiBaseUrl}/api/diskFile/{uid}/file/images
Content-Type: multipart/form-data
Body: file 字段包含文件内容，文件名通过 multipart 的 filename 属性传递
```

## API 设计

### 通用配置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/configs/:category/:key` | 获取配置 |
| PUT | `/api/configs/:category/:key` | 更新配置 |

**获取存储默认配置：**
```
GET /api/configs/storage/default
→ {"provider": "xyy-cloud"}
```

**获取咸鱼云配置：**
```
GET /api/configs/storage/xyy-cloud
→ {"username": "xxx", "password": "xxx", "apiBaseUrl": "xxx", "publicBaseUrl": "xxx"}
```

**更新咸鱼云配置：**
```
PUT /api/configs/storage/xyy-cloud
Body: {"username": "xxx", "password": "xxx", "apiBaseUrl": "xxx", "publicBaseUrl": "xxx"}
```

**切换默认提供商：**
```
PUT /api/configs/storage/default
Body: {"provider": "tencent-cos"}
```

### 权限

所有配置 API 需要管理员权限。

## 前端设计

### 存储配置页面

**页面结构：**

1. **提供商选择** — 下拉框选择默认提供商
2. **提供商配置区域** — 根据选择显示对应配置表单

**提供商配置表单：**

| 提供商 | 配置字段 |
|--------|----------|
| `direct` | 无需配置 |
| `tencent-cos` | SecretId、SecretKey、Bucket、Region |
| `xyy-cloud` | 用户名、密码、API地址、访问域名 |

**交互逻辑：**

- 切换提供商时，保存当前配置并加载新提供商的配置
- 新建提供商配置时，预填默认值

## 文件变更清单

### 新增文件

```
server/
├── database/migrations/
│   └── 001_create_configs_table.js
├── app/service/
│   ├── config.js
│   └── storage/
│       ├── index.js
│       ├── config.js
│       └── providers/
│           ├── base.js
│           ├── direct.js
│           ├── tencent-cos.js
│           └── xyy-cloud.js
├── app/controller/
│   └── configs.js
```

### 修改文件

```
server/
├── app/router.js
├── database/init.js

web/
└── src/views/StorageConfig.vue
```

### 删除文件

```
server/
├── app/service/object-storage.js
├── app/service/storage-config.js
├── app/controller/storage-config.js
```

## 实施步骤

1. 创建 `configs` 表的迁移脚本
2. 实现通用配置服务 `config.js`
3. 实现存储服务 Provider 架构
4. 实现咸鱼云存储 Provider
5. 实现配置 API Controller
6. 更新路由
7. 迁移现有数据
8. 更新前端配置页面
9. 测试验证
