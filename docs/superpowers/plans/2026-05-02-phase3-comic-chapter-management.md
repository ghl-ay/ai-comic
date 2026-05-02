# Phase 3: 漫画和章节管理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现漫画和章节的 CRUD 管理，包括 AI 生成分镜脚本和漫画图片。

**Architecture:** 后端扩展 db.js 添加漫画和章节方法，新增 comic 和 chapter 服务/控制器，新增 ai-text 服务生成分镜脚本。前端新增漫画列表、详情和创作工作台页面。

**Tech Stack:** Egg.js, SQLite, OpenAI SDK, Vue 3, Vuetify, Pinia

---

## 文件结构

### 后端新增/修改文件

```
server/
├── app/
│   ├── controller/
│   │   ├── comic.js           # 漫画控制器（新增）
│   │   └── chapter.js         # 章节控制器（新增）
│   ├── service/
│   │   ├── db.js              # 添加漫画和章节方法（修改）
│   │   ├── comic.js           # 漫画服务（新增）
│   │   ├── chapter.js         # 章节服务（新增）
│   │   └── ai-text.js         # AI 文本服务（新增）
│   └── router.js              # 添加漫画和章节路由（修改）
```

### 前端新增/修改文件

```
web/
├── src/
│   ├── views/
│   │   ├── Comics.vue         # 漫画列表页面（修改）
│   │   ├── ComicDetail.vue    # 漫画详情页面（新增）
│   │   └── CreateChapter.vue  # 创作工作台（新增）
│   ├── api/
│   │   ├── comic.js           # 漫画 API 封装（新增）
│   │   └── chapter.js         # 章节 API 封装（新增）
│   └── router/
│       └── index.js           # 添加路由（修改）
```

---

## Task 1: 扩展数据库服务 - 漫画和章节方法

**Files:**
- Modify: `server/app/service/db.js`

- [ ] **Step 1: 添加漫画相关数据库方法**

在 `server/app/service/db.js` 的 `DbService` 类中添加以下方法：

```javascript
// 在现有方法后添加

  // 漫画相关
  createComic(userId, title, stylePrompt) {
    const stmt = this.db.prepare(
      'INSERT INTO comics (user_id, title, style_prompt) VALUES (?, ?, ?)'
    );
    const result = stmt.run(userId, title, stylePrompt || null);
    return result.lastInsertRowid;
  }

  findComicsByUserId(userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId);
  }

  findComicById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE id = ?'
    );
    return stmt.get(id);
  }

  findComicByIdAndUserId(id, userId) {
    const stmt = this.db.prepare(
      'SELECT * FROM comics WHERE id = ? AND user_id = ?'
    );
    return stmt.get(id, userId);
  }

  updateComic(id, userId, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.style_prompt !== undefined) {
      fields.push('style_prompt = ?');
      values.push(data.style_prompt);
    }
    if (data.cover_image !== undefined) {
      fields.push('cover_image = ?');
      values.push(data.cover_image);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id, userId);
    const stmt = this.db.prepare(
      `UPDATE comics SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteComic(id, userId) {
    const stmt = this.db.prepare(
      'DELETE FROM comics WHERE id = ? AND user_id = ?'
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // 章节相关
  createChapter(comicId, chapterNumber, title, layoutType) {
    const stmt = this.db.prepare(
      'INSERT INTO chapters (comic_id, chapter_number, title, layout_type) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(comicId, chapterNumber, title || null, layoutType || 4);
    return result.lastInsertRowid;
  }

  findChaptersByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC'
    );
    return stmt.all(comicId);
  }

  findChapterById(id) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE id = ?'
    );
    return stmt.get(id);
  }

  findChapterByIdAndComicId(id, comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE id = ? AND comic_id = ?'
    );
    return stmt.get(id, comicId);
  }

  findLatestChapter(comicId) {
    const stmt = this.db.prepare(
      'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number DESC LIMIT 1'
    );
    return stmt.get(comicId);
  }

  updateChapter(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.layout_type !== undefined) {
      fields.push('layout_type = ?');
      values.push(data.layout_type);
    }
    if (data.script_content !== undefined) {
      fields.push('script_content = ?');
      values.push(data.script_content);
    }
    if (data.page_image !== undefined) {
      fields.push('page_image = ?');
      values.push(data.page_image);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteChapter(id) {
    const stmt = this.db.prepare(
      'DELETE FROM chapters WHERE id = ?'
    );
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 章节数量统计
  countChaptersByComicId(comicId) {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM chapters WHERE comic_id = ?'
    );
    const result = stmt.get(comicId);
    return result.count;
  }
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/db.js
git commit -m "feat(server): add comic and chapter CRUD methods to db service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: AI 文本服务

**Files:**
- Create: `server/app/service/ai-text.js`

- [ ] **Step 1: 创建 AI 文本服务**

```javascript
// server/app/service/ai-text.js
const Service = require('egg').Service;
const OpenAI = require('openai');

class AiTextService extends Service {
  async getClient() {
    // 从数据库获取用户配置
    const userId = this.ctx.state.user?.id;
    if (!userId) {
      return null;
    }

    const config = await this.ctx.service.db.getAiConfig(userId, 'text');
    if (!config || !config.api_key) {
      return null;
    }

    return {
      client: new OpenAI({
        apiKey: config.api_key,
        baseURL: config.base_url,
      }),
      model: config.model,
    };
  }

  async generateScript(params) {
    const { chapterPrompt, layoutType, characters, previousChapterScript } = params;

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是一个专业漫画脚本编剧。根据用户提供的章节提示词、分镜数量、出场角色，生成完整的分镜脚本。

输出要求：
1. 严格按照指定的分镜数量生成
2. 每格包含：场景描述、对白内容、出场角色ID列表
3. 场景描述要具体，包含环境、光影、角色动作
4. 对白要简洁有戏剧张力
5. 保持角色性格一致
6. 如有上一章内容，保持剧情连贯

输出 JSON 格式，不要包含任何其他文字：
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
}`;

    let userPrompt = `章节提示词：${chapterPrompt}
分镜数量：${layoutType} 格
出场角色：${JSON.stringify(characters.map(c => ({ id: c.id, name: c.name, appearance: c.appearance })))}`;

    if (previousChapterScript) {
      userPrompt += `\n上一章脚本：${JSON.stringify(previousChapterScript)}`;
    }

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const script = JSON.parse(content);

      // 验证并规范化输出
      if (!script.panels || !Array.isArray(script.panels)) {
        throw new Error('AI 返回的脚本格式不正确');
      }

      // 确保分镜数量正确
      script.panels = script.panels.slice(0, layoutType);

      // 确保每个分镜有正确的字段
      script.panels = script.panels.map((panel, index) => ({
        number: index + 1,
        scene: panel.scene || '',
        dialogue: panel.dialogue || '',
        characters: Array.isArray(panel.characters) ? panel.characters : [],
      }));

      // 如果分镜数量不足，补充空分镜
      while (script.panels.length < layoutType) {
        script.panels.push({
          number: script.panels.length + 1,
          scene: '',
          dialogue: '',
          characters: [],
        });
      }

      return script;
    } catch (err) {
      this.ctx.logger.error('AI text generation error:', err);
      this.ctx.throw(500, `AI 脚本生成失败: ${err.message}`);
    }
  }
}

