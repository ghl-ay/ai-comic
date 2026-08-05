# 架构代码审查：风格预设优化（style-preset v2）

- 日期：2026-08-05
- 范围：local（working tree，含 untracked 业务文件；不含本次新建的审查 skill）
- 对照文档：`docs/grok/style-preset-optimization-plan.md`
- Diff 规模：约 32 个 tracked 文件，+1236 / -577；另有 migrate / style-cover prompt / plan 未跟踪
- 结论摘要：整体方向正确，**组件分层与「预设绑定 + prompt 快照 + 风格参考图」数据模型基本对齐 plan**。前端选择器拆分（Card / Grid / Selector）清晰，后端生图参考顺序与 prompt 描述一致。
- **修复状态（2026-08-05）**：审查问题 A1–A10 已落地（见文末「修复记录」）。

---

## 变更地图

| 模块 | 文件 | 职责一句话 |
|------|------|------------|
| DB / 迁移 | `init.sql`, `migrate-style-presets-v2.js`, `seeds/style_presets.js` | `comics.style_preset_id`；8 核心 upsert + 删非核心；幂等 |
| 风格服务 | `service/stylePreset.js` | 映射、默认预设、封面路径解析、核心保护删除 |
| 漫画服务 | `service/comic.js`, `service/db.js` | 创建/更新绑定、列表/详情附加 `stylePreset` |
| 生图 | `service/ai-image.js`, `service/chapter.js`, `prompt/comic-page.js`, `prompt/style-cover.js` | 风格示例图生成；参考图顺序 style→角色→上章 |
| API | `controller/{stylePreset,admin/stylePreset,comic,shortComic,images}.js` | 公开扁平列表、管理重生封面、`styles` 图片类型 |
| 前端组件 | `components/style/*` | 卡片 / 网格 / 选择器 |
| 前端状态 | `stores/stylePreset.js`, `api/stylePreset.js` | 缓存启用预设、重生封面 API |
| 入口页 | `Comics.vue`, `CreateShortComic.vue`, `ComicDetail.vue`, `admin/StylePresets.vue` | 创建/编辑绑定；管理端批量生图 |
| 旁路 | `ComicCard/Info`, `StepStyle`, `MainLayout`, CSS | 展示名、小说按钮条件、文案微调 |

---

## 数据流（文字）

### 用户选风格 → 落库

```
StylePresetSelector
  → emit stylePrompt + stylePresetId
  → View 表单 (Comics / CreateShortComic / ComicDetail)
  → API body { stylePrompt, stylePresetId }
  → Controller 映射 style_preset_id
  → ComicService.createComic / updateComic
  → DB comics(style_prompt 快照, style_preset_id 可空)
  → attachStylePreset → 响应 stylePreset 嵌套对象
```

### 生图时风格锚定

```
ChapterService / ShortComicController
  → stylePreset.resolveStyleCoverLocalPath(comic.style_preset_id)
  → aiImage.generateComicPage({ styleCoverLocalPath, stylePrompt, ... })
  → collectReferences: [style cover] + characters + previous chapter
  → buildComicPagePrompt(hasStyleCover=true) 对齐序号描述
```

### 管理端示例图

```
Admin StylePresets → regenerateCover(s)
  → admin controller
  → aiImage.generateStyleCover(code, stylePrompt)
  → 写 public/images/styles/{code}.png
  → stylePreset.updateCover
```

---

## 五维评估

### 1. 组件封装

#### 优点

- **StylePresetCard**：纯展示 + `select` 事件，props 简单，错误/占位/选中态完整。
- **StylePresetGrid**：去掉分类 Tab 后变为纯列表容器，状态几乎为零，职责单一。
- **StylePresetSelector**：作为容器组件，负责加载、默认选中、自定义展开、双 v-model（prompt + presetId），边界合理。
- **ComicCard.styleLabel**：展示逻辑留在卡片内，不污染列表页。
- **ComicInfo.hasNovel**：用 prop 控制「查看小说」按钮，避免组件内偷偷请求。

#### 问题

