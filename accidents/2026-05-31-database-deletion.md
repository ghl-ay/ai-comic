# 事故报告：数据库误删事件

- **日期**: 2026-05-31
- **严重级别**: 高
- **影响范围**: 用户全部历史漫画数据丢失

## 事故概述

为给 `comics` 表添加 `type` 字段（用于区分短篇漫画），错误地删除了整个数据库文件 `server/database/comic.db`，导致用户历史漫画数据永久丢失。

## 事故经过

1. 发现 `comics` 表缺少 `type` 字段
2. 错误选择删除数据库文件来重建表结构
3. 执行 `rm /workspace/server/database/comic.db`
4. 重启服务后数据库重建，但原有数据全部丢失

## 根本原因

- 未使用 `ALTER TABLE ADD COLUMN` 进行增量迁移
- 未评估删除操作的数据丢失风险
- 未在执行前确认数据库是否有备份

## 正确做法

```sql
ALTER TABLE comics ADD COLUMN type VARCHAR(20) DEFAULT 'normal';
```

## 改进措施

已在 `server/database/init.js` 中添加迁移逻辑，使用 `ALTER TABLE` 添加新字段，支持幂等执行。

## 教训

- 数据库文件不得直接删除
- 字段变更必须使用 ALTER TABLE
- 破坏性操作必须先评估影响并告知用户
