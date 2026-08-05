# AI 多提供商配置重构技术方案

> 状态：设计定稿（破坏性更新）  
> 日期：2026-08-05  
> 范围：后台 AI 配置支持多提供商；前台调用可选提供商；文本协议（OpenAI / Anthropic）；图片协议（OpenAI / Grok-sub2api）  
> 输出目录：`docs/grok/`  
>
> **产品决议（最终）**  
> 1. 不迁移旧 AI 配置；**直接移除** `grsai` 协议与旧配置/旧 API 路径。  
> 2. **所有登录用户**均可选择启用中的提供商。  
> 3. **允许未配置**：无可用提供商时前台显示「没有供应商可选」，生成接口明确失败，不静默回退环境变量。  
> 4. 接受依赖 `@anthropic-ai/sdk`。  
> 5. **本次为破坏性更新**，不考虑任何向后兼容。

---

## 1. 背景与目标

### 1.1 现状（基于代码事实）

| 层 | 现状 | 关键代码 |
|---|---|---|
| 配置存储 | `configs` KV：`ai/{providerName}` + `ai/default` 只记各一个 text/image | `server/app/service/ai-config.js` |
| 管理后台 | 文本/图片各一张表单，保存即覆盖默认 | `web/src/views/admin/AiConfig.vue` |
| 文本调用 | 固定 OpenAI SDK，`apiFormat` 无效 | `ai-text.js`、`novel.js`、`shortComic.js` |
| 图片调用 | 策略工厂支持 `openai` / `grsai` | `server/app/providers/*` |
| 业务泄漏 | shortComic / novel 直连 SDK，旁路门面 | 同上 |
| 运行时选择 | 无法指定提供商，永远默认 | `getAiConfigWithKey(type)` |

### 1.2 目标

1. **多提供商**：管理员可增删改、启用/禁用、设置默认（文本与图片分开）。
2. **默认 + 覆盖**：有默认则请求不带 `providerId` 时用默认；可带 `providerId` 覆盖。
3. **全员可选**：任意登录用户在业务页可选择任一 **enabled** 提供商（不限 admin）。
4. **允许空配置**：零提供商或全禁用时，options 返回空列表，UI 展示「没有供应商可选」，生成 API 返回明确错误（如 503 / 业务错误码），**禁止**环境变量或硬编码静默兜底。
5. **协议**：文本 `openai` | `anthropic`；图片 `openai` | `grok`。
6. **依赖**：文本 Anthropic 使用 `@anthropic-ai/sdk`。
7. **破坏性替换**：旧 AI 配置 / grsai / 旧 API **整块删除**，无兼容层、无双写、无 feature flag。

### 1.3 非目标

- 不做旧配置迁移 / 旧 API 兼容 / 旧字段双写 / 环境变量回退。
- 不做 `grsai` 专有协议（`/v1/draw/*` 等）。
- 不做用户私有 API Key、自动故障转移、流式 SSE 到浏览器、视频生成。

### 1.4 明确删除清单（实施时一次性清掉）

| 删除项 | 说明 |
|---|---|
| `server/app/providers/grsai.js` | grsai draw 协议实现 |
| `providers/index.js` 中 `grsai` 注册 | 工厂不再认识 grsai |
| `ai-image.js` 内 `apiFormat === 'grsai'` 分支 | 业务层禁止协议特判 |
| `ai-config` 旧服务/控制器/路由 | 由 `ai-provider` 全新 API 替换 |
| `configs` 中 `ai/*` KV 运行时读取 | 运行时只认新表 |
| 管理端旧双表单逻辑 | 改为多提供商列表 UI |
| 相关单测中的 grsai 用例 | 删除或改为 openai 参考图用例 |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` 等静默回退 | **删除**；配置只来自 `ai_configs` |

管理员在新后台 **重新录入** 提供商即可。旧密钥不自动搬家。

---

## 2. 现状问题诊断（指导重构，非迁移依据）

1. **显示名 = 存储键**：`provider` 既当名又当 key，多实例不可能。
2. **文本无协议层**：Anthropic 无法接入。
3. **图片策略泄漏**：`if (grsai)` 说明抽象失败。
4. **双轨存储**：`ai_configs` 表与 `configs` KV 并存，心智混乱。
5. **旁路调用**：novel/shortComic 复制 `getClient`，改协议必漏。

---

## 3. grsai 调研结论 → 协议决策

调研：

- 控制台：`https://grsai.com/zh/dashboard/documents/gpt-image`
- 新版文档：`https://qmy27nhsd9.apifox.cn/`（含 `/v1/images/generations`）

