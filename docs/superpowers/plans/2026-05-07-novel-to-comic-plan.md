# 小说转漫画功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现小说转漫画功能，用户上传小说后通过 AI 生成漫画风格、标题、角色、章节规划。

**Architecture:** 新建 novels 表存储小说，新增 novel service 和 controller 处理 AI 分析，前端新建向导页面实现 5 步流程。

**Tech Stack:** Egg.js (后端), SQLite (数据库), Vue 3 + Vuetify (前端), OpenAI API (AI)

---

## 文件结构

### 后端新增/修改文件

```
server/
├── database/
│   └── init.sql                    # 修改: 添加 novels 表
├── app/
│   ├── controller/
│   │   └── novel.js                # 新增: 小说控制器
│   ├── service/
│   │   ├── db.js                   # 修改: 添加 novels 相关方法
│   │   └── novel.js                # 新增: 小说服务 (AI 分析)
│   └── router.js                   # 修改: 添加小说路由
```

### 前端新增/修改文件

```
web/src/
├── api/
│   └── novel.js                    # 新增: 小说 API 封装
├── stores/
│   └── novelWizard.js              # 新增: 向导状态管理
├── views/
│   ├── Comics.vue                  # 修改: 添加入口按钮
│   ├── ComicDetail.vue             # 修改: 添加查看小说弹窗
│   └── NovelWizard.vue             # 新增: 向导主页面
├── components/
│   └── wizard/
│       ├── StepUpload.vue          # 新增: 步骤1 上传小说
│       ├── StepStyle.vue           # 新增: 步骤2 风格确认
│       ├── StepCharacters.vue      # 新增: 步骤3 角色列表
│       ├── StepChapters.vue        # 新增: 步骤4 章节规划
│       └── StepComplete.vue        # 新增: 步骤5 完成页
└── router/
    └── index.js                    # 修改: 添加向导路由
```

---

## Task 1: 数据库 - 创建 novels 表

**Files:**
- Modify: `server/database/init.sql`

- [ ] **Step 1: 添加 novels 表到数据库初始化脚本**

在 `server/database/init.sql` 文件末尾添加：

```sql
-- 小说表
CREATE TABLE IF NOT EXISTS novels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comic_id INTEGER,
  title TEXT,
  content TEXT NOT NULL,
  word_count INTEGER,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_novels_user ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_comic ON novels(comic_id);
```

- [ ] **Step 2: 提交数据库变更**

