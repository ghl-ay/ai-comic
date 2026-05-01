# AI 漫画站点设计文档

## 项目概述

AI 漫画创作平台，用户通过提示词生成连载漫画。核心特性：
- AI 生成漫画内容（文本模型 + 图像模型）
- 角色库管理，保证角色一致性
- 连载模式，章节间保持风格和角色连续性
- 传统分镜格布局

---

## 核心业务流程

### 1. 创建角色

```
用户填写角色信息（名称、描述、外观描述）
     ↓
系统组合提示词调用图片 AI 生成角色参考图
     ↓
展示参考图给用户预览
     ↓
[用户可重新生成] 不满意可调整描述重新生成
     ↓
用户确认 → 保存角色到角色库（含参考图）
```

角色创建时必须生成参考图，用于后续章节图片生成时保持角色一致性。

### 2. 创建漫画与章节

```
用户创建漫画（标题、风格提示词）
     ↓
创建章节 → 选择分镜布局（4格/6格/8格）
     ↓
选择本章出场角色（从角色库勾选）
     ↓
进入创作流程
```

### 3. 章节创作（核心流程）

```
用户输入章节提示词（如"小明在公园遇到一只迷路的小狗"）
     ↓
调用文本 AI 生成分镜脚本（JSON 格式）
   - 根据 layout_type 生成对应数量的分镜
   - 每格包含：场景描述、对白、出场角色
   - 如有上一章内容，保持剧情连贯
     ↓
返回分镜脚本给用户确认/编辑
     ↓
用户确认 → 准备图片生成参数：
   - 漫画风格提示词
   - 分镜布局类型
   - 分镜脚本 JSON
   - 角色参考图列表
   - 上一章节漫画图片（如有）
     ↓
调用图片 AI → 返回整页漫画图片（一次性生成）
     ↓
保存图片，章节状态更新为 completed
```

### 4. 连载更新

```
用户在已有漫画下创建新章节
     ↓
系统自动带入该漫画已有的角色库（方便选择）
     ↓
创作流程同上，图片生成时传入上一章节图片保持连续性
```

---

## 数据模型

### 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | VARCHAR(50) | 用户名，唯一 |
| password | VARCHAR(255) | 密码哈希 |
| created_at | DATETIME | 创建时间 |

### 角色表 (characters)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 所属用户 |
| name | VARCHAR(100) | 角色名称 |
| description | TEXT | 角色描述（性格、背景等） |
| appearance | TEXT | 外观描述（用于图片生成提示词） |
| reference_image | VARCHAR(255) | AI 生成的角色参考图路径（必填） |
| reference_prompt | TEXT | 生成参考图时使用的提示词 |
| created_at | DATETIME | 创建时间 |

### 漫画表 (comics)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 所属用户 |
| title | VARCHAR(200) | 漫画标题 |
| style_prompt | TEXT | 风格提示词（如"日系黑白漫画"） |
| cover_image | VARCHAR(255) | 封面图路径（可选，取第一章图片） |
| status | VARCHAR(20) | 状态：draft/publishing/completed |
| created_at | DATETIME | 创建时间 |

### 章节表 (chapters)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| comic_id | INTEGER | 所属漫画 |
| chapter_number | INTEGER | 章节序号 |
| title | VARCHAR(200) | 章节标题 |
| layout_type | INTEGER | 分镜布局类型（4/6/8） |
| script_content | TEXT | 分镜脚本内容（JSON） |
| page_image | VARCHAR(255) | 生成的整页漫画图片路径 |
| status | VARCHAR(20) | 状态：draft/script_ready/completed |
| created_at | DATETIME | 创建时间 |

### 分镜脚本 JSON 格式

```json
{
  "title": "迷路的小狗",
  "panels": [
    {
      "number": 1,
      "scene": "公园入口，阳光明媚，绿树成荫",
      "dialogue": "小明：今天天气真好，适合散步。",
      "characters": [1, 2]
    },
    {
      "number": 2,
      "scene": "公园小径，一只小狗蹲在路边",
      "dialogue": "小明：咦？这只小狗好像迷路了。",
      "characters": [1]
    }
  ]
}
```

### AI 配置表 (ai_configs)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 所属用户（NULL 表示系统默认） |
| type | VARCHAR(20) | text / image |
| provider | VARCHAR(50) | 供应商名称 |
| api_key | VARCHAR(255) | API 密钥（加密存储） |
| base_url | VARCHAR(255) | API 基础 URL |
| model | VARCHAR(100) | 模型名称 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## API 设计

### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 漫画相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comics` | 获取用户漫画列表 |
| POST | `/api/comics` | 创建漫画 |
| GET | `/api/comics/:id` | 获取漫画详情（含章节列表） |
| PUT | `/api/comics/:id` | 更新漫画信息 |
| DELETE | `/api/comics/:id` | 删除漫画 |

