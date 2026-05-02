# AI 漫画创作平台

AI 驱动的漫画创作工具，支持连载漫画生成。

## 功能特性

- AI 生成漫画内容（文本 + 图像）
- 角色库管理，保证角色一致性
- 连载模式，章节间保持连续性
- 传统分镜格布局

## 快速开始

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd web && npm install

# 启动后端 (端口 7001)
cd server && npm run dev

# 启动前端 (端口 3000)
cd web && npm run dev
```

## 技术栈

- **前端**: Vue 3 + Vite + Vuetify + Pinia
- **后端**: Egg.js + SQLite + JWT
- **AI**: OpenAI SDK (支持多供应商)