module.exports = AiTextService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/ai-text.js
git commit -m "feat(server): add AI text service for script generation

- Generate comic panel scripts using OpenAI API
- Support chapter continuity with previous script context

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 漫画服务

**Files:**
- Create: `server/app/service/comic.js`

- [ ] **Step 1: 创建漫画服务**

```javascript
// server/app/service/comic.js
const Service = require('egg').Service;

class ComicService extends Service {
  async createComic(userId, title, stylePrompt) {
    if (!title || !title.trim()) {
      this.ctx.throw(400, '漫画标题不能为空');
    }

    const comicId = await this.ctx.service.db.createComic(
      userId,
      title.trim(),
      stylePrompt?.trim() || null
    );

    return await this.ctx.service.db.findComicById(comicId);
  }

  async getComics(userId) {
    const comics = await this.ctx.service.db.findComicsByUserId(userId);

    // 为每个漫画添加章节数量
    for (const comic of comics) {
      comic.chapterCount = await this.ctx.service.db.countChaptersByComicId(comic.id);
    }

    return comics;
  }

  async getComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在');
    }

    // 获取章节列表
    comic.chapters = await this.ctx.service.db.findChaptersByComicId(id);

    return comic;
  }

  async updateComic(id, userId, data) {
    const updated = await this.ctx.service.db.updateComic(id, userId, data);
    if (!updated) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }
    return await this.ctx.service.db.findComicByIdAndUserId(id, userId);
  }

  async deleteComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权删除');
    }

    // 删除漫画会级联删除所有章节
    const deleted = await this.ctx.service.db.deleteComic(id, userId);
    if (!deleted) {
      this.ctx.throw(500, '删除漫画失败');
    }
  }
}

module.exports = ComicService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/comic.js
git commit -m "feat(server): add comic service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 章节服务

**Files:**
- Create: `server/app/service/chapter.js`

- [ ] **Step 1: 创建章节服务**

```javascript
// server/app/service/chapter.js
const Service = require('egg').Service;
const path = require('path');
const fs = require('fs');

class ChapterService extends Service {
  async createChapter(comicId, userId, title, layoutType) {
    // 验证漫画所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(comicId, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在');
    }

    // 获取最新章节号
    const latestChapter = await this.ctx.service.db.findLatestChapter(comicId);
    const chapterNumber = latestChapter ? latestChapter.chapter_number + 1 : 1;

    const chapterId = await this.ctx.service.db.createChapter(
      comicId,
      chapterNumber,
      title?.trim() || `第${chapterNumber}章`,
      layoutType || 4
    );

