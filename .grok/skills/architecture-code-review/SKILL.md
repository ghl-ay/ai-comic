---
name: architecture-code-review
description: >
  Use when reviewing local diffs, PRs, or feature implementations for component
  encapsulation, design patterns, frontend extraction, data flow, and best practices.
  Triggers: "代码审查", "架构审查", "组件封装", "数据流动", "组件抽离", "设计模式审查",
  "architecture review", "review components", "/architecture-code-review".
---

# Architecture Code Review

对代码变更做**架构与封装质量**审查（不只是找 bug）。默认只读，不改业务代码；审查结论写入文件并摘要给用户。

## 审查维度（必须全部覆盖）

| 维度 | 核心问题 |
|------|----------|
| 1. 组件封装 | 职责是否单一？API（props/emits/slots）是否清晰？内部状态是否泄漏？ |
| 2. 设计模式 | 是否用了合适的分层/模式？有无反模式（God Object、Prop Drilling、重复分支）？ |
| 3. 前端组件抽离 | 可复用 UI 是否抽到 `components/`？页面是否过胖？重复块是否可合并？ |
| 4. 数据流动 | 单向数据流是否清晰？Store/API/Service 边界是否正确？有无双向耦合？ |
| 5. 最佳实践 | 错误处理、幂等、命名、性能、安全、与项目约定一致性 |

技术栈默认（本仓库）：**Vue 3 + Pinia + Vuetify** 前端；**Egg.js + Service/Controller** 后端。

详细检查清单见：`references/checklist.md`（按需加载，不要整文件塞进回复）。

## 工作流

### 1. 确定审查范围

按用户意图选择一种：

| 意图 | 范围命令 |
|------|----------|
| 本地未提交改动（默认） | `git status` + `git diff HEAD` + untracked |
| 对比某分支 | `git diff origin/main...HEAD` |
| 指定文件/目录 | 仅这些路径的 diff + 上下文源文件 |

收集：
- 变更文件列表（按 front/back/db/docs 分组）
- 统一 diff（过大时按模块拆分审查，>1MB 先问用户）
- 相关 plan/spec（如 `docs/grok/*`）作为意图对照，**不作为免责金牌**

### 2. 建立上下文（只读）

对每个变更热点：

1. 读 diff 理解「改了什么」
2. 读调用方与被调用方（不只看 diff 行）
3. 画清数据流（可在脑中或审查文件中写文字流）：
   - 前端：`View → Component → Store/API → Backend`
   - 后端：`Router → Controller → Service → DB / AI`

若前端与后端同改，**必须**核对契约是否一致（字段名、可空、错误码、路径）。

### 3. 按五维审查

对每个维度至少给出：
- **做得好的点**（1–3 条，避免空夸）
- **问题列表**（有证据：文件 + 行号 + 简短说明）
- **改进建议**（可执行，优先最小改动）

问题分级：

| 级别 | 含义 |
|------|------|
| `blocker` | 会导致错误行为、数据损坏、安全问题、契约断裂 |
| `major` | 明显的封装/数据流/重复问题，后续维护成本高 |
| `minor` | 可改进的一致性、命名、轻微重复 |
| `nit` | 风格偏好，可忽略 |

**禁止**：为凑数发明问题；把「未在本次 diff 引入但相邻存在」的旧债标为 blocker（可标 `pre-existing`）。

### 4. 组件抽离专项规则（前端）

优先指出：

- View 内超过 ~80 行模板逻辑、或 3+ 处重复 UI → 建议抽离
- 选择器/卡片/列表同时出现在多个页面 → 应收口到 `components/style` 或 `components/business`
- 业务副作用（API 调用、路由跳转）混在纯展示组件 → 上移到页面/容器或 composable
- 仅用一次的「假通用组件」过度抽象 → 建议内联，勿为抽而抽

评估拆分时回答：
1. 这个组件换一个父级还能用吗？
2. props 是否只表达输入，emits 是否只表达事件？
3. 是否需要 v-model 双向绑定，还是单向 + 事件更清晰？

### 5. 数据流动专项规则

前端：
- 服务端状态：优先 Store 或页面级 fetch，避免兄弟组件各自打同一接口且无共享
- 表单中间态：可留在组件本地；提交结果回写 Store/父级
- 避免：子组件直接改 props 对象深层字段；跨层事件总线式隐式通信

后端：
- Controller 只做参数校验与响应形状；业务在 Service
- 跨资源写操作应在同一 Service 事务边界内（若项目有事务约定）
- AI/外部 IO 与 DB 写之间注意失败补偿与幂等

### 6. 输出产物

写入项目目录（便于后续迭代）：

```
docs/grok/reviews/YYYY-MM-DD-<topic>-architecture-review.md
```

`topic` 用短横线英文或拼音，如 `style-preset`。

文件结构：

```markdown
# 架构代码审查：<主题>

- 日期：
- 范围：local / branch / files
- 对照文档：（如有）
- 结论摘要：（2–4 句）

## 变更地图
（按模块列出文件与职责一句话）

## 数据流（文字）
View/API → ... → DB

## 五维评估

### 1. 组件封装
#### 优点
#### 问题
#### 建议

### 2. 设计模式
...

### 3. 前端组件抽离
...

### 4. 数据流动
...

### 5. 最佳实践
...

## 问题清单（汇总）

| ID | 级别 | 维度 | 位置 | 说明 | 建议 |
|----|------|------|------|------|------|

## 建议修复优先级
1. ...
2. ...

## 非目标 / 不在本次改
（明确哪些是旧债或后续项）
```

同时在对话里用**中文**给用户一份精简版：
1. 总评（是否可合并 / 需先修）
2. Top 问题（最多 7 条）
3. 审查全文路径

## 执行约束

- **只读审查**：不修改业务源码；仅可创建审查报告文件
- 输出语言：**简体中文**（代码标识符保持原样）
- 引用代码用 `path` + 行号；大段代码只摘关键 5–15 行
- 对照 plan 时区分：「实现偏离设计」vs「设计本身可商榷」
- 若 diff 极大：先按模块分批评，最后汇总一张总表
- 与通用 `/review` 的关系：本 skill 偏**架构与封装**；通用 review 偏 bug/正确性。可并行，结论勿重复粘贴同一问题两次（合并到更高价值表述）

## 快速启动命令

```bash
# 范围
git status --short
git diff --stat HEAD
git -c core.quotepath=false diff HEAD

# untracked 内容（需一并审查）
git ls-files --others --exclude-standard
```

然后对变更热点 `read_file` / `grep` 建立调用关系，再写报告。
