# 风格预设优化技术方案

> 状态：设计定稿（待实施）  
> 日期：2026-08-05  
> 修订：2026-08-05（增加 `comics.style_preset_id` 绑定 + 风格示例图传递/可解绑）  
> 范围：风格清单精简至 8 个、硬下线多余风格、GPT 生图补示例图、选择器交互重构、漫画绑定风格预设与示例图参考  
> 输出目录：`docs/grok/`  
>
> **产品决议（最终）**  
> 1. 核心风格固定 **8 个**（名单见 §3），用户认可。  
> 2. 示例图走 **现有 `ai-image` 生图链路**，使用 **GPT Image（OpenAI 图片协议 / gpt-image* 模型）** 生成。  
> 3. 非核心风格 **直接下线（DELETE）**，不做 `is_enabled=0` 软隐藏。  
> 4. 风格提示词 **保持中文**，并强化可执行性（线稿/上色/光影/构图）。  
> 5. **`comics` 新增 `style_preset_id`（可空）**：创建/编辑时可绑定预设；允许留空或解绑；绑定后把风格示例图纳入生图参考链路。  
> 6. **`style_prompt` 仍冗余存储**（快照）：解绑或预设文案变更后，历史作品提示词不丢。

---

## 1. 背景与目标

### 1.1 现状（基于代码事实）

| 层 | 现状 | 关键代码 |
|---|---|---|
| 种子数据 | 19 条，5 分类，无封面 | `server/database/seeds/style_presets.js` |
| 表结构 | 有 `cover_image`，线上全空 | `server/database/init.sql` `style_presets` |
| 公开 API | 按分类分组返回 enabled 预设 | `controller/stylePreset.js` |
| 管理 API | CRUD + toggle，无封面上传/生图 | `controller/admin/stylePreset.js` |
| 选择器 | 双层 Tab + 灰占位卡片 + 展示整段 prompt | `web/src/components/style/*` |
| 创建入口 | 创建漫画弹窗 `max-width:500` 内嵌选择器 | `Comics.vue` |
| 小说向导 | 仅自由文本，未接预设 | `wizard/StepStyle.vue` |
| 生图 | `generateFromPrompt` 可通用出图；漫画页参考图仅角色+上一章 | `service/ai-image.js` / `chapter.js` |
| 图片访问 | 仅 `characters` / `comics` 两类 | `controller/images.js` |
| 绑定关系 | 漫画只存 `style_prompt`，无 preset id | `db.js` / `comics` 表 |

### 1.2 目标

1. **清单**：运行库与种子均收敛为 **8 个核心风格**；其余从 `style_presets` **物理删除**。  
2. **示例图**：每个风格有一张统一构图的封面，写入 `style_presets.cover_image`，前端卡片直接展示。  
3. **绑定**：`comics.style_preset_id` 可空外键；创建/更新可绑定、解绑；绑定后示例图参与生图参考。  
4. **交互**：一屏视觉选风格；弱化/去掉分类 Tab；默认选中日漫黑白；自定义折叠进阶。  
5. **提示词**：中文、可区分；文本 prompt +（可选）视觉 style reference 双通道控风。  
6. **可运维**：管理端可「重新生成示例图」；种子/迁移幂等。

### 1.3 非目标（本期不做）

- 不做风格使用率后台报表（有 `style_preset_id` 后可二期统计）。  
- 不实现「AI 一键生成风格描述」Tab（继续隐藏或删除空壳）。  
- 不做用户自定义上传风格封面（仅系统预设 + 管理端重生）。  
- 不重构小说向导全流程（可选接入同一选择器，见 §7.4）。  
- 不引入新 npm 依赖。  
- **不把预设示例图复制进用户漫画目录**（默认引用 `styles/` 路径；见 §4.6）。

---

## 2. 问题诊断（指导改造）

1. **风格是视觉决策，却用文字货架**：无 `cover_image` → 选择靠猜。  
2. **19 选项 + 5 分类**：决策过载；题材（恐怖/仙侠氛围）与画风混装。  
3. **创建弹窗过窄 + 双滚动**：主路径体验差。  
4. **选中后展示整段 prompt**：对小白是噪音。  
5. **图片服务不认识 `styles` 类型**：即使有文件也无法走现有 `/images/:type/:filename`。  
6. **种子仅在 `COUNT=0` 时插入**：已有库不会因改 seed 自动收敛，必须单独迁移。  
7. **漫画与预设无关联**：无法稳定回显选中预设、无法把示例图当 style reference 注入生图。  
8. **生图仅文本控风**：`generateComicPage` 的 references 只有角色图与上一章，缺少风格锚定图。

---

## 3. 最终风格清单（8）

### 3.1 保留