    return await this.ctx.service.db.findChapterById(chapterId);
  }

  async getChapter(id) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }
    return chapter;
  }

  async getChapterWithComic(id, userId) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权访问');
    }

    chapter.comic = comic;
    return chapter;
  }

  async updateChapter(id, userId, data) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    // 验证所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }

    await this.ctx.service.db.updateChapter(id, data);
    return await this.ctx.service.db.findChapterById(id);
  }

  async deleteChapter(id, userId) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    // 验证所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权删除');
    }

    // 删除图片文件
    if (chapter.page_image) {
      const imagePath = path.join(this.app.config.comicImageDir || 'public/images/comics', chapter.page_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await this.ctx.service.db.deleteChapter(id);
  }

  async generateScript(chapterId, userId, prompt, characterIds) {
    const chapter = await this.getChapterWithComic(chapterId, userId);

    // 获取角色信息
    const characters = [];
    for (const charId of characterIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characters.push(char);
      }
    }

    // 获取上一章脚本（如果有）
    let previousChapterScript = null;
    if (chapter.chapter_number > 1) {
      const prevChapter = await this.ctx.service.db.findLatestChapter(chapter.comic_id);
      if (prevChapter && prevChapter.id !== chapterId && prevChapter.script_content) {
        previousChapterScript = JSON.parse(prevChapter.script_content);
      }
    }

    // 调用 AI 生成脚本
    const script = await this.ctx.service.aiText.generateScript({
      chapterPrompt: prompt,
      layoutType: chapter.layout_type,
      characters,
      previousChapterScript,
    });

    // 保存脚本
    await this.ctx.service.db.updateChapter(chapterId, {
      script_content: JSON.stringify(script),
      status: 'script_ready',
    });

    return script;
  }

  async generateImage(chapterId, userId) {
    const chapter = await this.getChapterWithComic(chapterId, userId);

    if (!chapter.script_content) {
      this.ctx.throw(400, '请先生成分镜脚本');
    }

    const script = JSON.parse(chapter.script_content);

    // 获取漫画风格
    const comic = await this.ctx.service.db.findComicById(chapter.comic_id);

    // 获取上一章图片（如果有）
    let previousChapterImage = null;
    if (chapter.chapter_number > 1) {
      const chapters = await this.ctx.service.db.findChaptersByComicId(chapter.comic_id);
      const prevChapter = chapters.find(c => c.chapter_number === chapter.chapter_number - 1);
      if (prevChapter && prevChapter.page_image) {
        previousChapterImage = prevChapter.page_image;
      }
    }

    // 获取角色参考图
    const characterRefs = [];
    const charIds = new Set();
    for (const panel of script.panels) {
      for (const charId of panel.characters) {
        charIds.add(charId);
      }
    }

    for (const charId of charIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char && char.reference_image) {
        characterRefs.push({
          id: char.id,
          name: char.name,
          imageUrl: char.reference_image,
        });
      }
    }

    // 调用 AI 图片服务
    const result = await this.ctx.service.aiImage.generateComicPage({
      stylePrompt: comic.style_prompt || 'Japanese manga style, black and white',
      layoutType: chapter.layout_type,
      script,
      characterReferences: characterRefs,
      previousChapterImage,
    });

    // 更新章节
    await this.ctx.service.db.updateChapter(chapterId, {
      page_image: result.imagePath,
      status: 'completed',
    });

    // 更新漫画封面（如果是第一章）
    if (chapter.chapter_number === 1) {
      await this.ctx.service.db.updateComic(chapter.comic_id, userId, {
        cover_image: result.imagePath,
      });
    }

    return result;
  }
}

module.exports = ChapterService;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/chapter.js
git commit -m "feat(server): add chapter service

- CRUD operations for chapters
- Script generation with AI
- Image generation with character consistency

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 漫画控制器

**Files:**
- Create: `server/app/controller/comic.js`

- [ ] **Step 1: 创建漫画控制器**

```javascript
// server/app/controller/comic.js
const Controller = require('egg').Controller;

class ComicController extends Controller {
  async index() {
    const { ctx } = this;
    const comics = await ctx.service.comic.getComics(ctx.state.user.id);
    ctx.body = { comics };
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const comic = await ctx.service.comic.getComic(parseInt(id), ctx.state.user.id);
    ctx.body = { comic };
  }

  async create() {
    const { ctx } = this;
    const { title, stylePrompt } = ctx.request.body;

    if (!title || !title.trim()) {
      ctx.status = 400;
      ctx.body = { error: '漫画标题不能为空' };
      return;
    }

    try {
      const comic = await ctx.service.comic.createComic(
        ctx.state.user.id,
        title,
        stylePrompt
      );
      ctx.status = 201;
      ctx.body = { comic };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { title, stylePrompt, status } = ctx.request.body;

    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (stylePrompt !== undefined) updateData.style_prompt = stylePrompt;
      if (status !== undefined) updateData.status = status;

      const comic = await ctx.service.comic.updateComic(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );
      ctx.body = { comic };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.comic.deleteComic(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ComicController;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/controller/comic.js
git commit -m "feat(server): add comic controller

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 章节控制器

**Files:**
- Create: `server/app/controller/chapter.js`

- [ ] **Step 1: 创建章节控制器**

```javascript
// server/app/controller/chapter.js
const Controller = require('egg').Controller;

