# 小说转漫画功能设计文档

## 概述

新增小说转漫画功能，用户上传小说后，通过 AI 自动生成漫画风格、标题、角色、章节规划，最终创建漫画实体。

## 用户流程

```
上传小说 → 生成风格+标题 → 生成角色 → 生成章节规划 → 创建漫画+章节
```

每个步骤需要用户确认，支持用户手动编辑修改。

## 数据库设计

### novels 表

```sql
CREATE TABLE novels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comic_id INTEGER,              -- 关联的漫画 ID（可为空）
  title TEXT,                    -- 小说标题
  content TEXT NOT NULL,         -- 小说内容
  word_count INTEGER,            -- 字数
  status TEXT DEFAULT 'draft',   -- draft/processing/completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (comic_id) REFERENCES comics(id)
);
```

## API 设计

### 小说管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/novels | 创建小说 |
| GET | /api/novels/:id | 获取小说详情 |
| DELETE | /api/novels/:id | 删除小说 |

### 小说转漫画 AI 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/novels/:id/analyze-style | 分析风格+标题 |
| POST | /api/novels/:id/extract-characters | 提取角色 |
| POST | /api/novels/:id/generate-chapters | 生成章节规划 |

### 请求/响应格式

**POST /api/novels**
```json
// Request
{ "title": "小说标题", "content": "小说内容..." }

// Response
{ "novel": { "id": 1, "title": "...", "wordCount": 3000, ... } }
```

**POST /api/novels/:id/analyze-style**
```json
// Response
{ "title": "AI生成的标题", "stylePrompt": "日系黑白漫画风格..." }
```

**POST /api/novels/:id/extract-characters**
```json
// Response
{
  "characters": [
    { "name": "角色名", "description": "性格描述", "appearance": "外观描述" }
  ]
}
```

**POST /api/novels/:id/generate-chapters**
```json
// Request
{ "style": { "title": "...", "stylePrompt": "..." }, "characterIds": [1, 2, 3] }

// Response
{
  "chapters": [
    {
      "title": "第一章",
      "description": "章节描述",
      "layoutType": 6,
      "characterIds": [1, 2],
      "chapterPrompt": "用于生成脚本的提示词..."
    }
  ]
}
```

## 前端设计

### 新增页面

**NovelWizard.vue** - 小说转漫画向导页面
- 路由: `/novel-wizard`
- 布局: 顶部步骤条 + 中间内容区 + 底部操作按钮

### 组件拆分

```
web/src/views/NovelWizard.vue          # 向导主页面
web/src/components/wizard/
├── StepUpload.vue                     # 步骤1: 上传小说
├── StepStyle.vue                      # 步骤2: 风格+标题确认
├── StepCharacters.vue                 # 步骤3: 角色列表
├── StepChapters.vue                   # 步骤4: 章节规划
└── StepComplete.vue                   # 步骤5: 完成页
```

### Store 设计

```javascript
// stores/novelWizard.js
state: {
  currentStep: 1,
  novelId: null,
  novelContent: '',
  style: { title: '', stylePrompt: '' },
  characters: [],
  chapters: [],
  comicId: null,
}
```

### 入口修改

Comics.vue - 漫画列表页
- 在"创建新漫画"按钮旁边添加"上传小说生成漫画"按钮
- 点击后跳转到 `/novel-wizard`

### 小说查看弹窗

ComicDetail.vue - 漫画详情页
- 新增"查看小说原文"按钮
- 点击后打开弹窗显示小说内容

## 后端服务设计

### 新增服务

**server/app/service/novel.js**

| 方法 | 说明 |
|------|------|
| createNovel(userId, title, content) | 创建小说 |
| getNovel(id, userId) | 获取小说 |
| deleteNovel(id, userId) | 删除小说 |
| analyzeStyle(novelId) | AI 分析风格+标题 |
| extractCharacters(novelId) | AI 提取角色 |
| generateChapters(novelId, style, characterIds) | AI 生成章节规划 |

### AI Prompt 设计

**analyzeStyle** - 分析风格+标题
```
System: 你是专业的漫画编辑，请根据小说内容推荐合适的漫画风格和标题。

User: 请分析以下小说，生成：
1. 一个适合的漫画标题（简短有力）
2. 漫画风格提示词（如：日系黑白漫画、美式彩色漫画等）

小说内容：
{小说内容}

请以 JSON 格式输出：{ "title": "...", "stylePrompt": "..." }
```

**extractCharacters** - 提取角色
```
System: 你是专业的漫画编辑，请从小说中提取主要角色。

User: 请从以下小说中提取主要角色（最多5个），为每个角色生成：
1. 角色名称
2. 角色描述（性格、背景）
3. 外观描述（用于生成参考图）

小说内容：
{小说内容}

请以 JSON 格式输出：{ "characters": [{ "name": "...", "description": "...", "appearance": "..." }] }
```

**generateChapters** - 生成章节规划
```
System: 你是专业的漫画编剧，请将小说改编为漫画章节。

User: 请将以下小说改编为漫画章节（每个章节控制在合理长度），为每个章节生成：
1. 章节标题
2. 章节描述（简要说明本章节内容）
3. 分格数量（4/6/8 选一）
4. 出场角色（从提供的角色列表中选择）
5. 章节提示词（用于生成具体的分镜脚本）

小说内容：
{小说内容}

风格：{风格提示词}

角色列表：
{角色列表}

请以 JSON 格式输出：{ "chapters": [{ "title": "...", "description": "...", "layoutType": 6, "characterIds": [1, 2], "chapterPrompt": "..." }] }
```

### 复用现有服务

- `ai-text.js` - 复用 OpenAI 客户端创建逻辑
- `character.js` - 复用角色创建逻辑
- `comic.js` - 复用漫画创建逻辑
- `chapter.js` - 复用章节创建逻辑

## 实现步骤

1. 数据库：创建 novels 表
2. 后端：实现 novel service 和 controller
3. 后端：实现三个 AI 分析接口
4. 前端：创建向导页面和组件
5. 前端：实现各步骤交互逻辑
6. 前端：修改漫画列表页添加入口
7. 前端：修改漫画详情页添加小说查看弹窗

## 约束

- 小说最大支持 5000 字
- 仅支持 TXT 文件上传
- 角色最多提取 5 个
- 角色创建后进入全局角色库