| code | 名称 | 分类（展示可扁平化） | 说明 |
|------|------|---------------------|------|
| `jp_monochrome` | 日漫黑白 | 日系 | 默认；黑白网点、少年/连载标配 |
| `jp_color` | 日漫全彩 | 日系 | 全彩日漫/动画感 |
| `jp_shoujo` | 少女漫 | 日系 | 柔线、大眼、浪漫装饰 |
| `jp_chibi` | Q版萌系 | 日系 | 二头身、轻量短篇 |
| `cn_ink` | 水墨国风 | 国风 | 水墨留白、武侠古风通用 |
| `cn_xianxia` | 仙侠古风 | 国风 | 网文转漫刚需 |
| `us_hero` | 美漫英雄 | 美系 | 粗线、强对比、动态 |
| `realistic_cyber` | 赛博朋克 | 特色 | 霓虹未来、科幻出口 |

默认选中：`jp_monochrome`（与 `getDefaultStylePrompt()` 一致）。

### 3.2 直接删除（11）

| code | 名称 | 删除理由 |
|------|------|----------|
| `cn_painted` | 彩绘国风 | 与水墨/仙侠重叠 |
| `us_indie` | 美漫独立 | 小众、边界模糊 |
| `cartoon_us` | 美式卡通 | 偏动画非分格漫画 |
| `cartoon_picture` | 绘本插画 | 非连载主场景 |
| `cartoon_pixel` | 像素风 | 分镜叙事弱 |
| `realistic` | 写实漫画 | 本期不进 8 强 |
| `special_gothic` | 暗黑哥特 | 题材氛围，非画风基座 |
| `special_steam` | 蒸汽朋克 | 长尾 |
| `special_horror` | 恐怖悬疑 | 题材氛围 |
| `special_minimal` | 极简线稿 | 插画向 |
| `special_watercolor` | 水彩风 | 插画向 |

### 3.3 中文风格提示词（定稿草案）

实施时写入 seed + 迁移 UPDATE。原则：40–100 字；写清线稿/上色/光影；避免空泛堆词。

| code | style_prompt |
|------|----------------|
| `jp_monochrome` | 日系黑白漫画风格，精细墨线线稿，网点纸与阴影排线，高对比黑白画面，分镜感强，不要彩色，不要照片写实 |
| `jp_color` | 日系全彩漫画风格，清晰线稿，赛璐璐或精细平涂上色，鲜明色彩与动漫光影，画面干净精致，不要写实照片质感 |
| `jp_shoujo` | 少女漫画风格，柔和细腻线条，大眼睛精致五官，浪漫氛围，花朵星光与速度线点缀，柔和配色，唯美情绪 |
| `jp_chibi` | Q版萌系漫画风格，二头身或三头身比例，圆润可爱造型，简洁粗线，明亮饱和色彩，表情夸张，轻松欢快 |
| `cn_ink` | 中国水墨国风漫画，墨色渲染与留白意境，书法感笔触，淡彩或纯水墨，传统山水气韵，适合武侠古风，避免西式厚涂 |
| `cn_xianxia` | 仙侠古风漫画风格，飘逸衣袂与灵力光效，云雾山岚，清丽或绚烂仙气配色，东方奇幻氛围，精致服饰纹样 |
| `us_hero` | 美式超级英雄漫画风格，粗犷有力线稿，强烈明暗对比，动态夸张构图，浓烈色彩，半调网点可选，漫画书质感 |
| `realistic_cyber` | 赛博朋克漫画风格，霓虹灯光与未来都市，潮湿反光与全息招牌，冷暖强对比，科技与颓废并存，电影分镜感 |

`description` 保留一句话用户可读文案（管理端与 tooltip 用）。

---

## 4. 数据与迁移

### 4.1 策略：硬删除 + 更新保留项 + comics 绑字段

符合决议「直接下线」。遵守项目 DB 约束：

- **禁止**删库 / 重建 `style_presets` / `comics` 表。  
- 用 `ALTER TABLE` / `DELETE` / `UPDATE` 增量变更。  
- 迁移脚本 **幂等**：重复执行不报错、结果一致。

### 4.2 `comics` 表结构变更

`init.sql` 新库定义与迁移脚本对齐：

```sql
-- comics 表新增（幂等迁移）
ALTER TABLE comics ADD COLUMN style_preset_id INTEGER
  REFERENCES style_presets(id) ON DELETE SET NULL;
```

| 字段 | 类型 | 约束 | 含义 |
|------|------|------|------|
| `style_preset_id` | INTEGER NULL | FK → `style_presets(id)`，`ON DELETE SET NULL` | 绑定的系统预设；`NULL` = 未绑定 / 已解绑 / 纯自定义 |
| `style_prompt` | TEXT（已有） | 可空 | **始终以漫画自身快照为准** 注入生图文案 |

设计原则：