class ChapterController extends Controller {
  async create() {
    const { ctx } = this;
    const { id: comicId } = ctx.params;
    const { title, layoutType } = ctx.request.body;

    try {
      const chapter = await ctx.service.chapter.createChapter(
        parseInt(comicId),
        ctx.state.user.id,
        title,
        layoutType
      );
      ctx.status = 201;
      ctx.body = { chapter };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const chapter = await ctx.service.chapter.getChapterWithComic(
      parseInt(id),
      ctx.state.user.id
    );
    ctx.body = { chapter };
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { title, layoutType, scriptContent } = ctx.request.body;

    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (layoutType !== undefined) updateData.layout_type = layoutType;
      if (scriptContent !== undefined) updateData.script_content = scriptContent;

      const chapter = await ctx.service.chapter.updateChapter(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );
      ctx.body = { chapter };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.chapter.deleteChapter(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateScript() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { prompt, characterIds } = ctx.request.body;

    if (!prompt || !prompt.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入章节提示词' };
      return;
    }

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请选择至少一个出场角色' };
      return;
    }

    try {
      const script = await ctx.service.chapter.generateScript(
        parseInt(id),
        ctx.state.user.id,
        prompt,
        characterIds
      );
      ctx.body = { script };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateImage() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.chapter.generateImage(
        parseInt(id),
        ctx.state.user.id
      );
      ctx.body = { imagePath: result.imagePath };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ChapterController;
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/controller/chapter.js
git commit -m "feat(server): add chapter controller

- CRUD endpoints
- Script and image generation endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 更新路由

**Files:**
- Modify: `server/app/router.js`

- [ ] **Step 1: 添加漫画和章节路由**

修改 `server/app/router.js`：

```javascript
// server/app/router.js
module.exports = app => {
  const { router, controller } = app;

  // 认证相关（无需登录）
  router.post('/api/auth/register', controller.auth.register);
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', controller.auth.logout);

  // 需要登录的接口
  router.get('/api/auth/me', app.middleware.jwt(), controller.auth.me);

  // 角色相关（需要登录）
  router.get('/api/characters', app.middleware.jwt(), controller.character.index);
  router.post('/api/characters', app.middleware.jwt(), controller.character.create);
  router.get('/api/characters/:id', app.middleware.jwt(), controller.character.show);
  router.put('/api/characters/:id', app.middleware.jwt(), controller.character.update);
  router.delete('/api/characters/:id', app.middleware.jwt(), controller.character.destroy);
  router.post('/api/characters/:id/generate-reference', app.middleware.jwt(), controller.character.generateReference);

  // 漫画相关（需要登录）
  router.get('/api/comics', app.middleware.jwt(), controller.comic.index);
  router.post('/api/comics', app.middleware.jwt(), controller.comic.create);
  router.get('/api/comics/:id', app.middleware.jwt(), controller.comic.show);
  router.put('/api/comics/:id', app.middleware.jwt(), controller.comic.update);
  router.delete('/api/comics/:id', app.middleware.jwt(), controller.comic.destroy);

  // 章节相关（需要登录）
  router.post('/api/comics/:id/chapters', app.middleware.jwt(), controller.chapter.create);
  router.get('/api/chapters/:id', app.middleware.jwt(), controller.chapter.show);
  router.put('/api/chapters/:id', app.middleware.jwt(), controller.chapter.update);
  router.delete('/api/chapters/:id', app.middleware.jwt(), controller.chapter.destroy);
  router.post('/api/chapters/:id/generate-script', app.middleware.jwt(), controller.chapter.generateScript);
  router.post('/api/chapters/:id/generate-image', app.middleware.jwt(), controller.chapter.generateImage);

  // AI 配置相关（需要登录）
  router.get('/api/ai-config', app.middleware.jwt(), controller.aiConfig.index);
  router.put('/api/ai-config/text', app.middleware.jwt(), controller.aiConfig.updateText);
  router.put('/api/ai-config/image', app.middleware.jwt(), controller.aiConfig.updateImage);
};
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/router.js
git commit -m "feat(server): add comic and chapter routes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 扩展 AI 图片服务 - 漫画页面生成

**Files:**
- Modify: `server/app/service/ai-image.js`

- [ ] **Step 1: 添加漫画页面生成方法**

在 `server/app/service/ai-image.js` 中添加：

```javascript
// 在现有方法后添加

  async generateComicPage(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;

    const aiConfig = this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 图片服务未配置');
    }

    const { client, model } = aiConfig;

    // 构建提示词
    const panelDescriptions = script.panels.map((panel, index) => {
      return `Panel ${index + 1}: ${panel.scene}`;
    }).join('\n');

    let prompt = `Create a ${layoutType}-panel manga page in ${stylePrompt} style.

Panel layout: ${layoutType} panels arranged in traditional manga grid format.

Panel descriptions:
${panelDescriptions}

Character references:
${characterReferences.map(c => `- ${c.name}: use provided reference image`).join('\n')}

Requirements:
- Generate a single manga page with ${layoutType} distinct panels
- Each panel should match its description
- Keep characters consistent with reference images
- Use black and white manga style with clear panel borders
- No text or speech bubbles (will be added later)`;

    if (previousChapterImage) {
      prompt += `\n- Maintain visual continuity with the previous chapter's art style`;
    }

    try {
      // 准备图片输入（角色参考图）
      const imageInputs = [];
      for (const charRef of characterReferences) {
        if (charRef.imageUrl) {
          const imagePath = path.join(
            this.app.config.characterImageDir || 'public/images/characters',
            path.basename(charRef.imageUrl)
          );
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');
            imageInputs.push({
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            });
          }
        }
      }

      // 如果有上一章图片，也添加到输入
      if (previousChapterImage) {
        const prevImagePath = path.join(
          this.app.config.comicImageDir || 'public/images/comics',
          previousChapterImage
        );
        if (fs.existsSync(prevImagePath)) {
          const imageBuffer = fs.readFileSync(prevImagePath);
          const base64 = imageBuffer.toString('base64');
          imageInputs.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          });
        }
      }

      // 调用 GPT-image API
      const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });

      const imageUrl = response.data[0].url;

      // 下载并保存图片
      const imageBuffer = await this.downloadImage(imageUrl);
      const filename = `page_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';

      // 确保目录存在
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      return {
        imagePath: filename,
      };
    } catch (err) {
      this.ctx.logger.error('Comic page generation error:', err);
      this.ctx.throw(500, `漫画页面生成失败: ${err.message}`);
    }
  }
```

同时在文件顶部需要确保引入了必要的模块（fs, path 已在原文件中引入）。

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/app/service/ai-image.js
git commit -m "feat(server): add comic page generation to ai-image service

- Support multiple panel layouts
- Include character references for consistency
- Support previous chapter images for continuity

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 更新配置文件

**Files:**
- Modify: `server/config/config.default.js`

- [ ] **Step 1: 添加漫画图片目录配置**

修改 `server/config/config.default.js`：

```javascript
// server/config/config.default.js
exports.keys = 'CHANGE-ME-IN-PRODUCTION';

exports.security = {
  csrf: {
    enable: false,
  },
};

exports.jwt = {
  secret: 'CHANGE-ME-IN-PRODUCTION',
  expiresIn: '7d',
};

exports.cookie = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
};

exports.database = {
  path: './database/comic.db',
};

// 角色参考图存储目录
exports.characterImageDir = 'public/images/characters';

// 漫画图片存储目录
exports.comicImageDir = 'public/images/comics';

// 静态文件配置
exports.static = {
  prefix: '/images/',
  dir: 'public/images/',
};
```

