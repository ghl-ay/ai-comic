# 短篇漫画功能技术设计文档

## 1. 设计概述

方案C：comics 表加 `type` 字段，自动创建 chapter 记录复用已有结构。生成单张完整漫画图片。

## 2. 数据库设计

### 2.1 comics 表改动

```sql
ALTER TABLE comics ADD COLUMN type VARCHAR(20) DEFAULT 'normal';
```

### 2.2 数据结构映射

```
短篇漫画创建流程：
1. comics 表插入记录 (type='short', title, style_prompt)
2. chapters 表自动插入一条记录
```

| 短篇漫画字段 | 存储位置 | 对应字段 |
|-------------|----------|----------|
| 标题 | comics.title | title |
| 风格 | comics.style_prompt | style_prompt |
| 类型 | comics.type | 'short' |
| 布局 | chapters.layout_type | layout_type |
| 剧情描述 | chapters.chapter_prompt | chapter_prompt |
| 分镜脚本 | chapters.script_content | script_content |
| 漫画图片 | chapters.page_image | page_image (单张) |

## 3. 前端设计

### 3.1 Comics.vue 改动

```vue
<!-- 顶部按钮区新增 -->
<v-btn
  variant="outlined"
  color="secondary"
  size="large"
  to="/short-comic/create"
>
  <v-icon left>mdi-lightning-bolt</v-icon>
  创建短篇漫画
</v-btn>
```

```javascript
// goToComic 函数修改
function goToComic(id) {
  const comic = comics.value.find(c => c.id === id)
  if (comic?.type === 'short') {
    router.push(`/short-comic/${id}/edit`)
  } else {
    router.push(`/comics/${id}`)
  }
}
```

### 3.2 ComicCard.vue 改动

```vue
<div class="comic-card__badges">
  <v-chip
    v-if="comic.type === 'short'"
    size="small"
    color="orange"
    variant="flat"
    class="comic-card__badge"
  >
    短篇
  </v-chip>
  <v-chip
    v-if="comic.chapterCount && comic.type !== 'short'"
    size="small"
    color="primary"
    variant="flat"
    class="comic-card__badge"
  >
    {{ comic.chapterCount }} 章节
  </v-chip>
</div>
```

### 3.3 CreateShortComic.vue