1. **绑定预设时**：写入 `style_preset_id`，并用预设当前 `style_prompt`（或前端传来的、与预设一致的文案）写入 `comics.style_prompt` 快照。  
2. **自定义 / 解绑时**：`style_preset_id = NULL`，仅保留用户 `style_prompt`。  
3. **预设被 DELETE**：FK `ON DELETE SET NULL` → 漫画自动解绑，**快照 prompt 仍在**，生图不挂。  
4. **预设文案日后被管理员修改**：已创建漫画 **不自动跟新**（以快照为准）；用户重新选一次预设才更新快照。  
5. **不做** `comics.style_cover_image` 冗余列（一期）：示例图路径运行时通过 `style_preset_id` JOIN `style_presets.cover_image` 解析；若需「创建时冻结示例图路径」，二期再加快照列。

SQLite 注意：

- `ADD COLUMN` 前检查列是否存在（查 `pragma table_info(comics)`），保证幂等。  
- SQLite 对后续 `ADD FK` 支持有限；应用层创建/更新时 **校验** `style_preset_id` 是否存在且（建议）`is_enabled=1`；删除预设时应用层或迁移保证 SET NULL（若建表时未带 FK，迁移删除预设前先 `UPDATE comics SET style_preset_id=NULL WHERE style_preset_id IN (...)`）。

推荐迁移顺序：

```text
1. 确保 style_presets 收敛为 8 条（先 UPDATE/INSERT core，再 DELETE 非 core）
   - 删除非 core 前：UPDATE comics SET style_preset_id=NULL WHERE style_preset_id 指向将删 id
2. ALTER comics ADD style_preset_id（若尚无）
3. （可选）历史回填：按 style_prompt 全文精确匹配 8 个预设，写回 style_preset_id
```

历史回填 **可选**，默认开启精确匹配；匹配不上保持 `NULL`（自定义）。

### 4.3 已有漫画数据

- 历史行：`style_preset_id` 初始为 `NULL`（或精确匹配回填）。  
- `comics.style_prompt` **不批量改写成新中文定稿**（用户历史设定保留）。  
- 删除废弃预设前清掉指向它们的 FK（新列若尚未写入则无操作）。

### 4.4 种子文件改造

文件：`server/database/seeds/style_presets.js`

1. `seedData` 仅保留 8 条（含最终中文 prompt、description、sort_order、可选默认 cover 路径）。  
2. 现有逻辑：`COUNT=0` 才 insert → **空库**走新种子即可。  
3. **非空库**必须靠迁移脚本收敛，不能只改 seed。

建议增强 seed：

```text
seedStylePresets(db):
  1. 若 COUNT=0 → 插入 8 条
  2. 无论是否为空 → ensureCoreStylePresets(db)
     - UPSERT 8 个 code 的 name/category/style_prompt/description/sort_order
     - 删除非 core 前清空 comics.style_preset_id 指向
     - DELETE FROM style_presets WHERE code NOT IN (8 codes)
```

**迁移脚本 + seed 共用同一份 CORE 定义**：  
`module.exports = { seedData, CORE_CODES, ensureCoreStylePresets }`。

### 4.5 迁移脚本

新增：`server/database/migrate-style-presets-v2.js`

职责：

1. 读取 `CORE` 定义（从 seeds 复用）。  
2. 幂等 `ALTER TABLE comics ADD COLUMN style_preset_id INTEGER`。  
3. 对 8 个 code：`INSERT OR IGNORE` 后 `UPDATE` 文案与排序。  
4. 清空将删除预设上的漫画绑定 → `DELETE` 非 core。  
5. （可选）`style_prompt` 精确匹配回填 `style_preset_id`。  
6. 打印：删除条数、保留条数、回填条数。  
7. **不删** 示例图文件；重生时覆盖。

执行：`node server/database/migrate-style-presets-v2.js`；`init.js` 可调用幂等 `ensure`。

### 4.6 绑定语义与「传递示例图」

#### 4.6.1 三种用户状态

| 状态 | `style_preset_id` | `style_prompt` | 示例图参考 |
|------|-------------------|----------------|------------|
| 绑定预设 | 非空（有效 id） | 快照（通常=预设文案；允许用户在绑定后微调文案，见下） | 有 `cover_image` 则注入生图 references |
| 纯自定义 | `NULL` | 用户自写 | **不**注入风格示例图 |
| 解绑 | 从有值改为 `NULL` | 保留当前快照（或用户正在编辑的文本） | 之后生图不再带风格示例图 |

**绑定后微调文案**：允许。`style_preset_id` 仍指向预设（用于回显卡片与 style reference），`style_prompt` 以用户最终提交为准。若产品希望「一改文案就自动解绑」，前端在 custom 输入时 `stylePresetId=null`（见 §7.3）——**本期采用：进入自定义模式即解绑**；点选预设卡片则重新绑定。

#### 4.6.2 创建时数据流