### 章节相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/comics/:id/chapters` | 创建章节 |
| GET | `/api/chapters/:id` | 获取章节详情 |
| PUT | `/api/chapters/:id` | 更新章节 |
| DELETE | `/api/chapters/:id` | 删除章节 |
| POST | `/api/chapters/:id/generate-script` | 生成分镜脚本 |
| POST | `/api/chapters/:id/generate-image` | 生成漫画图片 |
| GET | `/api/chapters/:id/image` | 获取漫画图片 |

### 角色相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/characters` | 获取用户角色列表 |
| POST | `/api/characters` | 创建角色 |
| GET | `/api/characters/:id` | 获取角色详情 |
| PUT | `/api/characters/:id` | 更新角色 |
| DELETE | `/api/characters/:id` | 删除角色 |
| POST | `/api/characters/:id/generate-reference` | 生成角色参考图 |
| GET | `/api/characters/:id/reference-image` | 获取角色参考图 |

### AI 配置相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-config` | 获取用户 AI 配置 |
| PUT | `/api/ai-config/text` | 更新文本模型配置 |
| PUT | `/api/ai-config/image` | 更新图片模型配置 |

---

## AI 调用封装

### 统一使用 OpenAI SDK

所有 AI 调用通过 OpenAI SDK 统一对接，通过不同 baseUrl 和 model 区分供应商。

```javascript
const OpenAI = require('openai');

// 文本模型客户端
const textClient = new OpenAI({
  apiKey: textConfig.apiKey,
  baseURL: textConfig.baseUrl  // 如 https://api.deepseek.com
});

// 图片模型客户端
const imageClient = new OpenAI({
  apiKey: imageConfig.apiKey,
  baseURL: imageConfig.baseUrl  // 如 https://api.openai.com
});
```

### 支持的供应商示例

| 类型 | 供应商 | baseUrl | model |
|------|--------|---------|-------|
| 文本 | DeepSeek | https://api.deepseek.com | deepseek-chat |
| 文本 | OpenAI | https://api.openai.com | gpt-4o |
| 图片 | OpenAI | https://api.openai.com | gpt-image-1 |

### 文本 AI 服务

**职责**：根据用户提示词生成分镜脚本 JSON

**输入参数**：
```javascript
{
  chapterPrompt: "小明在公园遇到一只迷路的小狗",
  layoutType: 4,
  characters: [
    { id: 1, name: "小明", appearance: "黑发男孩，蓝色T恤" },
    { id: 2, name: "小红", appearance: "长发女孩，红色连衣裙" }
  ],
  previousChapterScript: { ... }  // 可选，保持剧情连续性
}
```

**输出**：分镜脚本 JSON

**System Prompt**：
```
你是一个专业漫画脚本编剧。根据用户提供的章节提示词、分镜数量、出场角色，生成完整的分镜脚本。

输出要求：
1. 严格按照指定的分镜数量生成
2. 每格包含：场景描述、对白内容、出场角色
3. 场景描述要具体，包含环境、光影、角色动作
4. 对白要简洁有戏剧张力
5. 保持角色性格一致
6. 如有上一章内容，保持剧情连贯

输出 JSON 格式：
{
  "title": "章节标题",
  "panels": [
    {
      "number": 1,
      "scene": "场景描述",
      "dialogue": "角色名：对白内容",
      "characters": [角色ID]
    }
  ]
}
```

### 图片 AI 服务

**职责**：根据脚本生成完整漫画页面（一次性生成）

**输入参数**：
```javascript
{
  stylePrompt: "Japanese manga style, black and white ink, high contrast",
  layoutType: 4,
  script: { panels: [...] },
  characterReferences: [
    { id: 1, imageUrl: "/images/characters/1.png" }
  ],
  previousChapterImage: "/images/comics/chapter-5.png"  // 可选
}
```

**输出**：整页漫画图片文件

---

## 项目目录结构

### 后端

```
server/
├── app/
│   ├── controller/
│   │   ├── auth.js
│   │   ├── comic.js
│   │   ├── chapter.js
│   │   ├── character.js
│   │   └── ai-config.js
│   ├── service/
│   │   ├── auth.js
│   │   ├── comic.js
│   │   ├── chapter.js
│   │   ├── character.js
│   │   ├── ai.js              # AI 客户端初始化
│   │   ├── ai-text.js         # 文本 AI 调用
│   │   ├── ai-image.js        # 图片 AI 调用
│   │   └── storage.js         # 图片存储管理
│   ├── middleware/
│   │   └── jwt.js
│   └── router.js
├── config/
│   ├── config.default.js
│   └── config.prod.js
├── database/
│   └── init.sql
├── public/
│   └── images/
│       ├── characters/        # 角色参考图
│       └── comics/            # 漫画章节图片
├── app.js
└── package.json
```