```bash
git add server/database/init.sql
git commit -m "feat(db): 添加 novels 表用于存储小说内容

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: 后端 - 添加 novels 数据库操作方法

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 在 DbService 类中添加 novels 相关方法**

在 `server/app/service/db.js` 文件的 `DbService` 类中，`countChaptersByComicId` 方法之后添加：

```javascript
  // 小说相关
  createNovel(userId, title, content) {
    const wordCount = content.length;
    const stmt = this.db.prepare(
      'INSERT INTO novels (user_id, title, content, word_count) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(userId, title || null, content, wordCount);
    return result.lastInsertRowid;
  }

  findNovelById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE id = ?'
    );
    return stmt.get(id);
  }

  findNovelByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  findNovelByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM novels WHERE comic_id = ?'
    );
    return stmt.get(comicId);
  }

  updateNovel(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.comic_id !== undefined) {
      fields.push('comic_id = ?');
      values.push(data.comic_id);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE novels SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteNovel(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM novels WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
```

- [ ] **Step 2: 提交数据库方法变更**

```bash
git add server/app/service/db.js
git commit -m "feat(db): 添加 novels 表操作方法

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 后端 - 创建 novel service

**Files:**
- Create: `server/app/service/novel.js`

- [ ] **Step 1: 创建 novel.js 服务文件**

创建 `server/app/service/novel.js`：

```javascript
// server/app/service/novel.js
const Service = require('egg').Service;
const OpenAI = require('openai');

class NovelService extends Service {
  async createNovel(userId, title, content) {
    const novelId = await this.ctx.service.db.createNovel(userId, title, content);
    return await this.ctx.service.db.findNovelById(novelId);
  }

  async getNovel(id, userId) {
    const novel = await this.ctx.service.db.findNovelByIdAndUserId(id, userId);
    if (!novel) {
      this.ctx.throw(404, '小说不存在');
    }
    return novel;
  }

  async deleteNovel(id, userId) {
    const deleted = await this.ctx.service.db.deleteNovel(id, userId);
    if (!deleted) {
      this.ctx.throw(404, '小说不存在或无权删除');
    }
  }

  async getClient() {
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey('text');
    if (!config || !config.apiKey) {
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o',
      };
      if (!envConfig.apiKey) {
        return null;
      }
      return {
        client: new OpenAI({
          apiKey: envConfig.apiKey,
          baseURL: envConfig.baseURL,
        }),
        model: envConfig.model,
      };
    }
    return {
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      }),
      model: config.model,
    };
  }

  parseJsonResponse(content) {
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI 返回内容为空');
    }

    try {
      return JSON.parse(content);
    } catch (_) {
      // 尝试从内容中提取 JSON
    }

    // 查找 JSON 对象
    const start = content.indexOf('{');
    if (start === -1) {
      throw new Error('AI 返回的内容不是有效 JSON');
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < content.length; i++) {
      const char = content[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(content.slice(start, i + 1));
          } catch (_) {
            throw new Error('AI 返回的内容不是有效 JSON');
          }
        }
      }
    }

    throw new Error('AI 返回的内容不是有效 JSON');
  }

  async analyzeStyle(novelId, userId) {
    const novel = await this.getNovel(novelId, userId);

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是专业的漫画编辑，请根据小说内容推荐合适的漫画风格和标题。
输出要求：
1. 标题要简短有力，适合作为漫画标题
2. 风格提示词要具体，如：日系黑白漫画风格、美式彩色卡通风格等

请以 JSON 格式输出，不要包含任何其他文字：
{ "title": "漫画标题", "stylePrompt": "风格描述" }`;

    const userPrompt = `请分析以下小说内容，生成漫画标题和风格提示词：

${novel.content.substring(0, 3000)}`;

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const result = this.parseJsonResponse(content);

      return {
        title: result.title || novel.title || '未命名漫画',
        stylePrompt: result.stylePrompt || '日系黑白漫画风格',
      };
    } catch (err) {
      this.ctx.logger.error('AI analyze style error:', err);
      this.ctx.throw(500, `AI 分析失败: ${err.message}`);
    }
  }

  async extractCharacters(novelId, userId) {
    const novel = await this.getNovel(novelId, userId);

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是专业的漫画编辑，请从小说中提取主要角色。
输出要求：
1. 最多提取 5 个主要角色
2. 每个角色包含：名称、性格描述、外观描述
3. 外观描述要具体，包含发型、服装、特征等，用于生成角色参考图

请以 JSON 格式输出：
{ "characters": [{ "name": "角色名", "description": "性格描述", "appearance": "外观描述" }] }`;

    const userPrompt = `请从以下小说中提取主要角色：

${novel.content.substring(0, 3000)}`;

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const result = this.parseJsonResponse(content);

      return {
        characters: (result.characters || []).map((char, index) => ({
          id: index + 1,
          name: char.name || `角色${index + 1}`,
          description: char.description || '',
          appearance: char.appearance || '',
        })),
      };
    } catch (err) {
      this.ctx.logger.error('AI extract characters error:', err);
      this.ctx.throw(500, `AI 提取角色失败: ${err.message}`);
    }
  }

  async generateChapters(novelId, userId, style, characterIds) {
    const novel = await this.getNovel(novelId, userId);

    // 获取角色信息
    const characters = [];
    for (const charId of characterIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characters.push({ id: char.id, name: char.name, appearance: char.appearance });
      }
    }

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是专业的漫画编剧，请将小说改编为漫画章节。
输出要求：
1. 每个章节控制在合理长度
2. 每个章节包含：标题、描述、分格数量(4/6/8)、出场角色ID列表、章节提示词
3. 章节提示词用于后续生成具体的分镜脚本，要包含场景、剧情要点

请以 JSON 格式输出：
{ "chapters": [{ "title": "章节标题", "description": "章节描述", "layoutType": 6, "characterIds": [1, 2], "chapterPrompt": "用于生成脚本的提示词" }] }`;

    const userPrompt = `请将以下小说改编为漫画章节：

小说内容：
${novel.content.substring(0, 3000)}

风格：${style.stylePrompt || '日系黑白漫画'}

角色列表：
${JSON.stringify(characters, null, 2)}`;

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const result = this.parseJsonResponse(content);

      return {
        chapters: (result.chapters || []).map((ch, index) => ({
          chapterNumber: index + 1,
          title: ch.title || `第${index + 1}章`,
          description: ch.description || '',
          layoutType: ch.layoutType || 4,
          characterIds: ch.characterIds || [],
          chapterPrompt: ch.chapterPrompt || '',
        })),
      };
    } catch (err) {
      this.ctx.logger.error('AI generate chapters error:', err);
      this.ctx.throw(500, `AI 生成章节失败: ${err.message}`);
    }
  }
}

module.exports = NovelService;
```

- [ ] **Step 2: 提交 novel service**

```bash
git add server/app/service/novel.js
git commit -m "feat(server): 添加 novel service 实现 AI 分析功能