```text
前端选择器
  → stylePresetId: number | null
  → stylePrompt: string
  → （不强制上传图片文件；示例图由服务端按 preset 解析）

POST /api/comics
  body: { title, stylePrompt?, stylePresetId? }

服务端 createComic:
  1. 若 stylePresetId 有值:
       - 查 style_presets，不存在或未启用 → 400
       - style_prompt = body.stylePrompt?.trim() || preset.style_prompt
       - style_preset_id = preset.id
       - 解析 styleCoverPath = preset.cover_image（可空，不阻断创建）
  2. 若 stylePresetId 为空/null/省略:
       - style_preset_id = NULL
       - style_prompt = body.stylePrompt?.trim() || 默认日漫黑白文案
  3. INSERT comics (...)
  4. 响应 comic 含 stylePresetId、stylePrompt、以及联表的 stylePreset（可选嵌套：id/name/code/coverImage）
```

短篇创建 / 小说落库漫画：**同一套字段**（`shortComic` / `novel` 建 comic 时透传）。

#### 4.6.3 更新 / 解绑

```text
PUT /api/comics/:id
  body: {
    title?,
    stylePrompt?,
    stylePresetId?: number | null   // 显式 null = 解绑；省略 = 不改绑定
  }
```

| body | 行为 |
|------|------|
| `stylePresetId: 3` | 绑定 id=3，校验存在；若同时带 `stylePrompt` 用客户端文案，否则用预设文案刷新快照 |
| `stylePresetId: null` | **解绑**；`style_prompt` 若同请求有值则更新，否则保留原快照 |
| 仅 `stylePrompt`，不传 `stylePresetId` | 只改文案，**绑定关系不变**（详情页高级编辑用） |
| 前端「自定义模式」提交 | 显式 `stylePresetId: null` + 自定义 `stylePrompt` |

#### 4.6.4 生图时「传递示例图」

现状：`chapter.generateImage` → `aiImage.generateComicPage`，references = 角色图 + 上一章图。

改造：

```text
generateComicPage / generateFromPrompt（短篇）:
  references = [
    ...characterRefs,
    ...previousChapter?,
    ...styleCoverRef?    // 新增，建议放在最前或约定固定序号
  ]
```

解析 `styleCoverRef`：

```text
if comic.style_preset_id:
  preset = getById(comic.style_preset_id)
  if preset?.cover_image:
    将本地 styles 文件加入 references（type: path）
    并在 buildComicPagePrompt 中增加图片说明：
      「第N张图片是画风示例参考（仅环境/材质示意，无角色），
        请严格贴近其线稿、上色、光影与整体画风；
        不要复制示例图中的具体场景布局，角色外貌以角色参考与角色描述为准」
```

约束：

- 风格示例图本身 **不得含角色**（见 §5.4），从源头避免与角色参考冲突。  
- `style_preset_id` 为空，或预设无封面 / 文件缺失 → **跳过**，仅文本 `style_prompt`（创建允许，不报错）。  
- 风格参考图 **不是** 漫画 `cover_image` 字段的长期占用：第一章生成完成后仍按现逻辑用生成页覆盖 `comics.cover_image`。  
- （可选 UX）创建成功且尚无章节图时，列表可用预设 `coverImage` 作占位封面——仅展示层 JOIN，不写脏 `cover_image`。**一期列表占位可选，非必须。**

#### 4.6.5 Prompt 构建补充

文件：`server/app/ai/prompt/comic-page.js`（及短篇若自拼 prompt）

- 已有：`画面风格：${stylePrompt}`  
- 新增：当存在 style reference 时，在「图片说明」中标注为 **画风示例（非角色）**。  
- 顺序建议：**风格示例 → 角色参考 → 上一章**；序号与 `collectReferences` 一致。

### 4.7 sort_order 建议

| code | sort_order |
|------|------------|
| jp_monochrome | 1 |
| jp_color | 2 |
| jp_shoujo | 3 |
| jp_chibi | 4 |
| cn_ink | 10 |
| cn_xianxia | 11 |
| us_hero | 20 |
| realistic_cyber | 30 |

列表 API 仍可 `ORDER BY category, sort_order`；前端扁平展示按 `sort_order` 全局排序。

---

## 5. 示例图：存储、访问与 GPT 生图

### 5.1 存储布局

| 项 | 约定 |
|----|------|
| 目录 | `public/images/styles/`（新增 config：`styleImageDir`） |
| 文件名 | `{code}.png`（稳定路径，重生覆盖） |
| DB `cover_image` | `/images/styles/{code}.png` 或 `styles/{code}.png`（与现有角色路径风格对齐，**全项目统一一种**） |

对齐现状：

- 角色返回：`/images/characters/${filename}`（`ai-image.js`）  
- 漫画页：常存相对 filename，由前端拼路径  

**本期约定**：`cover_image` 存 **`/images/styles/{code}.png`**（绝对站点路径，便于卡片 `v-img :src`；若前端图片组件需 token，见 §5.2）。

### 5.2 图片访问扩展

