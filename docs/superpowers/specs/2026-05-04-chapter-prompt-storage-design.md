# 章节提示词与角色选择存储设计

## 背景

当前用户生成分镜脚本时提交的「章节提示词」和「出场角色ID列表」仅作为临时参数传递给AI，不会持久化存储。用户无法回顾之前用了什么提示词和角色，不便于后续微调和复盘。

## 目标

将用户提交的章节提示词和出场角色ID列表存储到数据库，方便用户回顾和复盘。

## 设计方案

### 数据库变更

**chapters 表新增字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| chapter_prompt | TEXT | 章节提示词（用户输入的剧情描述） |
| character_ids | TEXT | 出场角色ID列表，JSON数组格式，如 `[1, 3, 5]` |

**迁移SQL：**
```sql
ALTER TABLE chapters ADD COLUMN chapter_prompt TEXT;
ALTER TABLE chapters ADD COLUMN character_ids TEXT;
```

### 后端变更

1. **`server/database/init.sql`** - 建表语句添加新字段
2. **`server/app/service/chapter.js`** - `generateScript` 方法在调用AI前先存储提示词和角色ID
3. **`server/app/service/db.js`** - 确保 `getChapter()` 返回新字段

### 前端变更

章节详情页展示已存储的提示词和出场角色信息。

### API 返回示例

```json
{
  "id": 1,
  "chapter_number": 1,
  "title": "第一章 开端",
  "chapter_prompt": "主角在咖啡馆遇到了神秘的陌生人...",
  "character_ids": "[1, 3]",
  "script_content": { ... },
  "status": "script_ready"
}
```

## 存储策略

- 每次生成分镜脚本时覆盖更新
- 不保留历史版本
