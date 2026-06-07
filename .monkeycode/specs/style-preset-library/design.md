# 风格预设库 - 技术设计文档

## 1. 设计原则

**预设是 `style_prompt` 字段的快捷填充机制**——选择预设等于选择一段预写好的 style_prompt 文本，不引入新数据模型、不改变 AI 生成流程、完全向后兼容。

## 2. 数据库设计

### 2.1 新增 style_presets 表

```sql
CREATE TABLE IF NOT EXISTS style_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  style_prompt TEXT NOT NULL,
  description TEXT,
  cover_image VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| code | VARCHAR(50) | 唯一编码，如 `jp_monochrome` |
| name | VARCHAR(100) | 展示名称，如"日漫黑白" |
| category | VARCHAR(50) | 分类名，如"日系漫画" |
| style_prompt | TEXT | 实际写入 comics.style_prompt 的值 |
| description | TEXT | 补充说明，tooltip 展示 |
| cover_image | VARCHAR(255) | 示例图 URL |
| sort_order | INTEGER | 排序权重，升序 |
| is_enabled | INTEGER | 1=启用, 0=停用 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2.2 种子数据

在 `database/init.js` 中插入 18 条预设数据，完整 SQL 见附录 A。

### 2.3 不修改 comics 表

comics.style_prompt 字段保持不变，预设选择后只是往这个字段写入特定值。

## 3. 后端 API 设计

### 3.1 风格预设查询（用户侧）

```
GET /api/style-presets
```

**无需认证**（或 JWT 可选），返回所有启用的预设，按分类分组。

**响应示例**：

```json
{
  "categories": [
    {
      "name": "日系漫画",
      "sortOrder": 1,
      "presets": [
        {
          "id": 1,
          "code": "jp_monochrome",
          "name": "日漫黑白",
          "stylePrompt": "日系黑白漫画风格，精细线稿，网点纸阴影，高对比度黑白画面",
          "description": "经典日本漫画风格，适合少年向、热血题材",
          "coverImage": "/uploads/style-presets/jp_monochrome.jpg"
        }
      ]
    }
  ]
}
```

**实现要点**：
- 直接查询数据库，返回 `is_enabled = 1` 的预设
- 按 `category` 分组，每组内按 `sort_order` 排序
- 分类通过 `SELECT DISTINCT category` 获得，无需独立分类表
- MVP 版本不做内存缓存，单表查询性能可接受

### 3.2 风格预设管理（后台侧）

**权限要求**：仅管理员可访问，需 JWT 认证 + 管理员身份校验。

```
GET    /api/admin/style-presets          # 列表（含停用的）
POST   /api/admin/style-presets          # 新增
PUT    /api/admin/style-presets/:id      # 编辑
PUT    /api/admin/style-presets/:id/toggle  # 启用/停用
DELETE /api/admin/style-presets/:id      # 删除
```

**权限校验中间件**：

```javascript
// app/middleware/adminRequired.js
module.exports = () => {
  return async function adminRequired(ctx, next) {
    if (!ctx.state.user || !ctx.state.user.isAdmin) {
      ctx.status = 403;
      ctx.body = { error: '需要管理员权限' };
      return;
    }
    await next();
  };
};
```

**新增/编辑请求体**：

```json
{
  "code": "jp_monochrome",
  "name": "日漫黑白",
  "category": "日系漫画",
  "stylePrompt": "日系黑白漫画风格，精细线稿，网点纸阴影，高对比度黑白画面",
  "description": "经典日本漫画风格",
  "coverImage": "/uploads/style-presets/jp_monochrome.jpg",
  "sortOrder": 1,
  "isEnabled": true
}
```

### 3.3 分类管理方案

**MVP 方案**：分类信息不建独立表，通过查询预设数据动态获取。

**分类查询实现**：

```javascript
// app/service/stylePreset.js
async getCategories() {
  // 从预设数据中提取分类
  const rows = await this.app.db.query(
    `SELECT DISTINCT category, MIN(sort_order) as category_order
     FROM style_presets 
     WHERE is_enabled = 1
     GROUP BY category
     ORDER BY category_order`
  );
  return rows.map(row => row.category);
}
```

**分类排序逻辑**：使用该分类下最小 sort_order 作为分类排序权重。

**分类管理方式**：
- 新增分类：创建预设时填写新的 category 值即可
- 编辑分类名称：批量更新该分类下所有预设的 category 字段
- 删除分类：删除或移动该分类下所有预设，分类自动消失
- 分类排序：通过调整预设的 sort_order 间接调整分类顺序

**未来扩展接口预留**（本期不实现）：

```javascript
// 预留接口，便于未来迁移到独立分类表
async getCategoryList() {
  // 当前：从预设中提取
  // 未来：从 style_categories 表查询
}