1. **major** · `StylePresetSelector` 在 `syncFromProps` 中**主动 emit** 回填 `stylePresetId`（匹配 prompt 时），容器既「受控」又「写回父级」，双向耦合偏紧，易在父级 watch 中产生难查循环。  
   - 位置：`web/src/components/style/StylePresetSelector.vue` 约 148–166、183–191 行  
2. **minor** · 仍保留 deprecated `modelValue` 三路有效值（`stylePrompt` / `modelValue` / 内部），迁移期可接受，但应在调用方全部切完后删除。  
3. **minor** · `admin/StylePresets.vue` 页面内聚了表格、表单、批量生图与核心 code 列表，偏胖；尚可接受，未到必须拆分的程度。

#### 建议

- 回填 id 改为：仅在父级明确请求（如 prop `syncPresetId`）或由父级在加载漫画后自己匹配；选择器默认只向下同步。
- 调用方统一 `v-model:style-prompt` + `v-model:style-preset-id` 后删除 `modelValue`。

---

### 2. 设计模式

#### 优点

- **快照 + 引用**：`style_prompt` 冗余 + `style_preset_id` 可空，符合 plan，解绑/预设变更不毁掉历史作品文案。
- **提示词模块化**：`style-cover.js` / `comic-page.js` 与 `ai-image` 服务分离，扩展点清晰。
- **核心保护删除**：Service 层 `isCoreCode` + 删前 null 外键，比只靠前端 disable 更正确。
- **迁移幂等**：`columnExists` + `ensureCoreStylePresets` upsert/delete 模式符合仓库 DB 约束。

#### 问题

1. **major** · **绑定解析双实现**：`stylePreset.resolveStyleBinding` 完整实现但**全仓库零引用**；`comic.createComic` / `updateComic` 各自再写一套三态语义（`undefined` / `null` / `number`）。Shotgun + 死代码。  
   - 位置：`server/app/service/stylePreset.js` 约 90–128 行；`server/app/service/comic.js` 约 33–70、104–131 行  
2. **major** · 公开列表 DTO 映射与 `mapPresetRow` **未统一**：admin 用 `mapPresetRow`，公开 `controller/stylePreset.js` 手写 map（且少 `isEnabled` 等字段，合理），但仍有重复字段列表。  
3. **minor** · `attachStylePreset` 在列表循环里 **N+1 查询**；应用层拼装可接受，规模大时宜 join 或 `WHERE id IN`。  
4. **nit** · `deleteComic` 不存在时文案从「无权删除」改为「无权修改」，语义回归。  
   - 位置：`server/app/service/comic.js` 约 141–145 行  

#### 建议

- 删除或真正启用 `resolveStyleBinding`：create/update/shortComic 只走这一处。
- `mapPresetRow` 增加 `fields` 选项或 `toPublicPreset`，公开/管理共用。
- 列表 attach 改为批量查 preset map。

---

### 3. 前端组件抽离

#### 优点

- 风格选择 UI **收口到 `components/style`**，Comics / CreateShortComic / ComicDetail 复用同一选择器，符合「抽离优先、页面变薄」。
- 去掉分类 Tab 后，Grid 不再承载业务分类状态，抽离层级正确（Card → Grid → Selector → View）。
- Admin 与 User 组件未错误混用（管理端表格独立，用户侧视觉卡片独立），边界清楚。

#### 问题

1. **major（产品一致性）** · 小说向导 `StepStyle.vue` **仍是纯文本框**，未接 `StylePresetSelector`；与主创建路径体验分裂。Plan 标为可选，但从「组件抽离收益」看，这是最该复用却未复用的入口。  
   - 位置：`web/src/components/wizard/StepStyle.vue`  
2. **minor** · 管理端 `CORE_CODES` 硬编码 8 个 code，与 seed 双源；更合适的是 API 返回 `isCore` 或 `deletable`。  
   - 位置：`web/src/views/admin/StylePresets.vue` 约 181–193 行  
3. **minor** · Admin 仍用 `alert`/`confirm`，与站内其它反馈方式不一致（若项目已有 snackbar 应统一）。