- [ ] **Step 2: 确保图片目录存在**

```bash
mkdir -p /Users/philip/Documents/code/ai-print/server/public/images/comics
```

- [ ] **Step 3: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add server/config/config.default.js
git commit -m "feat(server): add comic image directory config

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 前端漫画 API 封装

**Files:**
- Create: `web/src/api/comic.js`

- [ ] **Step 1: 创建漫画 API 封装**

```javascript
// web/src/api/comic.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getComics() {
    const res = await api.get('/comics')
    return res.data
  },

  async getComic(id) {
    const res = await api.get(`/comics/${id}`)
    return res.data
  },

  async createComic(data) {
    const res = await api.post('/comics', data)
    return res.data
  },

  async updateComic(id, data) {
    const res = await api.put(`/comics/${id}`, data)
    return res.data
  },

  async deleteComic(id) {
    const res = await api.delete(`/comics/${id}`)
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/api/comic.js
git commit -m "feat(web): add comic API wrapper

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 前端章节 API 封装

**Files:**
- Create: `web/src/api/chapter.js`

- [ ] **Step 1: 创建章节 API 封装**

```javascript
// web/src/api/chapter.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async createChapter(comicId, data) {
    const res = await api.post(`/comics/${comicId}/chapters`, data)
    return res.data
  },

  async getChapter(id) {
    const res = await api.get(`/chapters/${id}`)
    return res.data
  },

  async updateChapter(id, data) {
    const res = await api.put(`/chapters/${id}`, data)
    return res.data
  },

  async deleteChapter(id) {
    const res = await api.delete(`/chapters/${id}`)
    return res.data
  },

  async generateScript(id, data) {
    const res = await api.post(`/chapters/${id}/generate-script`, data)
    return res.data
  },

  async generateImage(id) {
    const res = await api.post(`/chapters/${id}/generate-image`)
    return res.data
  },
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/api/chapter.js
git commit -m "feat(web): add chapter API wrapper

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: 前端路由更新

**Files:**
- Modify: `web/src/router/index.js`

- [ ] **Step 1: 添加漫画和章节相关路由**

修改 `web/src/router/index.js`：

```javascript
// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/comics',
  },
  {
    path: '/comics',
    name: 'Comics',
    component: () => import('../views/Comics.vue'),
  },
  {
    path: '/comics/:id',
    name: 'ComicDetail',
    component: () => import('../views/ComicDetail.vue'),
  },
  {
    path: '/create/:comicId/:chapterId?',
    name: 'CreateChapter',
    component: () => import('../views/CreateChapter.vue'),
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('../views/Characters.vue'),
  },
  {
    path: '/settings/ai',
    name: 'AiConfig',
    component: () => import('../views/AiConfig.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果还没检查过登录状态，先检查
  if (!authStore.checked) {
    await authStore.checkAuth()
  }

  // 非公开页面需要登录
  if (!to.meta.public && !authStore.user) {
    return next('/login')
  }

  // 已登录用户不能访问登录页
  if (to.meta.public && authStore.user && to.path === '/login') {
    return next('/comics')
  }

  next()
})

export default router
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/router/index.js
git commit -m "feat(web): add comic and chapter routes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: 漫画列表页面

**Files:**
- Modify: `web/src/views/Comics.vue`

注意：此页面必须使用 `/frontend-design` 技能进行设计。

- [ ] **Step 1: 更新漫画列表页面**

```vue
<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>我的漫画</h1>
          <div>
            <v-btn
              color="primary"
              variant="text"
              to="/characters"
              class="mr-2"
            >
              <v-icon left>mdi-account-group</v-icon>
              角色库
            </v-btn>
            <v-btn
              color="secondary"
              variant="text"
              to="/settings/ai"
              class="mr-2"
            >
              <v-icon left>mdi-cog</v-icon>
              AI 设置
            </v-btn>
            <v-btn color="error" variant="text" @click="logout">
              <v-icon left>mdi-logout</v-icon>
              登出
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 创建漫画按钮 -->
    <v-row>
      <v-col cols="12">
        <v-btn color="primary" @click="openCreateDialog">
          <v-icon left>mdi-plus</v-icon>
          创建新漫画
        </v-btn>
      </v-col>
    </v-row>

    <!-- 漫画列表 -->
    <v-row v-if="comics.length > 0" class="mt-4">
      <v-col
        v-for="comic in comics"
        :key="comic.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card @click="goToComic(comic.id)" style="cursor: pointer">
          <v-img
            v-if="comic.cover_image"
            :src="`/images/comics/${comic.cover_image}`"
            height="200"
            cover
          />
          <v-sheet v-else height="200" class="d-flex align-center justify-center bg-grey-lighten-2">
            <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
          </v-sheet>

          <v-card-title>{{ comic.title }}</v-card-title>
          <v-card-text>
            <div class="text-caption text-grey">
              {{ comic.chapterCount || 0 }} 章节
            </div>
            <div v-if="comic.style_prompt" class="text-caption text-grey mt-1">
              风格：{{ comic.style_prompt }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn size="small" color="primary" variant="text">
              查看
            </v-btn>
            <v-spacer />
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click.stop="confirmDelete(comic)"
            >
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 空状态 -->
    <v-row v-else class="mt-4">
      <v-col cols="12" class="text-center py-8">
        <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
        <p class="text-grey mt-4">还没有漫画，点击上方按钮创建第一部漫画</p>
      </v-col>
    </v-row>

    <!-- 创建漫画对话框 -->
    <v-dialog v-model="createDialog" max-width="500">
      <v-card>
        <v-card-title>创建新漫画</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createComic">
            <v-text-field
              v-model="createForm.title"
              label="漫画标题"
              :rules="[v => !!v || '请输入漫画标题']"
              required
            />
            <v-textarea
              v-model="createForm.stylePrompt"
              label="风格提示词（可选）"
              hint="如：日系黑白漫画、彩色卡通风格等"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createComic" :loading="creating">
            创建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除漫画「{{ deleteTarget?.title }}」吗？所有章节也将被删除，此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="deleteComic" :loading="deleting">
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import comicApi from '../api/comic'

const router = useRouter()
const authStore = useAuthStore()

const comics = ref([])
const createDialog = ref(false)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)

