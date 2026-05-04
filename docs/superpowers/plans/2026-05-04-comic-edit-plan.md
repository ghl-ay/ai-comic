# 漫画标题和风格编辑功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在漫画详情页添加标题行内编辑和风格弹窗编辑功能

**Architecture:** 修改 ComicDetail.vue 单一文件，添加状态变量、UI 元素和保存逻辑。后端 API 已完备，无需后端改动。

**Tech Stack:** Vue 3 Composition API, Vuetify 3, Axios

---

### Task 1: 添加标题行内编辑状态和方法

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 添加标题编辑相关状态变量**

在 `const exporting = ref(false)` 后面添加：

```javascript
const editingTitle = ref(false)
const editTitleValue = ref('')
const savingTitle = ref(false)
```

- [ ] **Step 2: 添加标题编辑方法**

在 `function formatDate(dateStr)` 前面添加：

```javascript
function startEditTitle() {
  editTitleValue.value = comic.value.title
  editingTitle.value = true
}

async function saveTitle() {
  if (!editTitleValue.value.trim()) {
    editTitleValue.value = comic.value.title
    editingTitle.value = false
    return
  }

  if (editTitleValue.value === comic.value.title) {
    editingTitle.value = false
    return
  }

  savingTitle.value = true
  try {
    await comicApi.updateComic(comic.value.id, { title: editTitleValue.value })
    comic.value.title = editTitleValue.value
    editingTitle.value = false
  } catch (e) {
    console.error('保存标题失败', e)
    alert('保存失败：' + (e.response?.data?.error || e.message))
    editTitleValue.value = comic.value.title
  } finally {
    savingTitle.value = false
  }
}

function cancelEditTitle() {
  editTitleValue.value = comic.value.title
  editingTitle.value = false
}
```

---

### Task 2: 实现标题行内编辑 UI

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 修改标题显示区域**

将第 19 行的 `<h1>{{ comic.title }}</h1>` 替换为：

```html
<h1 v-if="!editingTitle" class="d-flex align-center" style="cursor: pointer" @click="startEditTitle">
  {{ comic.title }}
  <v-icon size="small" class="ml-2" color="grey">mdi-pencil</v-icon>
</h1>
<v-text-field
  v-else
  v-model="editTitleValue"
  variant="outlined"
  density="compact"
  hide-details
  :loading="savingTitle"
  @blur="saveTitle"
  @keyup.enter="saveTitle"
  @keyup.escape="cancelEditTitle"
  style="max-width: 400px"
/>
```

- [ ] **Step 2: 手动测试标题编辑功能**

1. 启动开发服务器：`cd /Users/philip/Documents/code/ai-print/web && npm run dev`
2. 打开漫画详情页，点击标题进入编辑模式
3. 修改标题后失焦，确认自动保存
4. 按 Escape 确认取消编辑
5. 确认空标题时恢复原值

---

### Task 3: 添加风格弹窗编辑状态和方法

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 添加风格编辑相关状态变量**

在 `const editingTitle = ref(false)` 后面添加：

```javascript
const styleDialog = ref(false)
const editStyleValue = ref('')
const savingStyle = ref(false)
```

- [ ] **Step 2: 添加风格编辑方法**

在 `function cancelEditTitle()` 后面添加：

```javascript
function openStyleDialog() {
  editStyleValue.value = comic.value.style_prompt || ''
  styleDialog.value = true
}

async function saveStyle() {
  savingStyle.value = true
  try {
    await comicApi.updateComic(comic.value.id, { stylePrompt: editStyleValue.value })
    comic.value.style_prompt = editStyleValue.value
    styleDialog.value = false
  } catch (e) {
    console.error('保存风格失败', e)
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    savingStyle.value = false
  }
}
```

---

### Task 4: 实现风格弹窗编辑 UI

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 在风格显示区域添加编辑按钮**

将第 64-66 行：
```html
<div v-if="comic.style_prompt">
  <strong>风格：</strong> {{ comic.style_prompt }}
</div>
```

替换为：
```html
<div class="d-flex align-center">
  <div v-if="comic.style_prompt">
    <strong>风格：</strong> {{ comic.style_prompt }}
  </div>
  <div v-else class="text-grey">
    未设置风格
  </div>
  <v-btn size="small" variant="text" class="ml-2" @click="openStyleDialog">
    <v-icon>mdi-pencil</v-icon>
    编辑
  </v-btn>
</div>
```

- [ ] **Step 2: 添加风格编辑对话框**

在删除章节确认对话框（第 151-166 行）后面添加：

```html
<!-- 编辑风格对话框 -->
<v-dialog v-model="styleDialog" max-width="500">
  <v-card>
    <v-card-title>编辑风格提示词</v-card-title>
    <v-card-text>
      <v-textarea
        v-model="editStyleValue"
        label="风格提示词"
        hint="如：日系黑白漫画、彩色卡通风格等"
        rows="3"
      />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn @click="styleDialog = false">取消</v-btn>
      <v-btn color="primary" @click="saveStyle" :loading="savingStyle">
        保存
      </v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
```

- [ ] **Step 3: 手动测试风格编辑功能**

1. 打开漫画详情页，点击"编辑"按钮打开弹窗
2. 修改风格提示词，点击"保存"确认保存成功
3. 点击"取消"确认弹窗关闭且不保存
4. 测试网络错误时显示错误提示

---

### Task 5: 提交代码

**Files:**
- Modify: `web/src/views/ComicDetail.vue`

- [ ] **Step 1: 提交所有修改**

```bash
git add web/src/views/ComicDetail.vue
git commit -m "feat(comic): 添加标题和风格编辑功能

- 标题支持行内编辑，失焦自动保存
- 风格通过弹窗编辑，显式保存

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
