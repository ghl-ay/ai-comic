# CLAUDE.md

AI 漫画创作平台 - 前后端分离架构。

## 项目概述

用户通过 AI 生成连载漫画，支持角色库管理、分镜脚本生成、漫画图片生成。

## 开发命令

```bash
# 后端开发 (server 目录)
cd server && npm run dev      # 启动开发服务器 (端口 7001)
cd server && npm test         # 运行测试

# 前端开发 (web 目录)
cd web && npm run dev         # 启动开发服务器 (端口 3000，代理到后端 7001)
cd web && npm run build       # 构建生产版本
```

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

**前端开发必须使用 `frontend-design` 技能**：所有前端页面和组件开发时，必须调用 `/frontend-design` 技能确保设计质量。

## 数据库操作约束

1. **禁止删除数据库文件**
   - 严禁执行 `rm *.db`、`rm *.sqlite` 等删除数据库文件的操作
   - 数据库文件必须通过 SQL 命令操作，不得直接删除

2. **字段变更必须使用 ALTER TABLE**
   - 新增字段：`ALTER TABLE xxx ADD COLUMN yyy TYPE`
   - 不得通过删除重建表的方式添加字段

3. **迁移必须是增量的**
   - 所有数据库变更必须支持幂等执行（重复执行不报错）
   - 使用 `IF NOT EXISTS`、`IF EXISTS` 等防护语句

4. **执行前必须确认影响范围**
   - 评估操作是否会导致数据丢失
   - 破坏性操作必须先告知用户并获得确认

## 数据安全约束

5. **禁止删除用户数据**
   - 用户生成的内容（漫画、角色、配置等）不得删除
   - 如需结构性变更，必须保留原有数据

6. **变更前必须备份**
   - 执行可能导致数据丢失的操作前，先创建备份
   - 备份文件命名包含时间戳

7. **优先使用非破坏性方案**
   - 能修改的不删除
   - 能追加的不覆盖
   - 能迁移的不重建