- createNovel/getNovel/deleteNovel: 小说 CRUD
- analyzeStyle: AI 分析风格和标题
- extractCharacters: AI 提取角色
- generateChapters: AI 生成章节规划

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 后端 - 创建 novel controller

**Files:**
- Create: `server/app/controller/novel.js`

- [ ] **Step 1: 创建 novel.js 控制器文件**

创建 `server/app/controller/novel.js`：

```javascript
// server/app/controller/novel.js
const Controller = require('egg').Controller;

class NovelController extends Controller {
  async create() {
    const { ctx } = this;
    const { title, content } = ctx.request.body;

    if (!content || !content.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入小说内容' };
      return;
    }

    if (content.length > 5000) {
      ctx.status = 400;
      ctx.body = { error: '小说内容不能超过 5000 字' };
      return;
    }

    try {
      const novel = await ctx.service.novel.createNovel(
        ctx.state.user.id,
        title,
        content
      );
      ctx.status = 201;
      ctx.body = { novel };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const novel = await ctx.service.novel.getNovel(parseInt(id), ctx.state.user.id);
      ctx.body = { novel };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.novel.deleteNovel(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async analyzeStyle() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.novel.analyzeStyle(parseInt(id), ctx.state.user.id);
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async extractCharacters() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.novel.extractCharacters(parseInt(id), ctx.state.user.id);
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateChapters() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { style, characterIds } = ctx.request.body;

    if (!style || !style.stylePrompt) {
      ctx.status = 400;
      ctx.body = { error: '请提供风格信息' };
      return;
    }

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请选择至少一个角色' };
      return;
    }

    try {
      const result = await ctx.service.novel.generateChapters(
        parseInt(id),
        ctx.state.user.id,
        style,
        characterIds
      );
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = NovelController;
```

- [ ] **Step 2: 提交 novel controller**

```bash
git add server/app/controller/novel.js
git commit -m "feat(server): 添加 novel controller 实现小说 API

- POST /api/novels: 创建小说
- GET /api/novels/:id: 获取小说
- DELETE /api/novels/:id: 删除小说
- POST /api/novels/:id/analyze-style: 分析风格
- POST /api/novels/:id/extract-characters: 提取角色
- POST /api/novels/:id/generate-chapters: 生成章节

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 后端 - 添加路由

**Files:**
- Modify: `server/app/router.js`

- [ ] **Step 1: 在路由文件中添加小说相关路由**

在 `server/app/router.js` 的章节路由之后、AI 配置路由之前添加：

```javascript
  // 小说相关（需要登录）
  router.post('/api/novels', app.middleware.jwt(), controller.novel.create);
  router.get('/api/novels/:id', app.middleware.jwt(), controller.novel.show);
  router.delete('/api/novels/:id', app.middleware.jwt(), controller.novel.destroy);
  router.post('/api/novels/:id/analyze-style', app.middleware.jwt(), controller.novel.analyzeStyle);
  router.post('/api/novels/:id/extract-characters', app.middleware.jwt(), controller.novel.extractCharacters);
  router.post('/api/novels/:id/generate-chapters', app.middleware.jwt(), controller.novel.generateChapters);
```

- [ ] **Step 2: 提交路由变更**

```bash
git add server/app/router.js
git commit -m "feat(server): 添加小说相关 API 路由

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 后端 - 添加关联漫画和批量创建章节的 API

**Files:**
- Modify: `server/app/service/db.js`
- Modify: `server/app/controller/comic.js`

- [ ] **Step 1: 在 db.js 添加 updateNovelComicId 方法**

在 `server/app/service/db.js` 的 `updateNovel` 方法中已经有 `comic_id` 的更新支持，无需额外添加。

- [ ] **Step 2: 在 comic controller 添加批量创建章节接口**

在 `server/app/controller/comic.js` 添加新方法：

```javascript
  async createChapters() {
    const { ctx } = this;
    const { id: comicId } = ctx.params;
    const { chapters, novelId } = ctx.request.body;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请提供章节列表' };
      return;
    }

    try {
      // 验证漫画归属
      const comic = await ctx.service.db.findComicByIdAndUserId(
        parseInt(comicId),
        ctx.state.user.id
      );

      if (!comic) {
        ctx.status = 404;
        ctx.body = { error: '漫画不存在' };
        return;
      }

      // 批量创建章节
      const createdChapters = [];
      for (const ch of chapters) {
        const chapterId = await ctx.service.db.createChapter(
          parseInt(comicId),
          ch.chapterNumber,
          ch.title,
          ch.layoutType
        );

        // 更新章节的 prompt 和角色
        await ctx.service.db.updateChapter(chapterId, {
          chapter_prompt: ch.chapterPrompt,
          character_ids: JSON.stringify(ch.characterIds || []),
        });

        const chapter = await ctx.service.db.findChapterById(chapterId);
        createdChapters.push(chapter);
      }

      // 关联小说
      if (novelId) {
        await ctx.service.db.updateNovel(novelId, ctx.state.user.id, {
          comic_id: parseInt(comicId),
          status: 'completed',
        });
      }

      ctx.status = 201;
      ctx.body = { chapters: createdChapters };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
```