```vue
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-btn variant="text" to="/comics" class="mr-2">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <span class="text-h5">{{ isEditMode ? '编辑短篇漫画' : '创建短篇漫画' }}</span>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="currentTab" color="primary" align-tabs="center">
            <v-tab :value="1">
              <v-icon start>mdi-text-box-outline</v-icon>
              输入剧情
            </v-tab>
            <v-tab :value="2">
              <v-icon start>mdi-script-text</v-icon>
              生成分镜脚本
            </v-tab>
            <v-tab :value="3">
              <v-icon start>mdi-image</v-icon>
              生成漫画图片
            </v-tab>
          </v-tabs>

          <v-divider />

          <v-window v-model="currentTab" class="pa-4">
            <!-- Tab 1: 输入剧情 -->
            <v-window-item :value="1">
              <v-card flat>
                <v-card-text>
                  <v-text-field
                    v-model="formData.title"
                    label="漫画标题"
                    :rules="[v => !!v || '标题为必填项']"
                    class="mb-4"
                  />
                  <v-select
                    v-model="formData.layout"
                    :items="layoutOptions"
                    label="分镜布局"
                    class="mb-4"
                  />
                  <v-select
                    v-model="formData.style"
                    :items="styleOptions"
                    label="漫画风格"
                    class="mb-4"
                  />
                  <v-textarea
                    v-model="formData.description"
                    label="剧情描述"
                    :rules="[v => !!v || '剧情描述为必填项']"
                    rows="4"
                    class="mb-4"
                  />
                  <v-btn
                    variant="text"
                    color="primary"
                    :loading="optimizing"
                    @click="optimizePrompt"
                  >
                    <v-icon left>mdi-auto-fix</v-icon>
                    AI 优化提示词
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Tab 2: 生成分镜脚本 -->
            <v-window-item :value="2">
              <v-card flat>
                <v-card-text>
                  <v-textarea
                    v-model="formData.prompt"
                    label="分镜提示词"
                    hint="可根据需要编辑"
                    rows="3"
                    class="mb-4"
                  />
                  <v-btn
                    color="primary"
                    :loading="generatingScript"
                    @click="generateScript"
                  >
                    生成分镜脚本
                  </v-btn>
                  <div v-if="formData.script" class="mt-6">
                    <h3 class="mb-4">分镜脚本预览</h3>
                    <v-card variant="outlined">
                      <v-card-text>
                        <pre style="white-space: pre-wrap">{{ formData.script }}</pre>
                      </v-card-text>
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Tab 3: 生成漫画图片 -->
            <v-window-item :value="3">
              <v-card flat>
                <v-card-text>
                  <div class="mb-4">
                    <div class="text-body-1">标题：{{ formData.title }}</div>
                    <div class="text-body-1">布局：{{ getLayoutName(formData.layout) }}</div>
                    <div class="text-body-1">风格：{{ getStyleName(formData.style) }}</div>
                  </div>
                  <v-btn
                    color="primary"
                    :loading="generatingImage"
                    @click="generateImage"
                  >
                    生成漫画图片
                  </v-btn>
                  <div v-if="imageUrl" class="mt-6">
                    <h3 class="mb-4">生成的漫画图片</h3>
                    <v-card>
                      <v-img :src="imageUrl" max-width="600" class="mx-auto" />
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>

          <v-divider />
          <v-card-actions class="pa-4">
            <v-btn v-if="currentTab > 1" variant="outlined" @click="currentTab--">
              上一步
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="currentTab < 3"
              color="primary"
              :disabled="currentTab === 1 && !formData.title"
              @click="currentTab++"
            >
              下一步
            </v-btn>
            <v-btn
              v-if="currentTab === 3 && imageUrl"
              color="success"
              @click="handleComplete"
            >
              完成
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const comicId = computed(() => route.params.id)
const isEditMode = computed(() => !!comicId.value)
const currentTab = ref(1)
const optimizing = ref(false)
const generatingScript = ref(false)
const generatingImage = ref(false)
const imageUrl = ref(null)
const chapterId = ref(null)

const formData = ref({
  title: '',
  layout: '4',
  style: 'color',
  description: '',
  prompt: '',
  script: ''
})

const layoutOptions = [
  { title: '4 格', value: '4' },
  { title: '6 格', value: '6' },
  { title: '8 格', value: '8' },
  { title: '自由布局', value: 'free' }
]

const styleOptions = [
  { title: '彩色漫画', value: 'color' },
  { title: '黑白漫画', value: 'bw' },
  { title: '水彩风格', value: 'watercolor' },
  { title: '像素风格', value: 'pixel' }
]

function getLayoutName(value) {
  return layoutOptions.find(i => i.value === value)?.title || value
}

function getStyleName(value) {
  return styleOptions.find(i => i.value === value)?.title || value
}

async function optimizePrompt() {
  if (!formData.value.description) return
  optimizing.value = true
  try {
    const res = await axios.post('/api/short-comic/optimize-prompt', {
      description: formData.value.description
    })
    formData.value.description = res.data.data.optimizedPrompt
  } catch (e) {
    alert('优化失败：' + e.message)
  } finally {
    optimizing.value = false
  }
}

async function generateScript() {
  generatingScript.value = true
  try {
    const res = await axios.post('/api/short-comic/generate-script', {
      prompt: formData.value.prompt
    })
    formData.value.script = res.data.data.script
  } catch (e) {
    alert('生成失败：' + e.message)
  } finally {
    generatingScript.value = false
  }
}

async function generateImage() {
  generatingImage.value = true
  try {
    const res = await axios.post('/api/short-comic/generate-image', {
      comicId: comicId.value,
      script: formData.value.script,
      style: formData.value.style,
      layout: formData.value.layout
    })
    imageUrl.value = res.data.data.imageUrl
  } catch (e) {
    alert('生成失败：' + e.message)
  } finally {
    generatingImage.value = false
  }
}

async function handleComplete() {
  router.push('/comics')
}

onMounted(async () => {
  if (isEditMode.value) {
    const res = await axios.get(`/api/short-comic/${comicId.value}`)
    const data = res.data.data
    chapterId.value = data.chapter_id
    formData.value = {
      title: data.title,
      layout: String(data.layout_type),
      style: data.style_prompt || 'color',
      description: data.chapter_prompt || '',
      prompt: data.chapter_prompt || '',
      script: data.script_content || ''
    }
    if (data.page_image) {
      imageUrl.value = `/images/comics/${data.page_image}`
    }
    if (data.script_content) currentTab.value = 2
    if (data.page_image) currentTab.value = 3
  }
})
</script>
```

## 4. 后端设计

### 4.1 路由配置

```javascript
// server/app/router.js 新增
router.get('/api/short-comic/:id', app.middleware.jwt(), controller.shortComic.get);
router.post('/api/short-comic', app.middleware.jwt(), controller.shortComic.create);
router.put('/api/short-comic/:id', app.middleware.jwt(), controller.shortComic.update);
router.post('/api/short-comic/optimize-prompt', app.middleware.jwt(), controller.shortComic.optimizePrompt);
router.post('/api/short-comic/generate-script', app.middleware.jwt(), controller.shortComic.generateScript);
router.post('/api/short-comic/generate-image', app.middleware.jwt(), controller.shortComic.generateImage);
```