#### 建议

- 若本期要交付一致体验：StepStyle 最小接入 Selector（可 `auto-select-default=false`，保留 AI 推荐文案匹配）。
- 后端 `mapPresetRow` 增加 `isCore: CORE_CODES.includes(code)`，前端删除本地常量。

---

### 4. 数据流动

#### 优点

- Store 缓存 `fetchPresets` + `loaded` 避免多入口重复请求，Selector 复用同一 store，数据源唯一。
- 创建/更新主路径基本同时携带 `stylePrompt` + `stylePresetId`；自定义输入主动 `presetId = null`。
- 生图链路 style cover 解析集中在 `resolveStyleCoverLocalPath`，chapter 与 shortComic 共用。
- 图片类型扩展 `styles` + 路径穿越检查保留，契约完整。
- 公开 API 同时返回 `presets` 扁平数组与 `categories`，Store 优先扁平，兼容旧结构。

#### 问题

1. **blocker / major** · **部分更新时 id 与 prompt 可能不一致**：若请求只改 `stylePrompt`、不带 `stylePresetId`，旧的 `style_preset_id` 仍在，生图仍注入**旧预设封面**，文案却是新风格。主 UI 多数路径会双写，但 shortComic/API/未来调用易踩坑。  
   - 位置：`server/app/service/comic.js` `updateComic`；`controller/shortComic.js` / `controller/comic.js`  
   - 期望策略（择一写清）：  
     - A. 仅更新 prompt 时自动 `style_preset_id = null`（若 prompt 与当前 preset 文案不同）  
     - B. 要求客户端总是显式传 `stylePresetId`（文档 + 校验）  
2. **major** · create 三态（`undefined` 默认绑定 / `null` 解绑 / id 绑定）与 update 的 `hasOwnProperty('stylePresetId')` 语义正确但**分散在 controller 与 service**，缺少单一注释契约表；`resolveStyleBinding` 本可统一却未用。  
3. **minor** · `ComicDetail.loadComic` 额外请求小说仅为按钮显隐，二次 RTT；可后续合并到 comic 详情字段。  
4. **minor** · 响应中 `style_preset_id`（snake）与 `stylePreset`（camel 嵌套）混用，前端两处兼容（`style_preset_id ?? stylePreset?.id`），可接受但建议列表/详情统一序列化层。

#### 建议

- 在 `updateComic` 中：若本次写入的 `style_prompt` 与绑定 preset 的 `style_prompt` 不等，则清空 `style_preset_id`（或强制要求 body 带 preset 字段）。
- 用一张表写在 Service 注释里固化 create/update 语义，并让 shortComic 只调 Service，不再拼装平行逻辑。

---

### 5. 最佳实践

#### 优点

- 符合仓库 DB 约束：ALTER 增量、幂等迁移、不删用户漫画数据；删非核心预设前先 null 外键。
- 管理端删除核心风格前后端双重拦截。
- `parseInt(..., 10)` / `Number.isNaN` 修正优于旧代码。
- 封面生成固定 `{code}.png` 覆盖，路径可预测。
- 前端超时对批量重生设 600s，意识到长任务。
- 中文提示词与 plan 一致；comic-page 明确「学画风不学场景」。

#### 问题

1. **major** · **批量重生封面在单请求内串行 await 多次生图**，依赖前端 600s 与网关超时；无任务队列/进度。运维可用，生产脆弱。  
   - 位置：`server/app/controller/admin/stylePreset.js` `regenerateCovers`  
2. **minor** · `require('fs')` / `path` 写在 `resolveStyleCoverLocalPath` 方法内，风格不统一（应用文件顶层 require）。  
3. **minor** · 缺少针对 `resolveStyleBinding` / create 三态 / 参考图顺序的自动化测试（仓库已有 `ai-image.test.js` 等，本期未补）。  
4. **nit** · `ComicDetail` 保存风格时若 API 不回 comic，本地手工拼字段可能丢 `stylePreset` 嵌套（依赖后端是否总返回 comic）。  
5. **pre-existing** · `images.serveImage` 固定 `Content-Type: image/png`，与扩展无关。