- [ ] **Step 3: 在 router.js 添加批量创建章节路由**

在漫画路由部分添加：

```javascript
  router.post('/api/comics/:id/chapters/batch', app.middleware.jwt(), controller.comic.createChapters);
```

- [ ] **Step 4: 提交变更**

```bash
git add server/app/controller/comic.js server/app/router.js
git commit -m "feat(server): 添加批量创建章节 API

支持一次性创建多个章节并关联小说

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 前端 - 创建小说 API 封装

**Files:**
- Create: `web/src/api/novel.js`

- [ ] **Step 1: 创建 novel.js API 文件**

创建 `web/src/api/novel.js`：

```javascript
// web/src/api/novel.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async createNovel(data) {
    const res = await api.post('/novels', data)
    return res.data
  },

  async getNovel(id) {
    const res = await api.get(`/novels/${id}`)
    return res.data
  },

  async deleteNovel(id) {
    const res = await api.delete(`/novels/${id}`)
    return res.data
  },

  async analyzeStyle(id) {
    const res = await api.post(`/novels/${id}/analyze-style`)
    return res.data
  },

  async extractCharacters(id) {
    const res = await api.post(`/novels/${id}/extract-characters`)
    return res.data
  },

  async generateChapters(id, data) {
    const res = await api.post(`/novels/${id}/generate-chapters`, data)
    return res.data
  },
}
```

- [ ] **Step 2: 提交 API 文件**

```bash
git add web/src/api/novel.js
git commit -m "feat(web): 添加小说 API 封装

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 前端 - 创建向导 Store

**Files:**
- Create: `web/src/stores/novelWizard.js`

- [ ] **Step 1: 创建 novelWizard.js store 文件**

创建 `web/src/stores/novelWizard.js`：

```javascript
// web/src/stores/novelWizard.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import novelApi from '../api/novel'
import comicApi from '../api/comic'
import characterApi from '../api/character'

export const useNovelWizardStore = defineStore('novelWizard', () => {
  // 状态
  const currentStep = ref(1)
  const novelId = ref(null)
  const novelContent = ref('')
  const novelTitle = ref('')
  const style = ref({ title: '', stylePrompt: '' })
  const characters = ref([])
  const chapters = ref([])
  const comicId = ref(null)
  const loading = ref(false)
  const error = ref('')

  // 计算属性
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1:
        return novelContent.value.trim().length > 0 && novelContent.value.length <= 5000
      case 2:
        return style.value.title.trim().length > 0
      case 3:
        return characters.value.length > 0
      case 4:
        return chapters.value.length > 0
      default:
        return true
    }
  })

  // 方法
  async function createNovel(title, content) {
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.createNovel({ title, content })
      novelId.value = res.novel.id
      novelTitle.value = res.novel.title
      return res.novel
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function analyzeStyle() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.analyzeStyle(novelId.value)
      style.value = {
        title: res.title,
        stylePrompt: res.stylePrompt,
      }
      return res
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function extractCharacters() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.extractCharacters(novelId.value)
      characters.value = res.characters
      return res.characters
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function generateChapters() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const characterIds = characters.value
        .filter(c => c.selected)
        .map(c => c.createdId || c.id)

      const res = await novelApi.generateChapters(novelId.value, {
        style: style.value,
        characterIds,
      })
      chapters.value = res.chapters
      return res.chapters
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createCharacters() {
    const selectedCharacters = characters.value.filter(c => c.selected)
    const createdIds = []

    for (const char of selectedCharacters) {
      try {
        const res = await characterApi.createCharacter({
          name: char.name,
          description: char.description,
          appearance: char.appearance,
        })
        createdIds.push(res.character.id)
        char.createdId = res.character.id
      } catch (e) {
        console.error('创建角色失败:', e)
      }
    }

    return createdIds
  }

  async function createComicAndChapters() {
    loading.value = true
    error.value = ''
    try {
      // 创建漫画
      const comicRes = await comicApi.createComic({
        title: style.value.title,
        stylePrompt: style.value.stylePrompt,
      })
      comicId.value = comicRes.comic.id

      // 获取已创建角色的 ID
      const characterIdMap = {}
      characters.value.filter(c => c.selected).forEach(c => {
        characterIdMap[c.id] = c.createdId
      })

      // 准备章节数据，映射角色 ID
      const chaptersData = chapters.value.map(ch => ({
        ...ch,
        characterIds: ch.characterIds.map(id => characterIdMap[id] || id).filter(Boolean),
      }))

      // 批量创建章节
      const res = await fetch('/api/comics/' + comicId.value + '/chapters/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chapters: chaptersData,
          novelId: novelId.value,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '创建章节失败')
      }

      return comicId.value
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function nextStep() {
    if (currentStep.value < 5) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  function reset() {
    currentStep.value = 1
    novelId.value = null
    novelContent.value = ''
    novelTitle.value = ''
    style.value = { title: '', stylePrompt: '' }
    characters.value = []
    chapters.value = []
    comicId.value = null
    loading.value = false
    error.value = ''
  }

  return {
    // 状态
    currentStep,
    novelId,
    novelContent,
    novelTitle,
    style,
    characters,
    chapters,
    comicId,
    loading,
    error,
    // 计算属性
    canProceed,
    // 方法
    createNovel,
    analyzeStyle,
    extractCharacters,
    generateChapters,
    createCharacters,
    createComicAndChapters,
    nextStep,
    prevStep,
    reset,
  }
})
```

