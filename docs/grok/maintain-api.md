# 数据库维护接口

面向正式服从旧版本（如 `2263ea1`）升级到当前代码时，对齐 schema 与业务数据。

## 配置

环境变量：

```bash
export MAINTAIN_TOKEN='足够长的随机串'
```

未配置时，所有 `/api/maintain*` 返回 `503`。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/maintain?token=...` | 列出任务 |
| POST | `/api/maintain/:name` | 执行任务 |

参数（query / JSON body / Header `X-Maintain-Token` 均可）：

| 参数 | 说明 |
|------|------|
| `token` | 与 `MAINTAIN_TOKEN` 一致 |
| `step` | `1` = 只分析；`2` = 真正执行 |

## 任务清单（相对 2263ea1）

| name | 作用 | 破坏性 |
|------|------|--------|
| `configs-storage` | 历史 `image_storage` → `configs.storage.*` | 否 |
| `ai-providers-v2` | `ai_configs` 补多提供商列；删除旧 text/image 配置与 `configs.category=ai` | 是（需重建 AI 提供商） |
| `style-presets-v2` | `comics.style_preset_id`；8 核心风格 upsert；删非核心；按 prompt 精确回填绑定 | 否（用户漫画不删，非核心预设会删） |

**启动策略：** `app.js` **不做任何迁移**（不补列、不删数据、不收敛风格）。  
仅 `init.js`：`CREATE IF NOT EXISTS` + **空库**时插入 8 条风格种子。  
从 `2263ea1` 升级正式服必须人工按下列顺序 step=1 → step=2 执行维护任务。

## 推荐流程（正式服）

```bash
# 1. 部署新版本代码并配置 MAINTAIN_TOKEN 后重启（启动不会改 schema）

# 2. 列出任务
curl -s "https://YOUR_HOST/api/maintain?token=$MAINTAIN_TOKEN" | jq

# 3. storage 配置迁移（若尚未做过）
curl -s -X POST "https://YOUR_HOST/api/maintain/configs-storage" \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$MAINTAIN_TOKEN\",\"step\":1}" | jq
# step=2 确认后执行

# 4. AI 提供商
curl -s -X POST "https://YOUR_HOST/api/maintain/ai-providers-v2" \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$MAINTAIN_TOKEN\",\"step\":1}" | jq
# step=2 确认后执行

# 5. 风格预设
curl -s -X POST "https://YOUR_HOST/api/maintain/style-presets-v2" \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$MAINTAIN_TOKEN\",\"step\":1}" | jq
# step=2 确认后执行
```

建议顺序：`configs-storage` → `ai-providers-v2` → `style-presets-v2`。执行前备份 `comic.db`。

## 扩展新任务

在 `server/app/maintain/` 新增模块并在 `index.js` 注册：

```js
module.exports = {
  name: 'short-name',
  description: '...',
  destructive: false,
  analyze(db) { return { ... }; },
  execute(db) { return { executed: true, ... }; },
};
```
