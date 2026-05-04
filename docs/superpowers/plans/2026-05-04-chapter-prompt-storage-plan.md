# 章节提示词与角色选择存储 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将用户提交的章节提示词和出场角色ID列表持久化存储到数据库，方便用户回顾和复盘。

**Architecture:** 在 chapters 表新增两个字段，修改 generateScript 服务方法存储用户输入，前端加载章节时回显已存储的数据。

**Tech Stack:** Egg.js, SQLite, Vue 3, Vuetify

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/database/init.sql` | 修改 | 建表语句添加新字段 |
| `server/app/service/db.js` | 修改 | updateChapter 支持新字段 |
| `server/app/service/chapter.js` | 修改 | generateScript 存储提示词和角色ID |
| `web/src/views/CreateChapter.vue` | 修改 | 加载时回显已存储的数据 |

---

### Task 1: 数据库表结构更新

**Files:**
- Modify: `server/database/init.sql:37-48`

- [ ] **Step 1: 更新建表语句**

在 chapters 表添加 `chapter_prompt` 和 `character_ids` 字段：

```sql
-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comic_id INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(200),
  layout_type INTEGER DEFAULT 4,
  chapter_prompt TEXT,
  character_ids TEXT,
  script_content TEXT,
  page_image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: 数据库迁移**

对于已存在的数据库，需要手动执行迁移SQL：

```sql
ALTER TABLE chapters ADD COLUMN chapter_prompt TEXT;
ALTER TABLE chapters ADD COLUMN character_ids TEXT;
```

- [ ] **Step 3: 提交**

```bash
git add server/database/init.sql
git commit -m "feat(db): chapters 表添加 chapter_prompt 和 character_ids 字段"
```

---

### Task 2: 后端 db.js 支持新字段

**Files:**
- Modify: `server/app/service/db.js:288-322`

- [ ] **Step 1: 更新 updateChapter 方法**

在 `updateChapter` 方法中添加对新字段的支持：

```javascript
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
  if (data.chapter_prompt !== undefined) {
    fields.push('chapter_prompt = ?');
    values.push(data.chapter_prompt);
  }
  if (data.character_ids !== undefined) {
    fields.push('character_ids = ?');
    values.push(data.character_ids);
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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/db.js
git commit -m "feat(db): updateChapter 支持 chapter_prompt 和 character_ids 字段"
```

---

### Task 3: 后端 chapter.js 存储用户输入

**Files:**
- Modify: `server/app/service/chapter.js:90-127`

- [ ] **Step 1: 修改 generateScript 方法**

在调用 AI 之前，先存储用户输入的提示词和角色ID：

```javascript
async generateScript(chapterId, userId, prompt, characterIds) {
  const chapter = await this.getChapterWithComic(chapterId, userId);

  // 存储用户输入的提示词和角色ID
  await this.ctx.service.db.updateChapter(chapterId, {
    chapter_prompt: prompt,
    character_ids: JSON.stringify(characterIds),
  });

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
    const chapters = await this.ctx.service.db.findChaptersByComicId(chapter.comic_id);
    const prevChapter = chapters.find(c => c.chapter_number === chapter.chapter_number - 1);
    if (prevChapter && prevChapter.script_content) {
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
```

- [ ] **Step 2: 提交**

```bash
git add server/app/service/chapter.js
git commit -m "feat(chapter): generateScript 存储 chapter_prompt 和 character_ids"
```

---

### Task 4: 前端加载已存储的数据

**Files:**
- Modify: `web/src/views/CreateChapter.vue`

- [ ] **Step 1: 加载章节时回显已存储的数据**

修改 `loadChapter` 函数，加载已存储的提示词和角色ID：

```javascript
async function loadChapter() {
  loading.value = true
  try {
    const res = await chapterApi.getChapter(route.params.chapterId)
    chapter.value = res.chapter

    // 如果已存储提示词，回显
    if (chapter.value.chapter_prompt) {
      chapterPrompt.value = chapter.value.chapter_prompt
    }

    // 如果已存储角色ID，回显
    if (chapter.value.character_ids) {
      selectedCharacters.value = JSON.parse(chapter.value.character_ids)
    }

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
```

- [ ] **Step 2: 提交**

```bash
git add web/src/views/CreateChapter.vue
git commit -m "feat(frontend): 章节编辑页加载已存储的提示词和角色"
```

---

### Task 5: 集成测试

- [ ] **Step 1: 启动后端服务**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 启动前端服务**

```bash
cd web && npm run dev
```

- [ ] **Step 3: 验证流程**

1. 创建新章节
2. 选择角色，输入提示词，生成分镜脚本
3. 刷新页面，确认角色选择和提示词已回显
4. 修改提示词和角色，重新生成脚本
5. 确认数据库中数据已更新

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 章节提示词与角色选择存储功能完成"
```