- [ ] **Step 2: 提交 store 文件**

```bash
git add web/src/stores/novelWizard.js
git commit -m "feat(web): 添加小说转漫画向导 Store

管理向导流程的完整状态

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 前端 - 创建向导步骤组件

**Files:**
- Create: `web/src/components/wizard/StepUpload.vue`
- Create: `web/src/components/wizard/StepStyle.vue`
- Create: `web/src/components/wizard/StepCharacters.vue`
- Create: `web/src/components/wizard/StepChapters.vue`
- Create: `web/src/components/wizard/StepComplete.vue`

- [ ] **Step 1: 创建 StepUpload.vue**

创建 `web/src/components/wizard/StepUpload.vue`：

```vue
<!-- web/src/components/wizard/StepUpload.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">上传小说</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-file-input
            v-model="file"
            accept=".txt"
            label="上传 TXT 文件"
            prepend-icon="mdi-file-document"
            :rules="[v => !v || v.size <= 1024 * 1020 || '文件大小不能超过 1MB']"
            @update:modelValue="handleFileChange"
          />
        </v-col>
        <v-col cols="12" class="text-center">
          <div class="text-grey mb-2">或者直接粘贴小说内容</div>
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="localContent"
            label="小说内容"
            placeholder="请粘贴小说内容..."
            rows="12"
            auto-grow
            :counter="5000"
            :rules="[v => !v || v.length <= 5000 || '内容不能超过 5000 字']"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="localTitle"
            label="小说标题（可选）"
            hint="如果上传文件，将从文件名自动提取"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const file = ref(null)
const localContent = ref(store.novelContent)
const localTitle = ref(store.novelTitle)

watch(localContent, (val) => {
  store.novelContent = val
})

watch(localTitle, (val) => {
  store.novelTitle = val
})

function handleFileChange(f) {
  if (!f) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    if (content.length > 5000) {
      localContent.value = content.substring(0, 5000)
      alert('小说内容已截取前 5000 字')
    } else {
      localContent.value = content
    }

    // 从文件名提取标题
    if (!localTitle.value) {
      const fileName = f.name.replace(/\.txt$/i, '')
      localTitle.value = fileName
    }
  }
  reader.readAsText(f)
}
</script>
```

- [ ] **Step 2: 创建 StepStyle.vue**

创建 `web/src/components/wizard/StepStyle.vue`：

```vue
<!-- web/src/components/wizard/StepStyle.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认漫画风格</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在分析小说，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="localStyle.title"
            label="漫画标题"
            :rules="[v => !!v || '请输入漫画标题']"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="localStyle.stylePrompt"
            label="风格提示词"
            hint="描述漫画的视觉风格，如：日系黑白漫画、彩色卡通风格等"
            rows="4"
            auto-grow
          />
        </v-col>
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            重新生成
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const localStyle = ref({
  title: store.style.title,
  stylePrompt: store.style.stylePrompt,
})

watch(localStyle, (val) => {
  store.style = val
}, { deep: true })

onMounted(async () => {
  if (!store.style.title && store.novelId) {
    try {
      await store.analyzeStyle()
      localStyle.value = { ...store.style }
    } catch (e) {
      console.error('分析风格失败:', e)
    }
  }
})