| 接口 | OpenAI 兼容？ |
|---|---|
| `POST /v1/images/generations` | **是** |
| `POST /v1/chat/completions` | **是** |
| 旧 `/v1/draw/*`、新 `/v1/api/generate` | 否（本方案 **不实现**） |

**决策：不保留、不新增 grsai 协议。**

使用 grsai 中转时：

- 协议选 **`openai`**
- `baseUrl` 填 `https://grsaiapi.com` 或 `https://grsai.dakka.com.cn`
- 模型如 `gpt-image-2`

OpenAI 图片适配器需支持中转常见的参考图写法：generations body 中的 `image: [url|base64]`（与官方 `images.edit` multipart 并列，作为回退通道）。这是 **openai 协议能力**，不是 grsai 协议。

---

## 4. sub2api Grok 图片协议

来源：sub2api 公开说明与 xAI 图片端点惯例。

| 能力 | 路径 |
|---|---|
| 同步生图 | `POST /v1/images/generations` |
| 同步编辑 | `POST /v1/images/edits` |
| 异步生图 | `POST /v1/images/generations/async` |
| 异步编辑 | `POST /v1/images/edits/async` |
| 任务查询 | `GET /v1/images/tasks/{task_id}` |

常见模型：`grok-imagine`、`grok-imagine-image`、`grok-imagine-image-quality`、`grok-imagine-edit` 等。

### 为何独立 `grok` 而不并进 `openai`

| | OpenAI 兼容中转 | sub2api Grok |
|---|---|---|
| 耗时 | 多为同步短请求 | 常需 **async + poll** |
| 参考图 | edit multipart 或 body.image | edits / generations 扩展（以实例文档为准） |
| 超时 | 秒～分钟 | 分钟级可配置轮询 |

`grok` 策略对上统一 `generate({ prompt, references, size })`，内部：

1. 有参考图 → edits（sync → async+poll）
2. 无参考图 → generations（sync → async+poll）
3. `extra.pollIntervalMs` / `maxPollAttempts` / `preferAsync` 可配（默认 2s / 300 / false）

实施前对目标 sub2api 做契约探针，样例进 `test/fixtures`。

---

## 5. 目标架构

### 5.1 分层

```
Controller / 业务 Service
        │  providerId?
        ▼
Facade: ai-text.js / ai-image.js
        │  resolve provider → protocol.generate/chat
        ▼
Registry: createTextProtocol / createImageProtocol
        │
   ┌────┴────┐
   ▼         ▼
text:      image:
openai     openai
anthropic  grok
        │
        ▼
Repository: ai-provider（CRUD + default + resolve）
```

| 模式 | 职责 |
|---|---|
| Strategy | 各协议同接口 |
| Registry / Factory | 注册与创建，扩展不改调用方 |
| Facade | 业务唯一入口，消灭旁路 |
| Repository | 配置持久化 |
| Adapter | 上游响应 → `{ content }` / `{ imageBuffer \| imageUrl }` |

### 5.2 协议契约

**文本**

```javascript
// chat(req) → { content: string, raw?: any }
// req: { model, messages, temperature?, responseFormat?: 'json_object'|'text', maxTokens? }
```

- OpenAI：messages 原样；json 用 `response_format`。
- Anthropic：`system` 抽顶层；messages 仅 user/assistant；JSON 靠 system 约束 + 现有健壮解析。

**图片**

```javascript
// generate(req) → { imageBuffer?: Buffer, imageUrl?: string }
// req: {
//   model, prompt, size?,
//   references?: Array<
//     | { type:'path', path }
//     | { type:'url', url }
//     | { type:'base64', data, mimeType }
//   >
// }
```

业务层只拼 prompt、收集本地路径为 `references`、落盘。**禁止** `if (protocol === ...)`。

### 5.3 目录

```
server/app/
  service/
    ai-provider.js
    ai-text.js
    ai-image.js
  ai/
    registry.js
    text/
      base.js
      openai.js
      anthropic.js
    image/
      base.js
      openai.js
      grok.js
    utils/
      download.js
      reference.js
  controller/
    aiProvider.js
# 删除: app/providers/ 整目录（或仅在删除前短暂 re-export，最终不留）
```

---

## 6. 数据模型

### 6.1 选型