### 4.2 Controller 实现

```javascript
// server/app/controller/shortComic.js
const Controller = require('egg').Controller;

class ShortComicController extends Controller {
  async get() {
    const { ctx } = this;
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    
    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(id), userId);
    
    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }
    
    const chapter = await ctx.service.db.findChapterByComicId(comic.id);
    
    ctx.body = {
      data: {
        ...comic,
        chapter_id: chapter?.id,
        layout_type: chapter?.layout_type,
        chapter_prompt: chapter?.chapter_prompt,
        script_content: chapter?.script_content,
        page_image: chapter?.page_image
      }
    };
  }

  async create() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { title, layout, style, description, script } = ctx.request.body;
    
    // 创建 comic
    const comicId = await ctx.service.db.createComic(userId, title, style);
    await ctx.service.db.updateComic(comicId, userId, { type: 'short' });
    
    // 创建 chapter
    await ctx.service.db.createChapter(comicId, 1, '短篇漫画', parseInt(layout));
    const chapter = await ctx.service.db.findChapterByComicId(comicId);
    
    if (chapter) {
      await ctx.service.db.updateChapter(chapter.id, userId, {
        chapter_prompt: description,
        script_content: script
      });
    }
    
    ctx.status = 201;
    ctx.body = { data: { id: comicId } };
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    const { title, layout, style, description, script } = ctx.request.body;
    
    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(id), userId);
    
    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }
    
    // 更新 comic
    await ctx.service.db.updateComic(parseInt(id), userId, {
      title,
      style_prompt: style
    });
    
    // 更新 chapter
    const chapter = await ctx.service.db.findChapterByComicId(comic.id);
    if (chapter) {
      await ctx.service.db.updateChapter(chapter.id, userId, {
        layout_type: parseInt(layout),
        chapter_prompt: description,
        script_content: script
      });
    }
    
    ctx.body = { data: { success: true } };
  }

  async optimizePrompt() {
    const { ctx } = this;
    const { description } = ctx.request.body;
    const result = await ctx.service.aiText.optimizePrompt(description);
    ctx.body = { data: { optimizedPrompt: result } };
  }

  async generateScript() {
    const { ctx } = this;
    const { prompt } = ctx.request.body;
    const result = await ctx.service.aiText.generateShortComicScript(prompt);
    ctx.body = { data: { script: result } };
  }

  async generateImage() {
    const { ctx } = this;
    const { comicId, script, style, layout } = ctx.request.body;
    const userId = ctx.state.user.id;
    
    const result = await ctx.service.aiImage.generateShortComicImage(
      script, style, parseInt(layout)
    );
    
    // 更新 chapter 的 page_image
    const chapter = await ctx.service.db.findChapterByComicId(parseInt(comicId));
    if (chapter) {
      await ctx.service.db.updateChapter(chapter.id, userId, {
        page_image: result.imagePath
      });
      
      // 更新 cover_image
      await ctx.service.db.updateComic(parseInt(comicId), userId, {
        cover_image: result.imagePath
      });
    }
    
    ctx.body = { data: { imageUrl: `/images/comics/${result.imagePath}` } };
  }
}

module.exports = ShortComicController;
```

### 4.3 db.js 新增方法

```javascript
// server/app/service/db.js 新增

// 根据 comicId 查找 chapter
findChapterByComicId(comicId) {
  const stmt = this.db.prepare(
    'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number LIMIT 1'
  );
  return stmt.get(comicId);
}

// updateComic 支持 type 字段
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
  if (data.type !== undefined) {  // 新增
    fields.push('type = ?');
    values.push(data.type);
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
```

## 5. 数据流

```
创建短篇漫画：
POST /api/short-comic { title, layout, style, description, script }
         ↓
1. comics 表插入 (type='short', title, style_prompt)
2. chapters 表插入 (comic_id, layout_type, chapter_prompt, script_content)
         ↓
生成漫画图片：
POST /api/short-comic/generate-image { comicId, script, style, layout }
         ↓
1. 调用 AI 生成图片
2. 更新 chapters.page_image
3. 更新 comics.cover_image
```

## 6. 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-06-01 | 1.0 | 初始技术设计文档 | AI Agent |
| 2026-06-01 | 1.1 | 改为方案C，复用chapters表 | AI Agent |
| 2026-06-01 | 1.2 | 移除images字段，使用单张page_image | AI Agent |