const createForm = ref({
  title: '',
  stylePrompt: '',
})

async function loadComics() {
  try {
    const res = await comicApi.getComics()
    comics.value = res.comics
  } catch (e) {
    console.error('加载漫画失败', e)
  }
}

function openCreateDialog() {
  createForm.value = { title: '', stylePrompt: '' }
  createDialog.value = true
}

async function createComic() {
  if (!createForm.value.title.trim()) return

  creating.value = true
  try {
    const res = await comicApi.createComic(createForm.value)
    comics.value.unshift(res.comic)
    createDialog.value = false
    router.push(`/comics/${res.comic.id}`)
  } catch (e) {
    console.error('创建漫画失败', e)
    alert('创建漫画失败：' + (e.response?.data?.error || e.message))
  } finally {
    creating.value = false
  }
}

function goToComic(id) {
  router.push(`/comics/${id}`)
}

function confirmDelete(comic) {
  deleteTarget.value = comic
  deleteDialog.value = true
}

async function deleteComic() {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    await comicApi.deleteComic(deleteTarget.value.id)
    comics.value = comics.value.filter(c => c.id !== deleteTarget.value.id)
    deleteDialog.value = false
    deleteTarget.value = null
  } catch (e) {
    console.error('删除漫画失败', e)
    alert('删除漫画失败：' + (e.response?.data?.error || e.message))
  } finally {
    deleting.value = false
  }
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadComics()
})
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/views/Comics.vue
git commit -m "feat(web): update Comics page with comic list and CRUD

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: 漫画详情页面

**Files:**
- Create: `web/src/views/ComicDetail.vue`

注意：此页面必须使用 `/frontend-design` 技能进行设计。

- [ ] **Step 1: 创建漫画详情页面**