以 **`ai_configs` 表** 为唯一真相源（多行结构化配置）。  
**不**再读 `configs` 里的 `ai/*` 作为运行时配置。

旧 `configs` 中 `ai/default`、`ai/{name}` 等键：**可忽略或部署时手工清掉**，代码不负责迁移。

### 6.2 表结构

在现有 `ai_configs` 上增量加列（幂等检测列是否存在）。表内旧行若存在且无意义，**可清空后由管理员重建**（产品已确认不迁移）。

```sql
-- 目标语义（新建库可直接写进 init.sql）
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                      -- 全局为 NULL
  type TEXT NOT NULL,                   -- text | image
  name TEXT NOT NULL,                   -- 显示名
  protocol TEXT NOT NULL,               -- openai | anthropic | grok
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  extra TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

相对旧表的处理建议：

1. `ALTER` 增加 `name/protocol/enabled/is_default/extra`。
2. **删除**对 `api_format`、旧 `provider` 语义的依赖；`provider` 列若仍在，可不再写入，或与 `name` 同值仅为占位。
3. 破坏性更新部署时执行：`DELETE FROM ai_configs`（**仅** AI 配置表，不动漫画/角色等业务数据），管理员重新录入。部署说明写明「必须重新配置 AI」。
4. **禁止** `rm *.db`；只动 AI 配置数据。

字段：

| 字段 | 含义 |
|---|---|
| `type` | `text` \| `image` |
| `name` | UI 显示名 |
| `protocol` | Registry key |
| `is_default` | 同 type 最多一条为 1（应用层事务保证） |
| `extra` | JSON，如 grok 轮询参数 |

### 6.3 协议枚举（最终）

**文本**

| protocol | 说明 |
|---|---|
| `openai` | Chat Completions |
| `anthropic` | Messages API |

**图片**

| protocol | 说明 |
|---|---|
| `openai` | `/v1/images/generations`（及 edit / body.image 回退） |
| `grok` | sub2api Grok 媒体 + async 轮询 |

无 `grsai`。

---

## 7. API 设计

### 7.1 管理端（admin）

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/ai-providers` | 列表（脱敏） |
| `GET` | `/api/ai-providers/:id` | 详情（脱敏） |
| `POST` | `/api/ai-providers` | 新建 |
| `PUT` | `/api/ai-providers/:id` | 更新（apiKey 空 = 不改） |
| `DELETE` | `/api/ai-providers/:id` | 删除；**允许删到零配置**（含删除原默认） |
| `POST` | `/api/ai-providers/:id/set-default` | 设默认；若删除默认且仍有其它启用项，可自动将最早一条设为默认，或保持无默认（见 resolve 规则） |
| `POST` | `/api/ai-providers/:id/test` | 连通性（可选二期） |

```json
{
  "type": "text",
  "name": "Claude 中转",
  "protocol": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "apiKey": "sk-...",
  "model": "claude-sonnet-4-20250514",
  "enabled": true,
  "extra": {}
}
```

### 7.2 业务下拉（**所有登录用户**）

`GET /api/ai-providers/options?type=text|image`  
- 权限：JWT 登录即可（**不限 admin**）  
- 仅返回 `enabled=1` 的项  
- 字段：`{ id, name, protocol, model, isDefault }`，无密钥、无 baseUrl  
- **允许空数组** `[]`：表示当前没有可选供应商  

### 7.3 业务透传与 resolve

Body 可选 `providerId`。规则：

1. 有 `providerId` → 必须存在、`enabled=1`、`type` 匹配，否则 400  
2. 无 `providerId` → 使用该 type 的 `is_default=1` 且 `enabled=1` 的记录  
3. 无默认但有其它启用项 → 使用 **id 最小** 的启用项，并打 warn 日志（避免「有配置却点不了」）  
4. 无任何启用项 → **503**（或统一业务错误），文案：`AI 服务未配置，请联系管理员在后台添加提供商`  
5. **绝不**读环境变量 / 旧 KV 兜底  

涉及：章节脚本/出图/提示词、角色参考图、填表、小说、短篇等所有 AI 入口。

### 7.4 旧 API

**直接删除**（破坏性）：

- `GET/PUT /api/ai-config*`
- 前端 `web/src/api/ai-config.js` → 替换为 `ai-provider.js`

---

## 8. 协议实现要点

### 8.1 文本 OpenAI

`chat.completions.create`；JSON 场景带 `response_format`；复用 `removeThinkTags` / `parseJsonObject`。