async function regenerate() {
  try {
    await store.analyzeStyle()
    localStyle.value = { ...store.style }
  } catch (e) {
    console.error('重新生成失败:', e)
  }
}
</script>
```

- [ ] **Step 3: 创建 StepCharacters.vue**

创建 `web/src/components/wizard/StepCharacters.vue`：

```vue
<!-- web/src/components/wizard/StepCharacters.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认角色列表</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在提取角色，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-row>
        <v-col
          v-for="(char, index) in localCharacters"
          :key="index"
          cols="12"
          md="6"
        >
          <v-card :class="{ 'border-primary': char.selected }" @click="toggleSelect(char)">
            <v-card-text>
              <div class="d-flex align-center mb-2">
                <v-checkbox
                  v-model="char.selected"
                  hide-details
                  class="mr-2"
                  @click.stop
                />
                <v-text-field
                  v-model="char.name"
                  label="角色名称"
                  hide-details
                  density="compact"
                  @click.stop
                />
              </div>
              <v-textarea
                v-model="char.description"
                label="角色描述"
                rows="2"
                hide-details
                class="mb-2"
                @click.stop
              />
              <v-textarea
                v-model="char.appearance"
                label="外观描述"
                rows="2"
                hide-details
                hint="用于生成角色参考图"
                @click.stop
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            重新提取
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const localCharacters = ref([])

watch(localCharacters, (val) => {
  store.characters = val
}, { deep: true })

onMounted(async () => {
  if (store.characters.length === 0 && store.novelId) {
    try {
      await store.extractCharacters()
      localCharacters.value = store.characters.map(c => ({
        ...c,
        selected: true,
      }))
    } catch (e) {
      console.error('提取角色失败:', e)
    }
  } else {
    localCharacters.value = store.characters.map(c => ({
      ...c,
      selected: c.selected !== false,
    }))
  }
})

async function regenerate() {
  try {
    await store.extractCharacters()
    localCharacters.value = store.characters.map(c => ({
      ...c,
      selected: true,
    }))
  } catch (e) {
    console.error('重新提取失败:', e)
  }
}

function toggleSelect(char) {
  char.selected = !char.selected
}
</script>

<style scoped>
.border-primary {
  border: 2px solid rgb(var(--v-theme-primary));
}
</style>
```

- [ ] **Step 4: 创建 StepChapters.vue**

创建 `web/src/components/wizard/StepChapters.vue`：

```vue
<!-- web/src/components/wizard/StepChapters.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认章节规划</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在生成章节规划，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-expansion-panels v-if="localChapters.length > 0">
        <v-expansion-panel
          v-for="(chapter, index) in localChapters"
          :key="index"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center w-100">
              <v-chip size="small" color="primary" class="mr-2">
                {{ chapter.chapterNumber }}
              </v-chip>
              <v-text-field
                v-model="chapter.title"
                variant="plain"
                density="compact"
                hide-details
                class="flex-grow-1"
                @click.stop
              />
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="chapter.layoutType"
                  :items="layoutOptions"
                  label="分格数量"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="chapter.characterIds"
                  :items="characterOptions"
                  label="出场角色"
                  multiple
                  chips
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="chapter.description"
                  label="章节描述"
                  rows="2"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="chapter.chapterPrompt"
                  label="章节提示词"
                  hint="用于生成分镜脚本"
                  rows="4"
                />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            重新生成
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const localChapters = ref([])

const layoutOptions = [
  { title: '4 格分镜', value: 4 },
  { title: '6 格分镜', value: 6 },
  { title: '8 格分镜', value: 8 },
]

const characterOptions = computed(() => {
  return store.characters
    .filter(c => c.selected)
    .map(c => ({
      title: c.name,
      value: c.id,
    }))
})

watch(localChapters, (val) => {
  store.chapters = val
}, { deep: true })

onMounted(async () => {
  if (store.chapters.length === 0 && store.novelId) {
    try {
      await store.generateChapters()
      localChapters.value = [...store.chapters]
    } catch (e) {
      console.error('生成章节失败:', e)
    }
  } else {
    localChapters.value = [...store.chapters]
  }
})

async function regenerate() {
  try {
    await store.generateChapters()
    localChapters.value = [...store.chapters]
  } catch (e) {
    console.error('重新生成失败:', e)
  }
}
</script>
```

- [ ] **Step 5: 创建 StepComplete.vue**

创建 `web/src/components/wizard/StepComplete.vue`：

```vue
<!-- web/src/components/wizard/StepComplete.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">创建完成</v-card-title>
    <v-card-text class="text-center py-8">
      <v-icon size="80" color="success" class="mb-4">mdi-check-circle</v-icon>
      <h2 class="mb-2">漫画创建成功！</h2>
      <p class="text-grey mb-6">
        已创建 {{ store.chapters.length }} 个章节，您可以在漫画详情页继续创作
      </p>
      <v-btn
        color="primary"
        size="large"
        :to="`/comics/${store.comicId}`"
      >
        前往漫画详情
        <v-icon right>mdi-arrow-right</v-icon>
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()
</script>
```

- [ ] **Step 6: 提交组件文件**

```bash
git add web/src/components/wizard/
git commit -m "feat(web): 添加小说转漫画向导步骤组件