`controller/images.js` 的 `serveImage` 当前仅允许 `characters` | `comics`。

改造：

```text
type ∈ { characters, comics, styles }
styles → config.styleImageDir || 'public/images/styles'
```

路由已有：

- `GET /api/images/:type/:filename`（query token）  
- `GET /images/:type/:filename`（JWT Cookie）

风格封面是否公开：

- **推荐**：风格示例图视为系统资源，**允许无登录预览**（创建漫画前也可能要看图）。  
- 实现二选一（实施时选 A）：  
  - **A（推荐）**：静态托管 `public/images/styles` 直接可访问（Egg static 已指 public），`cover_image` 用 `/images/styles/xxx.png`。  
  - **B**：仍走 images 控制器，增加 `GET /api/style-covers/:code` 公开接口。  

若选 A：需确认 `config.static` 已暴露 `public`，且路径不与鉴权中间件冲突。角色/漫画图因隐私走鉴权；**风格封面公开**合理。

### 5.3 生图链路（复用现有）

统一走：

```text
ctx.service.aiImage.generateFromPrompt({
  prompt,
  providerId,      // 管理端可选；默认 resolve('image') → GPT Image 提供商
  size: '1024x1024',
  filenamePrefix:  // 见下，最终应落到 {code}.png
})
```

现状问题：`generateFromPrompt` 固定写入 `comicImageDir` 且文件名为 `prefix_timestamp.png`。

**改造点**（最小）：

1. 扩展 `generateFromPrompt` 支持可选：  
   - `outputDir`  
   - `filename`（固定名，覆盖写）  
2. 或新增专用方法 `generateStyleCover({ code, stylePrompt, providerId })`，内部调 protocol.generate + 写 `styleImageDir/{code}.png`。

推荐 **专用方法**，避免污染漫画目录、语义清晰：

```text
AiImageService.generateStyleCover({ code, stylePrompt, providerId })
  → buildStyleCoverPrompt(stylePrompt)
  → protocol.generate({ prompt, size: '1024x1024' })  // 无 references
  → 写入 styleImageDir/{code}.png
  → 返回 { imagePath: '/images/styles/{code}.png' }
```

协议：使用已配置的 **OpenAI 图片协议 + gpt-image\*** 模型（管理员保证默认 image 提供商为 GPT 生图；管理端重生时可传 `providerId`）。

### 5.4 示例图 Prompt 规范（统一构图 · 无角色）

目标：8 张图 **同一环境场景骨架**，只换画风，方便对比。

**原则：示例图 = 画风样本，不是角色立绘。**

- **禁止**出现人物、人脸、可辨认角色、拟人生物（避免生图时被模型当成角色参考）。  
- **展示**线稿、网点/上色、光影、材质与氛围（街道、建筑、天空、道具等环境即可）。

**固定主体（中文，实现见 `style-cover.js`）：**

```text
生成一张漫画画风示例图，用于展示视觉风格，不是故事分镜。
构图：城市街道转角与远景建筑、天空、地面材质；可有车辆、路灯、招牌轮廓；
画面中不要出现任何人物、人脸、角色、拟人生物。
不要对白气泡、文字水印、分镜格子、风格名称文字。
重点表现线稿质感、上色方式、光影与整体氛围。
必须严格遵循以下画风：{style_prompt}
```

质量要求：

- 禁止图内文字与角色。  
- 失败重试：单张最多 2 次；失败不阻断其他 code。  
- 批量任务串行（避免 provider 限流）。

### 5.5 生成入口

| 入口 | 用途 |
|------|------|
| 管理 API | `POST /api/admin/style-presets/:id/regenerate-cover` 单张重生 |
| 管理 API | `POST /api/admin/style-presets/regenerate-covers` 批量（8 张） |
| CLI 脚本（可选） | `node server/scripts/generate-style-covers.js` 部署后一次性跑 |

批量接口行为：

1. 读取当前库中全部保留预设（迁移后应 = 8）。  
2. 逐个 `generateStyleCover`。  
3. 成功则 `UPDATE cover_image`。  
4. 返回 `{ results: [{ code, ok, coverImage?, error? }] }`。  
5. 权限：admin + jwt。  
6. 超时：Egg 请求可能较长 → 批量接口提高超时或改为异步任务；**一期可同步串行**，前端 loading 提示「约 1–3 分钟」。

### 5.6 与种子的关系

- 迁移后 `cover_image` 可先为 `NULL`。  
- 上线步骤：**迁移 → 配置 GPT 图片提供商 → 调批量生图 → 确认 8 张可访问**。  
- 勿把生成的二进制提交进 git（体积大）；目录可留 `.gitkeep`。

---

## 6. 后端 API 变更

### 6.1 公开列表（基本不变）

`GET /api/style-presets`