### 8.2 文本 Anthropic

- **依赖**：`@anthropic-ai/sdk`（已确认引入，写入 `server/package.json`）。
- `messages.create`；JSON 靠 system 强约束 + 现有健壮解析。

### 8.3 图片 OpenAI

1. 无参考图：`images.generate`  
2. 有参考图：优先 `images.edit`（multipart）；失败则 raw `POST /v1/images/generations` + body.`image` 数组（兼容 grsai 等中转）  
3. 统一解析 `b64_json` / `url`

### 8.4 图片 Grok

```
generate:
  refs? → edits sync → edits async+poll
  else  → gens  sync → gens  async+poll
```

错误信息中文；超时可区分提示。

---

## 9. 前端

### 9.1 管理页

- Tab：文本 | 图片提供商  
- 表：名称、协议、模型、Base URL、默认、启用、操作  
- 对话框：协议 select 驱动默认 baseUrl hint  
- 协议选项：  
  - 文本：OpenAI 兼容 / Anthropic  
  - 图片：OpenAI 兼容 / Grok（sub2api）  
- **无**「GRS AI 旧版」选项；需要 grsai 时选 OpenAI 兼容并填 grsai host

### 9.2 业务页提供商选择（全登录用户）

| options 结果 | UI 行为 |
|---|---|
| 0 条 | 展示 **「没有供应商可选」**（禁用生成按钮或点击后 toast 同文案）；不假装有默认模型 |
| 1 条 | 可隐藏下拉，请求仍可带该 `providerId` 或不带（后端走 resolve） |
| ≥2 条 | 显示下拉，文案 `{name} · {model}`；默认选中 `isDefault` 项，若无默认则选列表第一项 |

所有 AI 操作入口（脚本/出图/角色图/短篇/小说/填表）共用同一套 options 拉取与空态文案。

实现阶段遵循 `frontend-design` skill。

---

## 10. 业务收敛

| 现状 | 目标 |
|---|---|
| novel / shortComic 直连 OpenAI | 全部进 `aiText` / `aiImage` |
| `if grsai` | 删除；参考图统一 `references` |

门面方法示例：

```javascript
// ai-text
chat / generateScript / fillForm / generateChapterPrompt  // 均支持 providerId

// ai-image
generateCharacterReference / generateComicPage / generateFromPrompt
```

门禁：业务文件禁止 `require('openai')` / `@anthropic-ai/sdk`（仅 `ai/text|image` 协议层可引用）。

---

## 11. 错误处理与安全

1. 列表永不返回明文 apiKey；空串更新 = 保留原密钥  
2. **CRUD / set-default 需 admin**；**options 与业务生成：任意登录用户**  
3. `providerId` 的 type 必须匹配场景  
4. `enabled=0` 不可出现在 options；直接指定禁用 id → 400  
5. **允许系统处于「无提供商」状态**（删光、或尚未配置）；此时 options=`[]`，生成 → 503 + 明确文案  
6. 图片超时与 poll 上限对齐（建议反代 ≥ 10 分钟）  
7. 日志只打 providerId / protocol / model；禁止打印 apiKey

---

## 12. 测试计划

### 单测

- Registry 未知 protocol 抛错  
- OpenAI / Anthropic 文本 adapter（mock）  
- OpenAI 图片：generate + edit + body.image 回退  
- Grok：async 状态机  
- Repository：默认唯一、脱敏、删除规则  
- Facade：providerId 覆盖与 type 校验  
- **无** grsai 专用用例  

### 契约探针

| 目标 | 动作 |
|---|---|
| OpenAI 兼容中转（含 grsai host） | generations 文生图 + 可选参考图 |
| sub2api Grok | sync / async 各一次 → fixture |
| Anthropic | 问答 + JSON 脚本 |

### 回归

角色图、章节脚本/出图、短篇、小说、填表。

**空配置专项**：

- options 返回 `[]`  
- 前台文案「没有供应商可选」  
- 强行调生成 API → 503，无 SDK 调用

---

## 13. 实施分期

### Phase 1 — 数据与 Repository + 管理 API/UI

- 重整 `ai_configs`；`DELETE FROM ai_configs` 清空旧行  
- `ai-provider` service + controller + 路由  
- **删除** 旧 `ai-config` API / 环境变量回退 / 前端旧文件  
- 管理页多提供商列表（可录入 0 条）  