- StepUpload: 上传小说
- StepStyle: 确认风格
- StepCharacters: 确认角色
- StepChapters: 确认章节
- StepComplete: 完成页

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 前端 - 创建向导主页面

**Files:**
- Create: `web/src/views/NovelWizard.vue`
- Modify: `web/src/router/index.js`

- [ ] **Step 1: 创建 NovelWizard.vue**

创建 `web/src/views/NovelWizard.vue`：

```vue
<!-- web/src/views/NovelWizard.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn variant="text" to="/comics" class="mr-4">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <h1>小说转漫画</h1>
        </div>
      </v-col>
    </v-row>

    <!-- 步骤条 -->
    <v-row>
      <v-col cols="12">
        <v-stepper v-model="store.currentStep" alt-labels>
          <v-stepper-header>
            <v-stepper-item
              :value="1"
              title="上传小说"
              :complete="store.currentStep > 1"
            />
            <v-divider />
            <v-stepper-item
              :value="2"
              title="确认风格"
              :complete="store.currentStep > 2"
            />
            <v-divider />
            <v-stepper-item
              :value="3"
              title="确认角色"
              :complete="store.currentStep > 3"
            />
            <v-divider />
            <v-stepper-item
              :value="4"
              title="确认章节"
              :complete="store.currentStep > 4"
            />
            <v-divider />
            <v-stepper-item
              :value="5"
              title="完成"
            />
          </v-stepper-header>

          <v-stepper-window>
            <v-stepper-window-item :value="1">
              <StepUpload />
            </v-stepper-window-item>

            <v-stepper-window-item :value="2">
              <StepStyle />
            </v-stepper-window-item>

            <v-stepper-window-item :value="3">
              <StepCharacters />
            </v-stepper-window-item>

            <v-stepper-window-item :value="4">
              <StepChapters />
            </v-stepper-window-item>

            <v-stepper-window-item :value="5">
              <StepComplete />
            </v-stepper-window-item>
          </v-stepper-window>

          <v-stepper-actions v-if="store.currentStep < 5">
            <template #prev>
              <v-btn
                variant="text"
                :disabled="store.currentStep === 1"
                @click="handlePrev"
              >
                上一步
              </v-btn>
            </template>
            <template #next>
              <v-btn
                color="primary"
                :disabled="!store.canProceed || store.loading"
                :loading="processing"
                @click="handleNext"
              >
                {{ store.currentStep === 4 ? '创建漫画' : '下一步' }}
              </v-btn>
            </template>
          </v-stepper-actions>
        </v-stepper>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelWizardStore } from '../stores/novelWizard'
import StepUpload from '../components/wizard/StepUpload.vue'
import StepStyle from '../components/wizard/StepStyle.vue'
import StepCharacters from '../components/wizard/StepCharacters.vue'
import StepChapters from '../components/wizard/StepChapters.vue'
import StepComplete from '../components/wizard/StepComplete.vue'

const router = useRouter()
const store = useNovelWizardStore()
const processing = ref(false)

async function handleNext() {
  if (store.currentStep === 1) {
    // 创建小说
    processing.value = true
    try {
      await store.createNovel(store.novelTitle, store.novelContent)
      store.nextStep()
    } catch (e) {
      console.error('创建小说失败:', e)
    } finally {
      processing.value = false
    }
  } else if (store.currentStep === 4) {
    // 创建角色和漫画
    processing.value = true
    try {
      await store.createCharacters()
      await store.createComicAndChapters()
      store.nextStep()
    } catch (e) {
      console.error('创建失败:', e)
    } finally {
      processing.value = false
    }
  } else {
    store.nextStep()
  }
}

function handlePrev() {
  store.prevStep()
}
</script>
```

- [ ] **Step 2: 添加路由**

在 `web/src/router/index.js` 的 routes 数组中，`/comics/:id` 路由之后添加：

```javascript
  {
    path: '/novel-wizard',
    name: 'NovelWizard',
    component: () => import('../views/NovelWizard.vue'),
  },
```

- [ ] **Step 3: 提交文件**