async updateCategoryName(oldName, newName) {
  // 批量更新预设的 category 字段
  await this.app.db.run(
    'UPDATE style_presets SET category = ? WHERE category = ?',
    [newName, oldName]
  );
}
```

### 3.4 统一短篇漫画 API 字段名

**当前问题**：短篇漫画 API 使用 `style` 字段名，连载漫画使用 `stylePrompt`。

**变更**：

| API | 变更前 | 变更后 |
|-----|-------|-------|
| `POST /api/short-comic` | `{ style }` | `{ stylePrompt }` |
| `PUT /api/short-comic/:id` | `{ style }` | `{ stylePrompt }` |
| `POST /api/short-comic/generate-image` | `{ style }` | `{ stylePrompt }` |

**兼容处理**：后端同时接受 `stylePrompt` 和 `style`，优先取 `stylePrompt`，`style` 作为降级兼容，并在日志中标记 deprecated。一个版本后移除 `style`。

```javascript
const stylePrompt = ctx.request.body.stylePrompt || ctx.request.body.style;
if (ctx.request.body.style && !ctx.request.body.stylePrompt) {
  ctx.logger.warn('[DEPRECATED] short-comic API: use stylePrompt instead of style');
}
```

### 3.4 默认值统一

**当前三处硬编码默认值**：

1. `server/app/service/chapter.js:186` — `comic.style_prompt || '日系黑白漫画'`
2. `server/app/controller/shortComic.js:263` — `style || '彩色漫画'`
3. `server/app/service/novel.js:165` — `result.stylePrompt || '日系黑白漫画风格'`

**统一方案**：在 `app/service/stylePreset.js` 中提供 `getDefaultStylePrompt()` 方法：

```javascript
// app/service/stylePreset.js
async getDefaultStylePrompt() {
  // 使用固定预设编码获取默认值，保证稳定性
  const preset = await this.app.db.get(
    'SELECT style_prompt FROM style_presets WHERE code = ? AND is_enabled = 1',
    ['jp_monochrome']
  );
  // 若预设被停用或删除，降级为硬编码值
  return preset ? preset.style_prompt : '日系黑白漫画风格';
}
```

三处默认值均替换为 `ctx.service.stylePreset.getDefaultStylePrompt()`。

**稳定性说明**：使用固定编码 `jp_monochrome` 作为默认值来源，即使管理员调整排序，默认值也不会变化。只有当该预设被停用或删除时，才会降级为硬编码值。

## 4. 后端实现结构

### 4.1 新增文件

```
server/
  app/
    controller/
      stylePreset.js          # 用户侧查询
      admin/stylePreset.js     # 后台管理 CRUD
    service/
      stylePreset.js           # 预设业务逻辑
    router/
      stylePreset.js           # 路由定义
  database/
    seeds/
      style_presets.js         # 种子数据
```

### 4.2 Service 实现

```javascript
// app/service/stylePreset.js
const Service = require('egg').Service;

class StylePresetService extends Service {
  async getEnabledPresets() {
    return await this.app.db.query(
      'SELECT * FROM style_presets WHERE is_enabled = 1 ORDER BY category, sort_order'
    );
  }

  async getCategories() {
    // 从预设数据中提取分类，按该分类下最小 sort_order 排序
    const rows = await this.app.db.query(
      `SELECT DISTINCT category, MIN(sort_order) as category_order
       FROM style_presets 
       WHERE is_enabled = 1
       GROUP BY category
       ORDER BY category_order`
    );
    return rows.map(row => row.category);
  }

  async getDefaultStylePrompt() {
    // 使用固定预设编码获取默认值，保证稳定性
    const preset = await this.app.db.get(
      'SELECT style_prompt FROM style_presets WHERE code = ? AND is_enabled = 1',
      ['jp_monochrome']
    );
    // 若预设被停用或删除，降级为硬编码值
    return preset ? preset.style_prompt : '日系黑白漫画风格';
  }

  async getAllPresets() {
    return await this.app.db.query(
      'SELECT * FROM style_presets ORDER BY category, sort_order'
    );
  }