### Phase 2 — 协议层 + 业务收敛

- `ai/text/*`、`ai/image/*`、Registry  
- 引入 `@anthropic-ai/sdk`；实现 openai / anthropic / grok  
- 门面 resolve + `providerId`；空配置 503  
- 收敛 novel/shortComic；**删除** `app/providers`  

### Phase 3 — 业务页选择器

- options（全登录用户）+ 各入口下拉  
- 空态「没有供应商可选」  
- README / CHANGELOG 标明 **破坏性更新，需重新配置 AI**  

每期可测；无兼容开关、无双轨运行。

---

## 14. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 上线后必须重配 AI，短暂不可用 | CHANGELOG + 部署说明；空态文案指向管理后台 |
| Anthropic JSON 不稳定 | 健壮解析 + system 强约束 |
| sub2api 契约差 | 探针 + fixture；sync/async 双路径 |
| 中转参考图非 multipart | openai adapter body.image 回退 |
| 旁路漏改 | grep 门禁 |
| 长耗时被网关掐断 | 文档 `proxy_read_timeout`；Grok preferAsync |
| 用户误以为「坏了」 | 统一文案「没有供应商可选 / 请联系管理员配置」 |

---

## 15. 成功标准

1. 可配置 ≥2 文本 + ≥2 图片提供商，切换默认；也可配置为 **0 条**。  
2. **任意登录用户**可拉 options 并在业务页选择提供商。  
3. options 为空时 UI 为「没有供应商可选」；生成 API 不静默成功。  
4. 无 `providerId` 走 default（或唯一启用项规则）；有则命中指定。  
5. 文本 openai + anthropic（`@anthropic-ai/sdk`）均可生成脚本。  
6. 图片 openai + grok 均可生图；**无 grsai 协议 / draw 路径 / 旧 ai-config API / 环境变量回退**。  
7. novel / shortComic 不直接引用模型 SDK。  
8. 业务层无协议字符串分支。  

---

## 16. 与历史文档

- `docs/superpowers/specs/2026-05-05-image-provider-design.md` 中的 grsai 拆分设计 **被本方案取代**。  
- 本文为权威设计定稿。

---

## 17. 已拍板决策（原开放问题）

| 问题 | 决议 |
|---|---|
| 谁可选提供商 | **所有登录用户** |
| 未配置状态 | **允许**；前台「没有供应商可选」；生成明确失败 |
| Anthropic SDK | **接受** `@anthropic-ai/sdk` |
| 兼容性 | **不考虑**；破坏性更新 |
| 旧配置 | **清空 / 不迁移**；管理员重录 |
| grsai 协议 | **移除**；用 openai 协议填 grsai host |

### 实施期仅剩技术确认（不阻塞定稿）

- 目标 sub2api 实例 baseUrl 与默认是否 `preferAsync`（联调时定，adapter 两种都支持）。  
- 删除默认提供商后：优先「自动把剩余启用项中 id 最小者设为 default」，若已删光则保持无 default。

---

## 附录 A — 配置示例

### 文本 OpenAI 兼容

```json
{
  "type": "text",
  "name": "DeepSeek",
  "protocol": "openai",
  "baseUrl": "https://api.deepseek.com",
  "model": "deepseek-chat",
  "isDefault": true
}
```

### 文本 Anthropic

```json
{
  "type": "text",
  "name": "Claude Sonnet",
  "protocol": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-sonnet-4-20250514"
}
```

### 图片：grsai 中转（协议仍是 openai）

```json
{
  "type": "image",
  "name": "GRS AI gpt-image",
  "protocol": "openai",
  "baseUrl": "https://grsai.dakka.com.cn",
  "model": "gpt-image-2",
  "isDefault": true
}
```

### 图片：sub2api Grok

```json
{
  "type": "image",
  "name": "Grok Imagine",
  "protocol": "grok",
  "baseUrl": "https://your-sub2api.example.com",
  "model": "grok-imagine-image",
  "extra": {
    "preferAsync": true,
    "pollIntervalMs": 2000,
    "maxPollAttempts": 300
  }
}
```

---

## 附录 B — 章节出图时序

```
Browser → ChapterController → AiImageFacade → Protocol(openai|grok) → upstream
         { providerId? }      resolve+prompt+refs    generate()
```

---

**文档结束（定稿）。** 破坏性更新；无迁移、无 grsai、无兼容层。可直接进入实现计划或 Phase 1 开发。