```bash
git add web/src/views/NovelWizard.vue web/src/router/index.js
git commit -m "feat(web): 添加小说转漫画向导主页面

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 前端 - 添加入口按钮和小说查看弹窗

**Files:**
- Modify: `web/src/views/Comics.vue`
- Modify: `web/src/views/ComicDetail.vue`
- Modify: `web/src/api/comic.js`

- [ ] **Step 1: 修改 Comics.vue 添加入口按钮**

在 `web/src/views/Comics.vue` 的"创建新漫画"按钮旁边添加"上传小说生成漫画"按钮。

找到第 47-54 行的"创建漫画按钮"部分，替换为：

```vue
    <!-- 创建漫画按钮 -->
    <v-row>
      <v-col cols="12" class="d-flex gap-2">
        <v-btn color="primary" @click="openCreateDialog">
          <v-icon left>mdi-plus</v-icon>
          创建新漫画
        </v-btn>
        <v-btn color="secondary" to="/novel-wizard">
          <v-icon left>mdi-file-document-plus</v-icon>
          上传小说生成漫画
        </v-btn>
      </v-col>
    </v-row>
```

- [ ] **Step 2: 修改 ComicDetail.vue 添加小说查看功能**

在 `web/src/views/ComicDetail.vue` 中添加小说查看功能：

1. 在 script 部分添加以下变量和方法：

```javascript
// 添加到变量定义部分
const novelDialog = ref(false)
const novelContent = ref('')
const novelTitle = ref('')
const loadingNovel = ref(false)

// 添加新方法
async function openNovelDialog() {
  loadingNovel.value = true
  novelDialog.value = true
  try {
    const res = await fetch(`/api/novels/by-comic/${route.params.id}`, {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      novelContent.value = data.novel?.content || ''
      novelTitle.value = data.novel?.title || '小说原文'
    }
  } catch (e) {
    console.error('加载小说失败', e)
  } finally {
    loadingNovel.value = false
  }
}
```

2. 在模板的操作按钮区域（"预览漫画"按钮之前）添加：

```vue
              <v-btn
                v-if="hasNovel"
                variant="outlined"
                color="info"
                class="mr-2"
                @click="openNovelDialog"
              >
                <v-icon left>mdi-book-open-variant</v-icon>
                查看小说
              </v-btn>
```

3. 在模板末尾添加小说查看弹窗：

```vue
      <!-- 小说查看弹窗 -->
      <v-dialog v-model="novelDialog" max-width="800">
        <v-card>
          <v-card-title>{{ novelTitle }}</v-card-title>
          <v-card-text>
            <v-progress-circular v-if="loadingNovel" indeterminate color="primary" />
            <pre v-else style="white-space: pre-wrap; word-wrap: break-word;">{{ novelContent }}</pre>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="novelDialog = false">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
```

- [ ] **Step 3: 提交变更**

```bash
git add web/src/views/Comics.vue web/src/views/ComicDetail.vue
git commit -m "feat(web): 添加小说转漫画入口和小说查看功能

- Comics.vue: 添加入口按钮
- ComicDetail.vue: 添加查看小说弹窗

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: 后端 - 添加按漫画 ID 查询小说的 API

**Files:**
- Modify: `server/app/controller/novel.js`
- Modify: `server/app/router.js`

- [ ] **Step 1: 在 novel controller 添加按漫画 ID 查询方法**

在 `server/app/controller/novel.js` 添加：

```javascript
  async showByComicId() {
    const { ctx } = this;
    const { comicId } = ctx.params;

    try {
      const novel = await ctx.service.db.findNovelByComicId(parseInt(comicId));
      if (!novel) {
        ctx.status = 404;
        ctx.body = { error: '未找到关联的小说' };
        return;
      }
      // 验证用户权限
      const comic = await ctx.service.db.findComicByIdAndUserId(novel.user_id, ctx.state.user.id);
      if (!comic && novel.user_id !== ctx.state.user.id) {
        ctx.status = 403;
        ctx.body = { error: '无权访问' };
        return;
      }
      ctx.body = { novel };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
```

- [ ] **Step 2: 在路由中添加新路由**

在 `server/app/router.js` 小说路由部分添加：

```javascript
  router.get('/api/novels/by-comic/:comicId', app.middleware.jwt(), controller.novel.showByComicId);
```

- [ ] **Step 3: 提交变更**

```bash
git add server/app/controller/novel.js server/app/router.js
git commit -m "feat(server): 添加按漫画 ID 查询小说的 API

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: 测试和修复

- [ ] **Step 1: 启动后端服务测试**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 启动前端服务测试**

```bash
cd web && npm run dev
```

- [ ] **Step 3: 手动测试完整流程**

1. 访问 http://localhost:3000/comics
2. 点击"上传小说生成漫画"按钮
3. 上传或粘贴小说内容
4. 确认风格
5. 确认角色
6. 确认章节
7. 检查漫画是否创建成功
8. 在漫画详情页检查小说查看功能

- [ ] **Step 4: 修复发现的问题**

记录并修复测试中发现的问题。

---

## 完成标志

- [ ] 所有文件已创建/修改
- [ ] 后端 API 测试通过
- [ ] 前端流程测试通过
- [ ] 代码已提交
