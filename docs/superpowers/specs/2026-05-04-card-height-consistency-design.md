# 卡片高度一致性与文本省略设计

## 问题背景

角色库和漫画列表页面使用 v-card 展示卡片列表，存在以下问题：

1. 卡片高度不一致 - 内容长度不同导致卡片高度参差不齐
2. 文本无省略处理 - 长文本会撑开容器，影响布局整齐度

## 解决方案

### 1. 卡片固定高度

- 所有卡片统一 **420px** 高度
- 卡片内部使用 flex 布局，确保内容区域正确填充

### 2. 文本多行省略

使用 CSS `-webkit-line-clamp` 实现：

| 文本类型 | 省略行数 | 说明 |
|---------|---------|------|
| 标题 | 1行 | 保持可读性 |
| 描述/风格 | 3行 | 展示更多内容 |

### 3. 实现方式

添加 scoped CSS 样式类：

```css
/* 卡片固定高度 */
.card-fixed {
  height: 420px;
  display: flex;
  flex-direction: column;
}

/* 单行省略 */
.text-ellipsis-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行省略 */
.text-ellipsis-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

## 涉及文件

1. `web/src/views/Characters.vue` - 角色卡片
   - 卡片高度固定
   - 描述、外观文本省略

2. `web/src/views/Comics.vue` - 漫画卡片
   - 卡片高度固定
   - 标题、风格文本省略

## 验收标准

- [ ] 所有卡片高度一致为 420px
- [ ] 标题超出时显示单行省略号
- [ ] 描述/风格文本超出时显示 3 行省略号
- [ ] 不影响现有功能和交互
