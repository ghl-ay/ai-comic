# 卡片高度一致性与文本省略实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一角色库和漫画列表页面的卡片高度为 420px，并为溢出文本添加省略号显示。

**Architecture:** 为两个 Vue 组件添加 scoped CSS 样式类，通过 CSS `-webkit-line-clamp` 实现多行文本省略，使用 flex 布局确保卡片内容正确填充。

**Tech Stack:** Vue 3, Vuetify 3, CSS

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `web/src/views/Characters.vue` | 修改 | 添加 CSS 样式，应用样式类到角色卡片 |
| `web/src/views/Comics.vue` | 修改 | 添加 CSS 样式，应用样式类到漫画卡片 |

---

### Task 1: 修改角色库页面卡片样式

**Files:**
- Modify: `web/src/views/Characters.vue`

- [ ] **Step 1: 为角色卡片添加 CSS 样式类**

在 `<style>` 标签中添加以下 scoped 样式：

```vue
<style scoped>
.card-fixed {
  height: 420px;
  display: flex;
  flex-direction: column;
}

.card-fixed .v-card-text {
  flex: 1;
  overflow: hidden;
}

.text-ellipsis-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: 应用样式类到角色卡片 v-card**

将第 26 行的 `<v-card>` 修改为：

```vue
<v-card class="card-fixed">
```

- [ ] **Step 3: 为角色名称添加单行省略**

将第 37 行的 `<v-card-title>` 修改为：

```vue
<v-card-title class="text-ellipsis-1">{{ character.name }}</v-card-title>
```

- [ ] **Step 4: 为角色描述添加三行省略**

将第 39-41 行的描述 div 修改为：

```vue
<div v-if="character.description" class="mb-2 text-ellipsis-3">
  {{ character.description }}
</div>
```

- [ ] **Step 5: 为外观描述添加三行省略**

将第 42-44 行的外观 div 修改为：

```vue
<div v-if="character.appearance" class="text-caption text-grey text-ellipsis-3">
  外观：{{ character.appearance }}
</div>
```

- [ ] **Step 6: 启动开发服务器验证修改**

Run: `cd /Users/philip/Documents/code/ai-print/web && npm run dev`

在浏览器中访问角色库页面，验证：
- 卡片高度一致为 420px
- 长文本标题显示单行省略号
- 长描述/外观显示三行省略号

- [ ] **Step 7: 提交角色库页面修改**

```bash
git add web/src/views/Characters.vue
git commit -m "style: 角色卡片高度固定，文本溢出省略

- 卡片统一 420px 高度
- 标题单行省略
- 描述/外观三行省略

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 修改漫画列表页面卡片样式

**Files:**
- Modify: `web/src/views/Comics.vue`

- [ ] **Step 1: 为漫画卡片添加 CSS 样式类**

在 `<style>` 标签中添加以下 scoped 样式：

```vue
<style scoped>
.card-fixed {
  height: 420px;
  display: flex;
  flex-direction: column;
}

.card-fixed .v-card-text {
  flex: 1;
  overflow: hidden;
}

.text-ellipsis-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: 应用样式类到漫画卡片 v-card**

将第 65 行的 `<v-card>` 修改为：

```vue
<v-card class="card-fixed" @click="goToComic(comic.id)" style="cursor: pointer">
```

- [ ] **Step 3: 为漫画标题添加单行省略**

将第 76 行的 `<v-card-title>` 修改为：

```vue
<v-card-title class="text-ellipsis-1">{{ comic.title }}</v-card-title>
```

- [ ] **Step 4: 为风格描述添加三行省略**

将第 81-83 行的风格 div 修改为：

```vue
<div v-if="comic.style_prompt" class="text-caption text-grey mt-1 text-ellipsis-3">
  风格：{{ comic.style_prompt }}
</div>
```

- [ ] **Step 5: 启动开发服务器验证修改**

Run: `cd /Users/philip/Documents/code/ai-print/web && npm run dev`

在浏览器中访问漫画列表页面，验证：
- 卡片高度一致为 420px
- 长文本标题显示单行省略号
- 长风格描述显示三行省略号

- [ ] **Step 6: 提交漫画列表页面修改**

```bash
git add web/src/views/Comics.vue
git commit -m "style: 漫画卡片高度固定，文本溢出省略

- 卡片统一 420px 高度
- 标题单行省略
- 风格描述三行省略

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 验收清单

- [ ] 角色库页面所有卡片高度一致为 420px
- [ ] 漫画列表页面所有卡片高度一致为 420px
- [ ] 角色名称超出时显示单行省略号
- [ ] 漫画标题超出时显示单行省略号
- [ ] 角色描述/外观超出时显示三行省略号
- [ ] 漫画风格超出时显示三行省略号
- [ ] 卡片点击、编辑、删除功能正常
