# 阶段1: 构建前端
FROM node:20-alpine AS build-web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 阶段2: 安装后端依赖（Linux 下编译 better-sqlite3）
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci --omit=dev

# 阶段3: 运行
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production \
    DB_PATH=/app/data/database/comic.db

# 先拷源码，再覆盖 node_modules：
# 避免构建上下文里的宿主（macOS）native 模块盖掉 deps 阶段的 Linux 产物
COPY server/ ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build-web /web/dist /app/app/public

# 数据目录、Egg 运行目录；node 用户（uid 1000）非 root 运行
RUN mkdir -p \
      /app/data/database \
      /app/public/images/characters \
      /app/public/images/comics \
      /app/logs \
      /app/run \
  && chown -R node:node /app

USER node

EXPOSE 7001

# slim 无 curl/wget，用 Node 做存活探测
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:7001/',r=>process.exit(r.statusCode&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))"]

# workers=1：容器内避免 cluster 多进程放大崩溃噪音
CMD ["./node_modules/.bin/egg-scripts", "start", "--no-daemon", "--workers=1", "--title=ai-comic-server"]