- 仍返回 `{ categories: [{ name, sortOrder, presets: [...] }] }`。  
- 迁移后 categories 约 4 个（日系/国风/美系/特色），每类 1–4 项。  
- **增强**：额外返回扁平 `presets: []` 按 `sort_order`，方便前端一屏网格。

```json
{
  "presets": [ /* 扁平，按 sort_order；含 id, code, name, stylePrompt, description, coverImage */ ],
  "categories": [ /* 现有结构 */ ]
}
```

### 6.2 漫画创建 / 更新

| 方法 | 路径 | body 增量 |
|------|------|-----------|
| POST | `/api/comics` | `stylePresetId?: number \| null`，`stylePrompt?: string` |
| PUT | `/api/comics/:id` | 同上；`stylePresetId: null` 表示解绑 |
| 短篇相关 | `/api/short-comic/*` | 创建/更新 comic 时同样透传 `stylePresetId` |
| 小说落库 | novel 流程写 comic 时 | 透传；无 id 则 NULL |

响应 `comic` 建议字段（camelCase 与现有前端约定对齐处保持项目风格）：

```json
{
  "id": 1,
  "title": "...",
  "style_prompt": "...",
  "style_preset_id": 2,
  "stylePreset": {
    "id": 2,
    "code": "jp_color",
    "name": "日漫全彩",
    "coverImage": "/images/styles/jp_color.png"
  }
}
```

`stylePreset` 在未绑定或预设已删（id 已 SET NULL）时为 `null`。  
列表接口可 JOIN 轻量字段，避免 N+1。

校验：

- `stylePresetId` 非空但记录不存在 → **400**  
- 预设 `is_enabled=0` → **400**（不允许新绑禁用项；历史绑定若被禁用，生图仍可用快照 prompt，style reference 若文件仍在可继续用——实现选：禁用则 reference 也跳过）

### 6.3 管理端新增

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/style-presets/:id/regenerate-cover` | body 可选 `{ providerId }` |
| POST | `/api/admin/style-presets/regenerate-covers` | body 可选 `{ providerId }` |

单张成功：

```json
{ "id": 1, "code": "jp_monochrome", "coverImage": "/images/styles/jp_monochrome.png" }
```

### 6.4 Service 层

`stylePreset.js`：

- `getById` / `getEnabledById`  
- `updateCover(id, coverImage)`  
- 删除预设前：`clearComicBindings(presetId)`（双保险）

`db.js` / `comic.js`：

- `createComic(userId, title, stylePrompt, stylePresetId)`  
- `updateComic` 支持 `style_preset_id`（含显式 null）  
- 读接口可选 JOIN 预设摘要

`ai-image.js`：

- `generateStyleCover(...)`  
- `collectReferences` 增加 `styleCover`（本地 path）  
- `generateComicPage` 增加 `styleCoverPath` 或从 comic 解析  
- config 增加 `styleImageDir`

`chapter.js` / `shortComic.js`：

- 生图前解析 comic 的 style cover 并传入

`comic-page.js` prompt：

- 风格参考图说明文案

### 6.5 删除行为

- core 预设 **禁止 destroy**（返回 400）。  
- 若未来允许删非 core：先 `UPDATE comics SET style_preset_id=NULL`，再 DELETE。  
- `ON DELETE SET NULL` 与应用层 double-clear。

---

## 7. 前端交互改造

### 7.1 目标交互（创建漫画 / 短篇）

```text
画风
┌────────┬────────┬────────┬────────┐
│ [封面] │ [封面] │ [封面] │ [封面] │
│ 日漫黑白│ 日漫全彩│ 少女漫 │ Q版萌系│  ← 默认勾选日漫黑白
├────────┼────────┼────────┼────────┤
│ 水墨国风│ 仙侠古风│ 美漫英雄│ 赛博朋克│
└────────┴────────┴────────┴────────┘
选中：日漫黑白 · 经典日本漫画…   （将使用该风格示例图辅助生成）
▸ 使用自定义风格描述（不绑定预设、不传示例图）
```

### 7.2 组件改动

| 组件 | 改动 |
|------|------|
| `StylePresetCard.vue` | 大封面；名称+描述；暗色修复；选中态 |
| `StylePresetGrid.vue` | 默认扁平 8 宫格；分类 Tab 默认关 |
| `StylePresetSelector.vue` | 去 AI Tab；自定义折叠；**同时输出 presetId + stylePrompt**；默认 `jp_monochrome` |
| `stores/stylePreset.js` | 扁平 presets；`getDefaultPreset()`；`getById` |
| `Comics.vue` | 弹窗加宽；创建提交带 `stylePresetId` |
| `CreateShortComic.vue` | 同契约 |
| `ComicDetail.vue` | 编辑可换绑/解绑；保存带 `stylePresetId` |
| `admin/StylePresets.vue` | 封面列 + 重生按钮 |
| `api/comic.js` 等 | create/update 传 `stylePresetId` |

### 7.3 选择器契约（破坏性相对旧 v-model）

旧：仅 `v-model` = `stylePrompt` 字符串。  

新（推荐）：

```text
props:
  stylePrompt: string
  stylePresetId: number | null

