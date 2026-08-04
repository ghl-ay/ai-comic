# Docker 一键部署方案

将 AI 漫画创作平台（前端 Vue 3 + Vite，后端 Egg.js + SQLite）打包为**单容器** Docker 镜像，通过 `docker compose up -d --build` 一键启动。

## 方案要点

| 要点 | 说明 |
|------|------|
| 无 Nginx | 前端 dist 进 `app/public`，由 Egg 内置 static 托管 |
| 单容器 | 同一 Node 进程服务静态资源 + API |
| 对外 80 | 宿主 `80` → 容器内 Egg `7001` |
| 数据持久化 | SQLite / 图片挂到宿主机 `./data/`，与代码目录分离 |
| 前端零改动 | API 使用相对路径 `/api`、`/images` |
| 运行约束 | `USER node`（uid 1000）、`workers=1`、HEALTHCHECK |
| 账号 | 无默认账号；**首个注册用户**自动成为管理员 |

## 架构

```
┌──────────────────────────────────────────────────────┐
│  容器 node:20-slim                                   │
│  宿主 0.0.0.0:80  ──►  容器 :7001                    │
│  Egg (workers=1, USER node)                          │
│                                                      │
│  路由                                                │
│  ├─ 静态前端     /app/app/public/   ← 构建期写入 dist │
│  ├─ API          /api/*                              │
│  ├─ 图片(鉴权)   /images/*                           │
│  └─ SPA fallback /*  → index.html                    │
│                                                      │
│  代码（镜像内，勿 volume 覆盖）                        │
│  └─ /app/database/{init.js,init.sql,seeds/}          │
│                                                      │
│  数据（volume 持久化）                                 │
│  ├─ SQLite  /app/data/database/comic.db              │
│  └─ 图片    /app/public/images/                      │
└──────────────────────────────────────────────────────┘
         ▲ bind                         ▲ bind
  ./data/database                ./data/images
  (comic.db)                     (characters/, comics/)
```

### 路径对照

| 用途 | 容器路径 | 宿主机路径 | 可否 volume |
|------|----------|------------|-------------|
| 初始化脚本 / SQL / seeds | `/app/database/*` | （仅在镜像内） | 否（会盖掉 init） |
| SQLite 库文件 | `/app/data/database/comic.db` | `./data/database/comic.db` | 是 |
| 用户生成图片 | `/app/public/images/` | `./data/images/` | 是 |
| 前端 SPA | `/app/app/public/` | （构建写入镜像） | 否 |

环境变量：`DB_PATH=/app/data/database/comic.db`（镜像 ENV 与 compose 一致）。

## 文件清单

### 部署相关（仓库根）

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 三阶段：前端构建 → 后端依赖 → 运行 |
| `docker-compose.yml` | 单服务、`80:7001`、volume、healthcheck |
| `.dockerignore` | 排除 `**/node_modules`、`.env`、日志等 |
| `.env` | `EGG_KEYS` / `JWT_SECRET`（勿提交） |

### 业务侧改动

| 文件 | 改动 |
|------|------|
| `server/config/config.default.js` | `static.prefix = '/'`；`database.path` 读 `DB_PATH` |
| `server/database/init.js` | 库路径读 `DB_PATH`，自动 `mkdir` 父目录 |
| `server/app/router.js` | 末尾 SPA fallback 通配路由 |
| `server/app/controller/home.js` | fallback 控制器 |

运行时数据目录 `./data/` 由 `.gitignore` 忽略，不入库。

## 1. Dockerfile

完整内容以仓库根目录 `Dockerfile` 为准。设计原则：

### 三阶段

1. **build-web**（`node:20-alpine`）  
   - 先 `package*.json` + `npm ci`，再源码 + `npm run build`  
   - 产出 `/web/dist`

2. **deps**（`node:20-slim`）  
   - 安装 `python3 make g++`（better-sqlite3 无 prebuild 时的编译兜底）  
   - `npm ci --omit=dev`  
   - 在 Linux 内安装依赖，保证 native 模块为 ELF  
   - 说明：多数平台会优先下载 prebuild；编译链为兜底，不保证每次源码编译