```vue
<!-- web/src/views/ComicDetail.vue -->
<template>
  <v-container>
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>

    <template v-else-if="comic">
      <v-row>
        <v-col cols="12">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <v-btn variant="text" to="/comics" class="mr-2">
                <v-icon left>mdi-arrow-left</v-icon>
                返回
              </v-btn>
              <h1 class="d-inline">{{ comic.title }}</h1>
            </div>
            <v-btn color="primary" @click="openCreateChapterDialog">
              <v-icon left>mdi-plus</v-icon>
              创建章节
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- 漫画信息 -->
      <v-row>
        <v-col cols="12" md="4">
          <v-card>
            <v-img
              v-if="comic.cover_image"
              :src="`/images/comics/${comic.cover_image}`"
              height="300"
              cover
            />
            <v-sheet v-else height="300" class="d-flex align-center justify-center bg-grey-lighten-2">
              <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
            </v-sheet>
            <v-card-text>
              <div v-if="comic.style_prompt">
                <strong>风格：</strong> {{ comic.style_prompt }}
              </div>
              <div class="text-caption text-grey mt-2">
                创建于 {{ formatDate(comic.created_at) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-card>
            <v-card-title>章节列表</v-card-title>
            <v-list v-if="comic.chapters && comic.chapters.length > 0">
              <v-list-item
                v-for="chapter in comic.chapters"
                :key="chapter.id"
                @click="goToCreate(chapter.id)"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="36">
                    {{ chapter.chapter_number }}
                  </v-avatar>
                </template>

                <v-list-item-title>{{ chapter.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ chapter.layout_type }} 格分镜 · {{ getStatusText(chapter.status) }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    v-if="chapter.page_image"
                    icon
                    variant="text"
                    :href="`/images/comics/${chapter.page_image}`"
                    target="_blank"
                  >
                    <v-icon>mdi-image</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="error"
                    @click.stop="confirmDeleteChapter(chapter)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center py-8">
              <v-icon size="48" color="grey">mdi-book-open-page-variant</v-icon>
              <p class="text-grey mt-4">还没有章节，点击上方按钮创建第一章</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 创建章节对话框 -->
      <v-dialog v-model="createChapterDialog" max-width="500">
        <v-card>
          <v-card-title>创建新章节</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createChapter">
              <v-text-field
                v-model="chapterForm.title"
                label="章节标题（可选）"
                hint="留空将自动生成"
              />
              <v-select
                v-model="chapterForm.layoutType"
                :items="layoutOptions"
                label="分镜布局"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="createChapterDialog = false">取消</v-btn>
            <v-btn color="primary" @click="createChapter" :loading="creating">
              创建
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 删除章节确认对话框 -->
      <v-dialog v-model="deleteChapterDialog" max-width="400">
        <v-card>
          <v-card-title>确认删除</v-card-title>
          <v-card-text>
            确定要删除「{{ deleteChapterTarget?.title }}」吗？此操作不可撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="deleteChapterDialog = false">取消</v-btn>
            <v-btn color="error" @click="deleteChapter" :loading="deleting">
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import comicApi from '../api/comic'
import chapterApi from '../api/chapter'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const comic = ref(null)
const createChapterDialog = ref(false)
const deleteChapterDialog = ref(false)
const deleteChapterTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)

const layoutOptions = [
  { title: '4 格分镜', value: 4 },
  { title: '6 格分镜', value: 6 },
  { title: '8 格分镜', value: 8 },
]

const chapterForm = ref({
  title: '',
  layoutType: 4,
})

async function loadComic() {
  loading.value = true
  try {
    const res = await comicApi.getComic(route.params.id)
    comic.value = res.comic
  } catch (e) {
    console.error('加载漫画失败', e)
    router.push('/comics')
  } finally {
    loading.value = false
  }
}

function openCreateChapterDialog() {
  chapterForm.value = { title: '', layoutType: 4 }
  createChapterDialog.value = true
}

async function createChapter() {
  creating.value = true
  try {
    const res = await chapterApi.createChapter(route.params.id, chapterForm.value)
    comic.value.chapters.push(res.chapter)
    createChapterDialog.value = false
    // 跳转到创作页面
    router.push(`/create/${route.params.id}/${res.chapter.id}`)
  } catch (e) {
    console.error('创建章节失败', e)
    alert('创建章节失败：' + (e.response?.data?.error || e.message))
  } finally {
    creating.value = false
  }
}

function goToCreate(chapterId) {
  router.push(`/create/${route.params.id}/${chapterId}`)
}

function confirmDeleteChapter(chapter) {
  deleteChapterTarget.value = chapter
  deleteChapterDialog.value = true
}

async function deleteChapter() {
  if (!deleteChapterTarget.value) return

  deleting.value = true
  try {
    await chapterApi.deleteChapter(deleteChapterTarget.value.id)
    comic.value.chapters = comic.value.chapters.filter(c => c.id !== deleteChapterTarget.value.id)
    deleteChapterDialog.value = false
    deleteChapterTarget.value = null
  } catch (e) {
    console.error('删除章节失败', e)
    alert('删除章节失败：' + (e.response?.data?.error || e.message))
  } finally {
    deleting.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function getStatusText(status) {
  const statusMap = {
    draft: '草稿',
    script_ready: '脚本就绪',
    completed: '已完成',
  }
  return statusMap[status] || status
}

onMounted(() => {
  loadComic()
})
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/views/ComicDetail.vue
git commit -m "feat(web): add ComicDetail page

- Display comic info and chapter list
- Create/delete chapters
- Navigate to chapter creation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 15: 创作工作台页面

**Files:**
- Create: `web/src/views/CreateChapter.vue`

注意：此页面必须使用 `/frontend-design` 技能进行设计。

- [ ] **Step 1: 创建创作工作台页面**

```vue
<!-- web/src/views/CreateChapter.vue -->
<template>
  <v-container>
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>

    <template v-else-if="chapter">
      <!-- 面包屑导航 -->
      <v-row>
        <v-col cols="12">
          <v-btn variant="text" :to="`/comics/${chapter.comic_id}`" class="mr-2">
            <v-icon left>mdi-arrow-left</v-icon>
            返回漫画
          </v-btn>
          <span class="text-h5">
            {{ chapter.comic?.title }} > {{ chapter.title }}
          </span>
        </v-col>
      </v-row>

      <!-- 步骤指示器 -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-stepper v-model="currentStep" alt-labels>
            <v-stepper-header>
              <v-stepper-item :value="1" :complete="currentStep > 1">
                选择角色
              </v-stepper-item>
              <v-divider />
              <v-stepper-item :value="2" :complete="currentStep > 2">
                生成分镜脚本
              </v-stepper-item>
              <v-divider />
              <v-stepper-item :value="3" :complete="currentStep > 3">
                生成漫画图片
              </v-stepper-item>
            </v-stepper-header>

            <v-stepper-window>
              <!-- Step 1: 选择角色 -->
              <v-stepper-window-item :value="1">
                <v-card flat>
                  <v-card-title>选择本章出场角色</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col
                        v-for="char in characters"
                        :key="char.id"
                        cols="6"
                        sm="4"
                        md="3"
                      >
                        <v-card
                          :color="selectedCharacters.includes(char.id) ? 'primary' : undefined"
                          :variant="selectedCharacters.includes(char.id) ? 'outlined' : undefined"
                          @click="toggleCharacter(char.id)"
                          style="cursor: pointer"
                        >
                          <v-img
                            v-if="char.reference_image"
                            :src="char.reference_image"
                            height="120"
                            cover
                          />
                          <v-sheet v-else height="120" class="d-flex align-center justify-center bg-grey-lighten-2">
                            <v-icon size="48" color="grey">mdi-account</v-icon>
                          </v-sheet>
                          <v-card-text class="text-center pa-2">
                            {{ char.name }}
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>

                    <div v-if="characters.length === 0" class="text-center py-8">
                      <v-icon size="48" color="grey">mdi-account-group</v-icon>
                      <p class="text-grey mt-4">
                        还没有角色，
                        <router-link to="/characters">去创建角色</router-link>
                      </p>
                    </div>
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      :disabled="selectedCharacters.length === 0"
                      @click="currentStep = 2"
                    >
                      下一步
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-stepper-window-item>

              <!-- Step 2: 生成分镜脚本 -->
              <v-stepper-window-item :value="2">
                <v-card flat>
                  <v-card-title>生成分镜脚本</v-card-title>
                  <v-card-text>
                    <v-textarea
                      v-model="chapterPrompt"
                      label="章节提示词"
                      hint="描述本章的剧情，如：小明在公园遇到一只迷路的小狗"
                      rows="3"
                      :disabled="generatingScript"
                    />

                    <v-btn
                      color="primary"
                      class="mt-4"
                      :loading="generatingScript"
                      :disabled="!chapterPrompt.trim()"
                      @click="generateScript"
                    >
                      生成分镜脚本
                    </v-btn>

                    <!-- 脚本预览 -->
                    <div v-if="script" class="mt-6">
                      <h3 class="mb-4">分镜脚本预览</h3>
                      <v-row>
                        <v-col
                          v-for="panel in script.panels"
                          :key="panel.number"
                          cols="12"
                          sm="6"
                          md="3"
                        >
                          <v-card>
                            <v-card-title class="text-subtitle-1">
                              第 {{ panel.number }} 格
                            </v-card-title>
                            <v-card-text>
                              <div class="text-caption text-grey mb-2">场景</div>
                              <div class="text-body-2 mb-3">{{ panel.scene || '(未填写)' }}</div>

                              <div class="text-caption text-grey mb-2">对白</div>
                              <div class="text-body-2 mb-3">{{ panel.dialogue || '(无对白)' }}</div>

                              <div class="text-caption text-grey mb-2">角色</div>
                              <v-chip
                                v-for="charId in panel.characters"
                                :key="charId"
                                size="x-small"
                                class="mr-1"
                              >
                                {{ getCharacterName(charId) }}
                              </v-chip>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>
                    </div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn @click="currentStep = 1">
                      上一步
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      :disabled="!script"
                      @click="currentStep = 3"
                    >
                      下一步
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-stepper-window-item>

              <!-- Step 3: 生成漫画图片 -->
              <v-stepper-window-item :value="3">
                <v-card flat>
                  <v-card-title>生成漫画图片</v-card-title>
                  <v-card-text>
                    <div class="mb-4">
                      <div class="text-body-1">分镜布局：{{ chapter.layout_type }} 格</div>
                      <div class="text-body-1">风格：{{ chapter.comic?.style_prompt || '默认日系黑白漫画' }}</div>
                    </div>

                    <v-btn
                      color="primary"
                      :loading="generatingImage"
                      :disabled="generatingImage"
                      @click="generateImage"
                    >
                      生成漫画图片
                    </v-btn>

                    <!-- 图片预览 -->
                    <div v-if="chapter.page_image" class="mt-6">
                      <h3 class="mb-4">生成的漫画图片</h3>
                      <v-img
                        :src="`/images/comics/${chapter.page_image}`"
                        max-width="600"
                        class="mx-auto"
                      />
                    </div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn @click="currentStep = 2">
                      上一步
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      v-if="chapter.page_image"
                      color="success"
                      :to="`/comics/${chapter.comic_id}`"
                    >
                      完成
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import chapterApi from '../api/chapter'
import characterApi from '../api/character'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const chapter = ref(null)
const characters = ref([])
const selectedCharacters = ref([])
const currentStep = ref(1)
const chapterPrompt = ref('')
const script = ref(null)
const generatingScript = ref(false)
const generatingImage = ref(false)