emits:
  update:stylePrompt
  update:stylePresetId
  # 或合并 emit change({ stylePrompt, stylePresetId })
```

行为：

| 用户操作 | stylePresetId | stylePrompt |
|----------|---------------|-------------|
| 点选预设卡片 | 该 preset.id | 该 preset.stylePrompt |
| 展开自定义并编辑 | **null（解绑）** | 用户输入 |
| 初始默认 | 默认预设 id | 默认预设 prompt |
| 编辑回显有 id | id | 漫画快照 prompt（可与预设略有差异） |
| 编辑回显无 id | null | 漫画 style_prompt；走自定义面板 |

父组件创建：

```js
await comicApi.createComic({
  title,
  stylePrompt: form.stylePrompt,
  stylePresetId: form.stylePresetId, // number | null
})
```

**不必**在 body 里传示例图 URL/文件；服务端按 id 取 `cover_image`。前端展示用列表接口里的 `coverImage`。

### 7.4 小说向导（可选同期）

`StepStyle.vue` 接入选择器，提交时带上 `stylePresetId`（AI 分析出的纯文本则 id=null）。

### 7.5 空壳 AI Tab

删除；禁止假数据 emit。

---

## 8. 管理端与运维流程

### 8.1 上线顺序

```text
1. 备份 comic.db（时间戳文件名）
2. 合并代码（迁移、seed、后端、前端）
3. 执行 migrate-style-presets-v2（预设收敛 + comics.style_preset_id）
4. 确认默认图片提供商为 GPT Image
5. 管理端「批量生成示例图」
6. 抽查：8 封面可访问；创建绑 id；自定义解绑；生图带/不带 style reference
7. 冒烟：绑定预设生成一页 vs 纯自定义生成一页
```

### 8.2 回滚

- 代码回滚 + DB 备份恢复（含 `style_presets` 与 `comics`）。  
- 仅回滚代码而保留新列：旧代码忽略 `style_preset_id` 一般仍可读，但新前端依赖字段会不完整——**建议代码与库成对回滚**。  
- 示例图文件可残留，无害。

### 8.3 备份要求（执行迁移前）

```bash
# 示例：带时间戳备份
cp server/database/comic.db "server/database/comic.backup.$(date +%Y%m%d%H%M%S).db"
```

符合项目「变更前备份」约束。

---

## 9. 实施任务拆分

### Phase A — 数据与后端

| # | 任务 | 验证 |
|---|------|------|
| A1 | CORE 8 + seed ensure | 空库仅 8 条 |
| A2 | 迁移：预设收敛 + `comics.style_preset_id` | 列存在；重复执行 OK；非 core 已删 |
| A3 | `createComic` / `updateComic` 绑定与解绑 | 绑 id / null / 非法 id |
| A4 | `styleImageDir` + 示例图访问 | 静态或 images 类型可访问 |
| A5 | `generateStyleCover` + 管理 API | 单张写入 DB |
| A6 | 生图注入 style reference | 绑定时 references 含风格图；解绑不含 |
| A7 | 短篇 / 章节路径对齐 | 两处生图行为一致 |

### Phase B — 前端选择器与创建

| # | 任务 | 验证 |
|---|------|------|
| B1 | Card / Grid 视觉 | 封面 + 8 宫格 |
| B2 | Selector 双字段契约 | presetId + prompt；自定义解绑 |
| B3 | Comics / ShortComic 提交 | 网络面板可见 stylePresetId |
| B4 | ComicDetail 换绑/解绑 | 保存后回显正确 |
| B5 | 弹窗加宽 | 无痛苦双滚动 |

### Phase C — 管理端与冒烟

| # | 任务 | 验证 |
|---|------|------|
| C1 | 批量示例图 | 8 张成功 |
| C2 | core 禁删 | 400 |
| C3 | 绑定 vs 自定义生图对比 | 画风可辨；解绑无 style 图 |

**建议工期**：A 1d，B 0.5–1d，C 0.5d（含出图等待）。

---

## 10. 风险与对策

| 风险 | 严重度 | 对策 |
|------|--------|------|
| 硬 DELETE 预设导致漫画 FK 悬空 | 高 | 删前 SET NULL；迁移顺序先清绑定；应用层校验 |
| 风格参考图抢过角色参考（画风对了人设漂） | 中 | prompt 明确「只学画风不抄人物场景」；参考图顺序固定 |
| 无封面仍绑定 | 低 | 允许创建；生图降级为纯文本 prompt |
| 自定义误仍带旧 presetId | 中 | 前端进入自定义即 `stylePresetId=null`；单测/手测 |
| GPT 生图费用与耗时 | 中 | 仅 8 张；覆盖写；手动触发 |
| 默认 image 提供商不是 GPT | 中 | 上线检查；API 可传 providerId |
| 种子与迁移双份定义漂移 | 中 | 单一 CORE 模块 |
| 仅文本改 prompt 却期望换 reference | 低 | 文档约定：换 reference 需重新点选预设（换 id） |
| SQLite FK 弱约束 | 中 | 应用层校验 id 存在 |

### 明确不做的危险操作

- 不 `rm` 数据库文件。  
- 不 `DROP TABLE style_presets` / `comics`。  
- 不批量改写用户 `comics.style_prompt` 为新定稿（可选仅精确匹配回填 id）。  
- 不把 API Key 写入文档或前端。  
- 不把风格示例图复制进用户 `comics/` 目录当永久封面（避免与第一章生成封面冲突）。

---

## 11. 文件变更清单（预估）

| 路径 | 动作 |
|------|------|
| `docs/grok/style-preset-optimization-plan.md` | 本方案 |
| `server/database/init.sql` | `comics.style_preset_id` |
| `server/database/seeds/style_presets.js` | 8 条 + ensure |
| `server/database/migrate-style-presets-v2.js` | 新增 |
| `server/config/config.default.js` | `styleImageDir` |
| `server/app/ai/prompt/style-cover.js` | 新增 |
| `server/app/ai/prompt/comic-page.js` | 风格参考图说明 |
| `server/app/service/ai-image.js` | cover 生成 + references |
| `server/app/service/stylePreset.js` | 校验 / 封面 / 禁删 |
| `server/app/service/db.js` / `comic.js` | 读写 style_preset_id |
| `server/app/service/chapter.js` | 生图传 style cover |
| `server/app/controller/comic.js` | create/update 契约 |
| `server/app/controller/shortComic.js` | 透传 |
| `server/app/controller/admin/stylePreset.js` | 重生封面 |
| `server/app/controller/images.js` | `styles` 类型（若需要） |
| `server/app/router/*` | 新路由 |
| `server/public/images/styles/.gitkeep` | 新增 |
| `web/src/components/style/*` | 选择器重构 |
| `web/src/stores/stylePreset.js` | 改 |
| `web/src/api/comic.js` / `stylePreset.js` | 改 |
| `web/src/views/Comics.vue` 等 | 提交字段 |
| `web/src/views/admin/StylePresets.vue` | 封面 + 生图 |
| `web/src/components/wizard/StepStyle.vue` | 可选 |

---

## 12. 验收标准

- [ ] `style_presets` 恰好 8 行，code 与 §3.1 一致。  
- [ ] `comics` 存在可空列 `style_preset_id`。  
- [ ] 创建绑定预设：DB 有 id + prompt 快照；响应可带回 `stylePreset` 摘要。  
- [ ] 创建/更新 `stylePresetId: null`：解绑成功，prompt 可自定义。  
- [ ] 非法 `stylePresetId` → 400。  
- [ ] 批量生图后 8 个预设 `cover_image` 非空，选择器展示图。  
- [ ] **绑定且有封面**：生图请求 references 含风格示例图；prompt 含风格参考说明。  
- [ ] **未绑定或无封面**：生图仅文本 style_prompt，不因缺图失败。  
- [ ] 默认选中日漫黑白；自定义折叠；无 AI 假 Tab。  
- [ ] 迁移执行两遍结果一致。  
- [ ] 历史漫画旧 prompt 仍可生图；`style_preset_id` 多为 null 或精确回填。

---

## 13. 决议记录

| 项 | 结论 | 来源 |
|----|------|------|
| 数量 | 8 | 产品确认 2026-08-05 |
| 名单 | 见 §3.1 | 产品确认 |
| 示例图 | 现有链路 + GPT 生图 | 产品确认 |
| 下线方式 | DELETE 硬删除 | 产品确认 |
| 提示词语言 | 中文 | 产品确认 |
| 用户漫画 prompt | 不批量改写文案；可选精确匹配回填 id | 方案默认 |
| `style_preset_id` | **本期做**，可空，可解绑 | 产品确认 2026-08-05 修订 |
| 示例图如何「传递」 | 客户端传 **preset id**；服务端解析 cover 注入生图 reference；**不**要求客户端上传图片文件 | 方案默认 |
| 自定义 | 进入自定义 → `stylePresetId=null`，不带风格示例图 | 方案默认 |
| 漫画封面字段 | 不把风格图写入 `comics.cover_image` 作为永久封面 | 方案默认 |

---

## 14. 下一步

1. 若认可 §4.6 绑定语义与「自定义即解绑」，回复 **按方案开工**。  
2. 若希望「绑定后仍可改文案且保持 id + style reference」而不是自定义即解绑，说一声我改 §4.6.1 / §7.3。  
3. 实施前对 `comic.db` 做带时间戳备份。

**待确认后按 Phase A → B → C 改代码。**