### 前端 (web/)

```
web/
├── src/
│   ├── views/
│   │   ├── Login.vue
│   │   ├── Comics.vue         # 漫画列表
│   │   ├── ComicDetail.vue    # 漫画详情/章节列表
│   │   ├── ChapterRead.vue    # 章节阅读
│   │   ├── Characters.vue     # 角色管理
│   │   ├── AiConfig.vue       # AI 配置
│   │   └── CreateChapter.vue  # 创作工作台
│   ├── components/
│   │   ├── CharacterForm.vue  # 角色创建/编辑表单
│   │   ├── ScriptEditor.vue   # 分镜脚本编辑器
│   │   └── ProgressBar.vue    # 生成进度条
│   ├── api/
│   │   ├── auth.js
│   │   ├── comic.js
│   │   ├── chapter.js
│   │   ├── character.js
│   │   └── ai-config.js
│   ├── stores/
│   │   ├── auth.js
│   │   └── comic.js
│   ├── router/
│   │   └── index.js
│   └── main.js
├── index.html
├── vite.config.js
└── package.json
```

---

## 前端页面结构

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | Login.vue | 登录/注册 |
| `/comics` | Comics.vue | 漫画列表 |
| `/comics/:id` | ComicDetail.vue | 漫画详情（章节列表） |
| `/comics/:id/read/:chapter` | ChapterRead.vue | 章节阅读 |
| `/characters` | Characters.vue | 角色管理 |
| `/settings/ai` | AiConfig.vue | AI 配置 |
| `/create/:comicId/:chapterId` | CreateChapter.vue | 创作工作台 |

### 创作工作台布局

```
┌─────────────────────────────────────────────────────┐
│  漫画标题 > 第X章：章节标题                           │
├─────────────────────────────────────────────────────┤
│  章节提示词输入框                                    │
│  [生成分镜脚本] 按钮                                 │
├─────────────────────────────────────────────────────┤
│  分镜脚本预览区                                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 格1 │ │ 格2 │ │ 格3 │ │ 格4 │                   │
│  │场景 │ │场景 │ │场景 │ │场景 │                   │
│  │对白 │ │对白 │ │对白 │ │对白 │                   │
│  │[编辑]│ │[编辑]│ │[编辑]│ │[编辑]│                   │
│  └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                     │
│  [确认并生成图片] 按钮                               │
├─────────────────────────────────────────────────────┤
│  图片生成进度区                                      │
│  ████████████░░░░░░░░ 60%                          │
├─────────────────────────────────────────────────────┤
│  最终预览区（图片生成完成后显示）                     │
│  [发布章节] 按钮                                     │
└─────────────────────────────────────────────────────┘
```

### 分镜脚本编辑方式

用户点击某格的"编辑"按钮后，弹出表单对话框进行编辑：

```
┌─────────────────────────────────────┐
│  编辑分镜 - 第1格                [×] │
├─────────────────────────────────────┤
│  场景描述：                          │
│  ┌─────────────────────────────────┐│
│  │ 公园入口，阳光明媚，绿树成荫      ││
│  └─────────────────────────────────┘│
│                                     │
│  对白内容：                          │
│  ┌─────────────────────────────────┐│
│  │ 小明：今天天气真好，适合散步。    ││
│  └─────────────────────────────────┘│
│                                     │
│  出场角色：                          │
│  ☑ 小明  ☑ 小红  ☐ 路人            │
│                                     │
│         [取消]  [保存]              │
└─────────────────────────────────────┘
```

每格独立编辑，表单字段包括：
- **场景描述**：文本输入框
- **对白内容**：文本输入框
- **出场角色**：复选框列表（从本章已选角色中选择）

---

## 图片存储策略

- 存储方式：本地服务器磁盘存储
- 存储路径：`server/public/images/`
  - 角色参考图：`characters/{character_id}.png`
  - 漫画图片：`comics/{comic_id}/chapter_{number}.png`

---

## 认证方案

- JWT + HttpOnly Cookie
- Cookie 配置：httpOnly、sameSite: strict、maxAge: 7天
- 登录时服务器设置 Cookie，登出时清除

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Vite |
| UI 组件 | Vuetify |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 后端框架 | Egg.js |
| 数据库 | SQLite (better-sqlite3) |
| AI SDK | OpenAI SDK |
| 认证 | JWT + HttpOnly Cookie |

---

## 开发约束

**前端开发必须使用 `frontend-design` 技能**：所有前端页面和组件开发时，必须调用 `/frontend-design` 技能确保设计质量。