#### 建议

- 批量重生至少：限制并发 1–2、返回进度结构；或改为「逐个前端循环调单条 API」（已有 `regenerateOne`），去掉超长 batch 接口。
- 为 `collectReferences` + `buildComicPagePrompt` 序号一致性补单元测试。
- 保存风格成功路径统一以服务端返回的 `comic`（含 `stylePreset`）为准。

---

## 问题清单（汇总）

| ID | 级别 | 维度 | 位置 | 说明 | 建议 |
|----|------|------|------|------|------|
| A1 | major | 数据流 | `comic.js` update | 只改 prompt 时旧 preset_id 残留，封面参考错绑 | 文案变化时解绑，或强制双字段 |
| A2 | major | 设计模式 | `stylePreset.js` resolveStyleBinding | 方法未使用，与 create 逻辑重复 | 收口到单一解析函数或删除死代码 |
| A3 | major | 最佳实践 | admin regenerateCovers | 同步串行长耗时 | 前端逐条 或 任务化 |
| A4 | major | 组件抽离 | `StepStyle.vue` | 向导未复用选择器 | 按产品优先级接入或明确非目标 |
| A5 | major | 最佳实践 | admin CORE_CODES | 与 seed 双源 | API 下发 isCore |
| A6 | minor | 封装 | StylePresetSelector sync emit | 受控组件写回父级 | 减少隐式 emit |
| A7 | minor | 设计模式 | getComics attach | N+1 | 批量加载 preset |
| A8 | minor | 数据流 | 响应字段混用 | snake + camel 嵌套 | 统一序列化 |
| A9 | nit | 最佳实践 | deleteComic 文案 | 删除场景用「修改」 | 改回「删除」 |
| A10 | minor | 最佳实践 | 测试缺失 | 绑定/参考图顺序 | 补关键单测 |

---

## 建议修复优先级

1. **统一风格绑定语义**（A1 + A2）：去掉死代码或真正复用；update 时保证 id/prompt/参考图一致。  
2. **批量封面策略**（A3）：避免单 HTTP 扛满 8 次生图超时。  
3. **CORE 标识下沉 API**（A5）。  
4. **向导是否接入选择器**（A4）：与产品确认后做或不做，避免半吊子体验。  
5. 其余 minor/nit 可随手改。

---

## 非目标 / 不在本次改

- 小说向导全流程重构（plan 已列非目标；本审查仅指出一致性缺口）。
- 风格使用率统计。
- 用户自定义上传封面。
- 大范围 Pinia 规范化或全局错误 toast 体系替换。
- 审查 skill 本身（`.grok/skills/architecture-code-review`）不计入业务 diff 质量。

---

## 总评

**可合并前建议先处理 A1/A2**（正确性与可维护性）；A3 视是否在生产点「批量生成」而定。组件抽离方向是对的，数据模型与 plan 高度一致，生图参考链路设计完整——这是本次改动最大的架构亮点。

---

## 修复记录（2026-08-05）

| ID | 处理 |
|----|------|
| A1 | `update` 仅改 prompt 且与绑定预设文案不同时自动 `style_preset_id = null` |
| A2 | `createComic` / `updateComic` 统一走 `resolveStyleBinding` |
| A3 | 管理端批量生成改为前端逐条调单张接口 + 进度提示 |
| A4 | `StepStyle` + `novelWizard` 接入 `StylePresetSelector` 与 `stylePresetId` |
| A5 | `mapPresetRow` 下发 `isCore`，前端删除 `CORE_CODES` |
| A6 | Selector 同步不再隐式回写；选中态只认 `stylePresetId` |
| A7 | `getComics` 批量 `IN` 查询附加预设 |
| A8 | 响应增加 `stylePresetId` camelCase 别名 |
| A9 | 删除文案改回「无权删除」 |
| A10 | 补充 `buildComicPagePrompt` 序号与 `style-binding` 单测 |