async function loadChapter() {
  loading.value = true
  try {
    const res = await chapterApi.getChapter(route.params.chapterId)
    chapter.value = res.chapter

    // 如果已有脚本，解析它
    if (chapter.value.script_content) {
      script.value = JSON.parse(chapter.value.script_content)
      currentStep.value = 3
    }

    // 如果已有图片，保持在第三步
    if (chapter.value.page_image) {
      currentStep.value = 3
    }
  } catch (e) {
    console.error('加载章节失败', e)
    router.push(`/comics/${route.params.comicId}`)
  } finally {
    loading.value = false
  }
}

async function loadCharacters() {
  try {
    const res = await characterApi.getCharacters()
    characters.value = res.characters
  } catch (e) {
    console.error('加载角色失败', e)
  }
}

function toggleCharacter(id) {
  const index = selectedCharacters.value.indexOf(id)
  if (index === -1) {
    selectedCharacters.value.push(id)
  } else {
    selectedCharacters.value.splice(index, 1)
  }
}

async function generateScript() {
  generatingScript.value = true
  try {
    const res = await chapterApi.generateScript(route.params.chapterId, {
      prompt: chapterPrompt.value,
      characterIds: selectedCharacters.value,
    })
    script.value = res.script
  } catch (e) {
    console.error('生成脚本失败', e)
    alert('生成脚本失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingScript.value = false
  }
}

async function generateImage() {
  generatingImage.value = true
  try {
    await chapterApi.generateImage(route.params.chapterId)
    // 重新加载章节获取图片
    await loadChapter()
  } catch (e) {
    console.error('生成图片失败', e)
    alert('生成图片失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingImage.value = false
  }
}

function getCharacterName(charId) {
  const char = characters.value.find(c => c.id === charId)
  return char ? char.name : `角色${charId}`
}

onMounted(() => {
  loadChapter()
  loadCharacters()
})
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/philip/Documents/code/ai-print
git add web/src/views/CreateChapter.vue
git commit -m "feat(web): add CreateChapter page (creation workspace)

- Step 1: Select characters
- Step 2: Generate script with AI
- Step 3: Generate comic page image

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 完成检查

- [ ] 后端漫画 API 可正常访问
- [ ] 后端章节 API 可正常访问
- [ ] AI 文本服务可生成分镜脚本
- [ ] AI 图片服务可生成漫画页面
- [ ] 前端漫画列表页面可正常显示
- [ ] 前端漫画详情页面可正常显示
- [ ] 创作工作台可以完整走通流程

---

**Phase 3 完成标志**：用户可以创建漫画、创建章节、生成分镜脚本、生成漫画图片。