3. **runtime**（`node:20-slim`）  
   - `ENV NODE_ENV=production` + `DB_PATH=...`  
   - **COPY 顺序**：
     ```dockerfile
     COPY server/ ./
     COPY --from=deps /app/node_modules ./node_modules
     COPY --from=build-web /web/dist /app/app/public
     ```
     先源码、后 `node_modules`，避免宿主 macOS 的 native 模块覆盖 Linux 产物  
   - 预创建数据/日志目录，`chown node` 后 `USER node`  
   - `HEALTHCHECK`：Node 探 `http://127.0.0.1:7001/`  
   - `CMD`：`egg-scripts start --no-daemon --workers=1`

### 为何 workers=1

本方案为单容器 + SQLite 单文件：多 worker 抢同一库文件收益有限，且容器内 cluster 与副本扩展叠床架屋。固定 1 worker；吞吐不足时优先加机器或换外部数据库。

## 2. docker-compose.yml

```yaml
services:
  server:
    build: .
    environment:
      EGG_KEYS: ${EGG_KEYS}
      JWT_SECRET: ${JWT_SECRET}
      DB_PATH: /app/data/database/comic.db
    volumes:
      - ./data/database:/app/data/database   # 仅数据，禁止挂 /app/database
      - ./data/images:/app/public/images
    ports:
      - "80:7001"
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://127.0.0.1:7001/',r=>process.exit(r.statusCode&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 45s
```

- 密钥来自 `.env`  
- 空数据卷首次启动时由 `init.js` 建表并写入风格预设种子  
- 无预置用户

## 3. .dockerignore

```
**/node_modules
**/.git
**/.gitignore
**/*.log
**/logs
**/run
**/typings
web/dist
server/database/*.db
data
.dockerignore
.env
```

使用 `**/node_modules`，确保排除 `server/node_modules` 等子目录。

## 4. 业务配置

```js
// config.default.js
exports.static = { prefix: '/' };
exports.database = {
  path: process.env.DB_PATH || './database/comic.db',
};

// init.js
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/comic.db');
// 自动 mkdir 父目录后 open
```

SPA：`home.fallback` + `router.get('/(.*)', ...)` 注册在路由最后；`/api`、`/images` 前缀返回 404，避免误吞。

## 一键启动

```bash
# 1. 生成密钥（勿提交 .env）
echo "EGG_KEYS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 16)" > .env

# 2. 构建并启动
docker compose up -d --build --force-recreate
```

访问：

- 本机：http://localhost  
- 局域网/公网：http://\<主机IP\>（防火墙/安全组放行 80）

| 项 | 说明 |
|----|------|
| 默认账号密码 | 无 |
| 管理员 | 第一个注册成功的用户 |
| 后续用户 | 普通用户，可由管理员提权 |

## 验证

```bash
docker compose ps
# 期望：Up (healthy)，PORTS 含 0.0.0.0:80->7001/tcp

curl -s -o /dev/null -w "%{http_code}\n" http://localhost/              # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/comics        # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/not-exist # 404
```

1. 浏览器注册 → 首用户为管理员  
2. `docker compose restart` 后 `./data/database/comic.db` 与图片仍在  

## 数据备份与迁移

```bash
# 备份
tar czf ai-print-data-$(date +%Y%m%d).tgz data/

# 迁移：新机器放好代码与 .env 后
# 1) 解压 data/ 到项目根
# 2) docker compose up -d --build
```

只迁 `./data/` 即可恢复本地库与图片。若启用腾讯云 COS，云端对象需按 COS 侧策略另行备份。

## 注意事项

| 项 | 说明 |
|----|------|
| 端口冲突 | 宿主 80 被占用时改 compose 为 `"3000:7001"` 等 |
| Linux 写权限 | 容器 uid 1000；若 EACCES：`chown -R 1000:1000 data` |
| 镜像未生效 | `docker compose down && docker compose up -d --build --force-recreate` |
| volume 边界 | 勿将数据卷挂到 `/app/database`（会覆盖 init 脚本） |
| native 模块 | 依赖必须在镜像 Linux 环境安装，勿拷入宿主 `node_modules` |
| 可选 COS | `TENCENT_COS_*` 环境变量 |
| HTTPS | 本方案仅 HTTP 80；需要时可前挂 Caddy/Nginx |
