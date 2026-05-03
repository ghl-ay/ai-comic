# 前端优化设计文档

## 概述

基于 Vuetify 组件库优化 AI 漫画创作平台的前端交互和视觉风格，提升用户体验和界面质感。

## 需求总结

| 需求 | 描述 |
|------|------|
| 步骤切换 | 章节创作流程中的 Stepper 支持点击切换任意步骤 |
| 视觉风格 | 现代、简洁、高端，基于 Vuetify 组件库 |
| 主题支持 | 默认跟随系统偏好，支持深色/浅色主题切换 |

## 设计方案

### 1. 主题系统

**配色方案：**

| 角色 | 浅色主题 | 深色主题 |
|------|----------|----------|
| Primary | #6366f1 (Indigo) | #818cf8 |
| Secondary | #8b5cf6 (Purple) | #a78bfa |
| Surface | #18181b | #fafafa |
| Background | #f4f4f5 | #27272a |

**主题切换逻辑：**
- 默认跟随系统偏好 (`prefers-color-scheme`)
- 用户可在设置中手动切换
- 选择保存在 localStorage

### 2. 步骤组件

**当前问题：**
- Stepper 只能通过"上一步/下一步"按钮线性导航
- 用户无法快速返回查看或修改之前的步骤

**改进方案：**
- 保留 v-stepper 组件，保持流程感
- 添加点击事件，支持点击任意步骤直接跳转
- 保留完成状态的视觉反馈
- 保留上一步/下一步按钮作为辅助导航

**实现要点：**
- 移除 v-stepper 的 `linear` 属性（如有）
- 为每个 v-stepper-item 添加 @click 事件
- 点击后更新 `currentStep` 变量

### 3. 全局样式优化

| 调整项 | 变更 |
|--------|------|
| 卡片圆角 | 8px → 12px |
| 按钮圆角 | 4px → 8px |
| 卡片阴影 | 更柔和的阴影层次 |
| 间距规范 | 统一使用 8px 倍数 (8/16/24/32) |

**实现方式：**
- 通过 Vuetify theme 配置修改默认变量
- 保持与 Material Design 规范兼容

## 技术实现

### 文件改动

| 文件 | 改动内容 |
|------|----------|
| `web/src/plugins/vuetify.js` | 新建主题配置文件 |
| `web/src/main.js` | 引入 vuetify 插件配置 |
| `web/src/views/CreateChapter.vue` | Stepper 添加点击切换 |
| `web/src/stores/theme.js` | 新建主题状态管理（可选） |

### Vuetify 主题配置示例

```javascript
// web/src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#f4f4f5',
          surface: '#ffffff',
        },
      },
      dark: {
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#27272a',
          surface: '#18181b',
        },
      },
    },
  },
})

export default vuetify
```

### Stepper 点击切换示例

```vue
<!-- CreateChapter.vue -->
<v-stepper v-model="currentStep" alt-labels>
  <v-stepper-header>
    <v-stepper-item
      :value="1"
      :complete="currentStep > 1"
      clickable
      @click="currentStep = 1"
    >
      选择角色
    </v-stepper-item>
    <v-divider />
    <v-stepper-item
      :value="2"
      :complete="currentStep > 2"
      clickable
      @click="currentStep = 2"
    >
      生成分镜脚本
    </v-stepper-item>
    <v-divider />
    <v-stepper-item
      :value="3"
      :complete="currentStep > 3"
      clickable
      @click="currentStep = 3"
    >
      生成漫画图片
    </v-stepper-item>
  </v-stepper-header>
  <!-- ... -->
</v-stepper>
```

## 保持不变

- 页面结构和路由
- Vuetify 组件库核心用法
- 现有功能和业务逻辑

## 验收标准

1. Stepper 支持点击切换任意步骤
2. 应用默认跟随系统主题偏好
3. 用户可手动切换深色/浅色主题
4. 整体视觉风格更现代、有质感
5. 现有功能不受影响
