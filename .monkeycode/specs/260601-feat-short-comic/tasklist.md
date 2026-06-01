# 短篇漫画功能任务清单

## 项目概述
方案C：comics 表加 `type` 字段，自动创建 chapter 记录，生成单张漫画图片。

## 任务分解

### 阶段一：数据库 (0.5 天)

- [ ] **TASK-001**: comics 表新增 type 字段
  - 文件: `server/database/init.sql`
  - 内容: `ALTER TABLE comics ADD COLUMN type VARCHAR(20) DEFAULT 'normal';`

- [ ] **TASK-002**: db.js 新增方法
  - 文件: `server/app/service/db.js`
  - 内容: 
    - 新增 `findChapterByComicId` 方法
    - `updateComic` 支持 type 字段

### 阶段二：后端接口 (1.5 天)

- [ ] **TASK-003**: 创建短篇漫画 Controller
  - 文件: `server/app/controller/shortComic.js`
  - 内容: get, create, update, optimizePrompt, generateScript, generateImage

- [ ] **TASK-004**: 配置路由
  - 文件: `server/app/router.js`
  - 内容: 新增 /api/short-comic 相关路由

- [ ] **TASK-005**: AI 文本服务新增方法
  - 文件: `server/app/service/ai-text.js`
  - 内容: optimizePrompt, generateShortComicScript

### 阶段三：前端页面 (2 天)

- [ ] **TASK-006**: 创建短篇漫画页面
  - 文件: `web/src/views/CreateShortComic.vue`
  - 内容: Tab 布局 + 三步骤表单

- [ ] **TASK-007**: 配置路由
  - 文件: `web/src/router/index.js`
  - 内容: /short-comic/create 和 /short-comic/:id/edit

### 阶段四：列表集成 (1 天)

- [ ] **TASK-008**: Comics.vue 添加入口按钮
  - 文件: `web/src/views/Comics.vue`
  - 内容: 顶部"创建短篇漫画"按钮 + 跳转逻辑

- [ ] **TASK-009**: ComicCard.vue 添加短篇标签
  - 文件: `web/src/components/business/ComicCard.vue`
  - 内容: type=short 时显示"短篇"标签

### 阶段五：测试 (1 天)

- [ ] **TASK-010**: 功能测试
  - 内容: 创建、编辑、列表展示、图片生成

## 总计: 6 天

## 关键调整

1. 移除 images 字段，复用 page_image 存储单张图片
2. 生成图片接口改为 generate-image（单张）
3. 完成后自动跳转列表页

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-06-01 | 1.0 | 初始任务清单 | AI Agent |
| 2026-06-01 | 1.1 | 改为方案C | AI Agent |
| 2026-06-01 | 1.2 | 简化为单张图片 | AI Agent |