  async create(data) {
    const { code, name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    const result = await this.app.db.run(
      `INSERT INTO style_presets (code, name, category, style_prompt, description, cover_image, sort_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, category, stylePrompt, description, coverImage, sortOrder || 0, isEnabled ? 1 : 0]
    );
    return result.lastID;
  }

  async update(id, data) {
    const { name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = data;
    await this.app.db.run(
      `UPDATE style_presets SET name=?, category=?, style_prompt=?, description=?, cover_image=?, sort_order=?, is_enabled=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [name, category, stylePrompt, description, coverImage, sortOrder, isEnabled ? 1 : 0, id]
    );
  }

  async toggle(id) {
    await this.app.db.run(
      'UPDATE style_presets SET is_enabled = 1 - is_enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async destroy(id) {
    await this.app.db.run('DELETE FROM style_presets WHERE id = ?', [id]);
  }
}

module.exports = StylePresetService;
```

### 4.3 路由注册

```javascript
// app/router/stylePreset.js
module.exports = app => {
  const { router, controller, jwt } = app;
  const adminRequired = app.middleware.adminRequired();

  // 用户侧
  router.get('/api/style-presets', controller.stylePreset.index);

  // 后台管理（需 JWT + 管理员校验）
  router.get('/api/admin/style-presets', jwt, adminRequired, controller.admin.stylePreset.index);
  router.post('/api/admin/style-presets', jwt, adminRequired, controller.admin.stylePreset.create);
  router.put('/api/admin/style-presets/:id', jwt, adminRequired, controller.admin.stylePreset.update);
  router.put('/api/admin/style-presets/:id/toggle', jwt, adminRequired, controller.admin.stylePreset.toggle);
  router.delete('/api/admin/style-presets/:id', jwt, adminRequired, controller.admin.stylePreset.destroy);
};
```

## 5. 前端实现设计

### 5.1 新增文件

```
web/src/
  api/
    stylePreset.js              # 预设 API 调用
  components/
    style/
      StylePresetSelector.vue   # 风格预设选择器组件（核心）
      StylePresetCard.vue       # 单个预设卡片
      StylePresetGrid.vue       # 预设网格 + 分类 tab
  stores/
    stylePreset.js              # 预设状态管理
```

### 5.2 StylePresetSelector 组件设计

这是核心共享组件，三处复用：创建连载漫画、创建短篇漫画、编辑漫画风格。

**Props**：

| Prop | 类型 | 默认值 | 说明 |
|------|------|-------|------|
| modelValue | string | '' | 当前 style_prompt 值（v-model） |
| showAi | boolean | false | 是否显示 AI 生成按钮 |
| dense | boolean | false | 紧凑模式（用于对话框内） |

**Emits**：
- `update:modelValue`: 选择或输入后触发，传递 stylePrompt 字符串
- `confirm`: 点击"确定"按钮时触发（用于对话框场景）
- `cancel`: 点击"取消"按钮时触发（用于对话框场景）

**布局结构**：

```
┌─────────────────────────────────────────────────────────────┐
│  选择风格预设                                          [×]  │ ← 标题栏
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐                        │
│  │ 预设风格  │ 自定义    │ AI生成   │                        │ ← 模式tab
│  └──────────┴──────────┴──────────┘                        │
├─────────────────────────────────────────────────────────────┤
│  [日系漫画] [国风] [美系漫画] [卡通/绘本] [写实/照片] ...   │ ← 分类tab
├─────────────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                  │
│  │ [图]  │ │ [图]  │ │ [图]  │ │ [图]  │                  │
│  │ 日漫  │ │ 日漫  │ │ 少女  │ │ Q版   │ ← 预设卡片网格    │
│  │ 黑白  │ │ 彩漫  │ │  漫   │ │ 萌系  │   (2-4列响应式)  │
│  └───────┘ └───────┘ └───────┘ └───────┘                  │
│  ┌───────┐ ┌───────┐                                      │
│  │ [图]  │ │ [图]  │                                      │
│  │ ...   │ │ ...   │                                      │
│  └───────┘ └───────┘                                      │
├─────────────────────────────────────────────────────────────┤
│  当前风格: 日系黑白漫画风格，精细线稿...                     │ ← 当前选中展示
│  [取消]                                          [确定]    │ ← 操作按钮
└─────────────────────────────────────────────────────────────┘
```

**对话框参数**：
- 宽度：800px（桌面），90vw（移动端）
- 最大高度：70vh，内容区域可滚动
- 位置：居中显示
- 点击外部或按 ESC 关闭（不保存）

**预设卡片设计**：
- 尺寸：150px × 180px（桌面），120px × 150px（移动端）
- 内容：封面图（60%）+ 名称 + 描述（悬停显示）
- 选中态：蓝色边框（2px solid #1976d2）+ 右上角勾选图标
- 悬停态：elevation 提升至 8，显示 tooltip 完整描述
- 响应式网格：桌面 4 列，平板 3 列，移动端 2 列

**分类 tab 设计**：
- 高度：48px
- 可滚动：移动端横向滚动（小屏无法全部展示）
- 选中态：底部蓝色下划线
- 未选态：灰色文字

**自定义 tab**：

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 请输入风格描述...                                    │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  提示：描述画面风格、线条特点、色彩倾向等                   │
└─────────────────────────────────────────────────────────────┘
```

**交互流程**：
1. 打开对话框 → 默认显示"预设风格" tab，选中第一个分类
2. 点击预设卡片 → 卡片高亮，底部显示当前风格描述
3. 点击"确定" → 关闭对话框，emit 选中的 stylePrompt
4. 点击"取消"或外部 → 关闭对话框，不保存
5. 切换"自定义" tab → 显示 textarea，手动输入
6. 切换"AI生成" tab → 显示生成按钮（仅连载漫画可用）

**移动端适配**：
- 分类 tab 横向滚动（overflow-x: auto）
- 预设卡片 2 列布局（grid-template-columns: repeat(2, 1fr)）
- 对话框改为全屏（fullscreen 属性）或从底部弹出

### 5.3 预设状态管理

```javascript
// stores/stylePreset.js
export const useStylePresetStore = defineStore('stylePreset', () => {
  const categories = ref([]);
  const loading = ref(false);
  const loaded = ref(false);

  async function fetchPresets() {
    if (loaded.value) return;
    loading.value = true;
    try {
      const res = await stylePresetApi.list();
      categories.value = res.categories;
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  function getPresetByPrompt(stylePrompt) {
    for (const cat of categories.value) {
      const found = cat.presets.find(p => p.stylePrompt === stylePrompt);
      if (found) return found;
    }
    return null;
  }

  return { categories, loading, loaded, fetchPresets, getPresetByPrompt };
});
```

### 5.4 各页面集成方式

#### 创建连载漫画 (Comics.vue)

```diff
- <v-textarea v-model="createForm.stylePrompt" ... />
+ <StylePresetSelector
+   v-model="createForm.stylePrompt"
+   :show-ai="true"
+   dense
+ />
```

#### 创建短篇漫画 (CreateShortComic.vue)

```diff
- <v-select v-model="formData.style" :items="styleOptions" ... />
+ <StylePresetSelector
+   v-model="formData.stylePrompt"
+   dense
+ />
```

同时 `formData.style` 改为 `formData.stylePrompt`，默认值从 `'彩色漫画'` 改为 `''`。

#### 编辑漫画风格 (ComicDetail.vue)

在漫画详情页编辑风格时，采用"预设选择 + 手动编辑"的组合方式：

```vue
<template>
  <div class="style-edit-section">
    <v-btn
      variant="outlined"
      prepend-icon="mdi-palette"
      @click="openPresetDialog"
      class="mb-3"
    >
      从预设选择
    </v-btn>
    
    <v-textarea
      v-model="editStyleValue"
      label="风格描述"
      rows="3"
      outlined
    />
    
    <!-- 预设选择对话框 -->
    <v-dialog
      v-model="presetDialogVisible"
      max-width="800"
      :fullscreen="$vuetify.display.smAndDown"
    >
      <StylePresetSelector
        v-model="selectedPresetPrompt"
        :show-ai="false"
        @confirm="onPresetConfirm"
        @cancel="presetDialogVisible = false"
      />
    </v-dialog>
  </div>
</template>

<script setup>
const presetDialogVisible = ref(false);
const selectedPresetPrompt = ref('');

function openPresetDialog() {
  selectedPresetPrompt.value = editStyleValue.value;
  presetDialogVisible.value = true;
}

function onPresetConfirm(stylePrompt) {
  editStyleValue.value = stylePrompt;
  presetDialogVisible.value = false;
}
</script>
```

**交互说明**：
1. 点击"从预设选择"按钮 → 弹出预设选择对话框
2. 在对话框中选择预设或输入自定义文本
3. 点击"确定" → 关闭对话框，填充 stylePrompt 到 textarea
4. 用户仍可手动修改 textarea 内容
5. 移动端对话框改为全屏模式

### 5.5 已有漫画的风格回显

当编辑已有漫画时，需回显当前 style_prompt 对应的预设：

1. 调用 `store.getPresetByPrompt(comic.style_prompt)` 匹配预设
2. 若匹配到，高亮对应预设卡片，显示"预设：日漫黑白（已修改）"或"预设：日漫黑白"
3. 若未匹配到，切换到"自定义"tab，textarea 中显示原始值

## 6. 数据流设计

```
用户在 StylePresetSelector 中选择预设或输入自定义文本
    │
    ▼
StylePresetSelector 组件 emit('update:modelValue', stylePrompt)
    │
    ▼
父组件的 formData.stylePrompt = stylePrompt
    │
    ▼
API 请求: POST /api/comics { stylePrompt: "..." } 或 POST /api/short-comic { stylePrompt: "..." }
    │
    ▼
DB: comics.style_prompt = "日系黑白漫画风格，精细线稿..."
    │
    ▼
图片生成: 读取 comic.style_prompt → buildComicPagePrompt({ stylePrompt }) → "画面风格：..."
```

## 7. 迁移方案

### 7.1 数据库迁移

在 `database/init.js` 的初始化流程中增加：

```javascript
// 创建 style_presets 表
db.exec(`CREATE TABLE IF NOT EXISTS style_presets (...)`);

// 插入种子数据（仅表为空时插入）
const count = db.prepare('SELECT COUNT(*) as cnt FROM style_presets').get();
if (count.cnt === 0) {
  const insert = db.prepare(`INSERT INTO style_presets (code, name, category, style_prompt, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
  const seedData = [ /* 18 条预设 */ ];
  const transaction = db.transaction(() => {
    for (const item of seedData) {
      insert.run(...item);
    }
  });
  transaction();
}
```

### 7.2 现有数据兼容

- comics 表中已有的 `style_prompt` 值不受影响
- 短篇漫画中值为 `'彩色漫画'`、`'黑白漫画'` 等旧值的，前端 `getPresetByPrompt()` 无法精确匹配，显示为"自定义"模式，用户可重新选择预设覆盖
- 不需要做数据迁移脚本，旧数据仍可正常使用

## 8. 实现任务拆分

### Phase 1: 后端基础（1天）

| # | 任务 | 文件 |
|---|------|------|
| 1.1 | 创建 style_presets 表 + 种子数据 | `database/init.js` |
| 1.2 | 实现 StylePresetService | `app/service/stylePreset.js` |
| 1.3 | 实现用户侧 Controller + 路由 | `app/controller/stylePreset.js`, `app/router/stylePreset.js` |
| 1.4 | 统一短篇漫画 API 字段名 | `app/controller/shortComic.js` |
| 1.5 | 统一默认值来源 | `app/service/chapter.js`, `app/controller/shortComic.js`, `app/service/novel.js` |

### Phase 2: 前端组件（1天）

| # | 任务 | 文件 |
|---|------|------|
| 2.1 | 实现 stylePreset API + Store | `api/stylePreset.js`, `stores/stylePreset.js` |
| 2.2 | 实现 StylePresetSelector 组件 | `components/style/StylePresetSelector.vue` |
| 2.3 | 实现 StylePresetCard + Grid 子组件 | `components/style/StylePresetCard.vue`, `StylePresetGrid.vue` |

### Phase 3: 页面集成（0.5天）

| # | 任务 | 文件 |
|---|------|------|
| 3.1 | 创建连载漫画集成 StylePresetSelector | `views/Comics.vue` |
| 3.2 | 创建短篇漫画集成 + 字段名统一 | `views/CreateShortComic.vue` |
| 3.3 | 编辑漫画风格集成 StylePresetSelector | `views/ComicDetail.vue` |

### Phase 4: 后台管理（1天）

| # | 任务 | 文件 |
|---|------|------|
| 4.1 | 实现后台管理 Controller + 路由 | `app/controller/admin/stylePreset.js` |
| 4.2 | 后台管理前端页面 | 新增 `views/AdminStylePresets.vue` |

## 附录 A: 种子数据 SQL

```sql
INSERT INTO style_presets (code, name, category, style_prompt, description, sort_order) VALUES
-- 日系漫画
('jp_monochrome', '日漫黑白', '日系漫画', '日系黑白漫画风格，精细线稿，网点纸阴影，高对比度黑白画面', '经典日本漫画风格，适合少年向、热血题材', 1),
('jp_color', '日漫彩漫', '日系漫画', '日系彩漫风格，鲜艳色彩，精细上色，动漫质感', '全彩日漫风格，色彩丰富，画面精美', 2),
('jp_shoujo', '少女漫', '日系漫画', '少女漫画风格，柔和线条，大眼睛角色，浪漫氛围，花朵与星光装饰', '浪漫唯美的少女向风格', 3),
('jp_chibi', 'Q版萌系', '日系漫画', 'Q版萌系风格，二头身比例，圆润可爱，明亮色彩', '超可爱的Q版角色风格', 4),
-- 国风
('cn_ink', '水墨国风', '国风', '中国水墨画风格，留白意境，墨色渲染，传统笔触', '传统水墨画意境，适合武侠、古风题材', 1),
('cn_painted', '彩绘国风', '国风', '中国彩绘风格，工笔重彩，传统纹饰，浓烈色彩', '工笔重彩的中国传统绘画风格', 2),
('cn_xianxia', '仙侠风', '国风', '仙侠风格，飘逸仙气，灵力光效，云雾缭绕', '仙侠修真题材专属风格', 3),
-- 美系漫画
('us_hero', '美漫英雄', '美系漫画', '美漫超级英雄风格，粗犷线稿，强光影对比，动态构图', '美式超级英雄漫画风格', 1),
('us_indie', '美漫独立', '美系漫画', '美式独立漫画风格，简约线条，实验性构图，个性化表达', '独立漫画风格，适合文艺、实验性作品', 2),
-- 卡通/绘本
('cartoon_us', '美式卡通', '卡通/绘本', '美式卡通风格，夸张表情，明亮色彩，圆润造型', '经典美式动画卡通风格', 1),
('cartoon_picture', '绘本插画', '卡通/绘本', '绘本插画风格，温暖柔和，手绘质感，故事感画面', '适合儿童绘本、温馨故事', 2),
('cartoon_pixel', '像素风', '卡通/绘本', '像素艺术风格，8-bit/16-bit 复古像素，块状色块', '复古像素游戏风格', 3),
-- 写实/照片
('realistic', '写实漫画', '写实/照片', '写实漫画风格，接近真实比例，精细光影，电影级画面', '高度写实的漫画风格', 1),
('realistic_cyber', '赛博朋克', '写实/照片', '赛博朋克风格，霓虹灯光，未来都市，科技感与颓废并存', '未来科幻赛博朋克风格', 2),
-- 特色风格
('special_gothic', '暗黑哥特', '特色风格', '暗黑哥特风格，阴郁色调，尖锐造型，神秘恐怖氛围', '哥特暗黑美学，适合恐怖、神秘题材', 1),
('special_steam', '蒸汽朋克', '特色风格', '蒸汽朋克风格，齿轮机械，维多利亚美学，铜铁质感', '蒸汽朋克复古科技风格', 2),
('special_horror', '恐怖悬疑', '特色风格', '恐怖悬疑漫画风格，压抑氛围，高对比明暗，紧张构图', '悬疑惊悚题材风格', 3),
('special_minimal', '极简线稿', '特色风格', '极简线稿风格，简洁线条，大量留白，优雅干净', '极简风格，注重线条美感', 4),
('special_watercolor', '水彩风', '特色风格', '水彩画风格，晕染边缘，透明色彩，艺术感笔触', '水彩手绘质感风格', 5);
```

## 附录 B: 前端 API 定义

```javascript
// api/stylePreset.js
import request from './request';

export const stylePresetApi = {
  list: () => request.get('/api/style-presets'),
  adminList: () => request.get('/api/admin/style-presets'),
  create: (data) => request.post('/api/admin/style-presets', data),
  update: (id, data) => request.put(`/api/admin/style-presets/${id}`, data),
  toggle: (id) => request.put(`/api/admin/style-presets/${id}/toggle`),
  destroy: (id) => request.delete(`/api/admin/style-presets/${id}`),
};
```

## 附录 C: 默认值统一后的代码变更

### server/app/service/chapter.js:186

```diff
- stylePrompt: comic.style_prompt || '日系黑白漫画',
+ stylePrompt: comic.style_prompt || ctx.service.stylePreset.getDefaultStylePrompt(),
```

### server/app/controller/shortComic.js:263

```diff
- const stylePrompt = style || '彩色漫画';
+ const stylePrompt = stylePrompt || ctx.service.stylePreset.getDefaultStylePrompt();
```

### server/app/service/novel.js:165

```diff
- result.stylePrompt || '日系黑白漫画风格'
+ result.stylePrompt || ctx.service.stylePreset.getDefaultStylePrompt()
```
