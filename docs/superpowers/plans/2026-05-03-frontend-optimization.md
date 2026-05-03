# 前端优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化前端交互和视觉风格，实现 Stepper 点击切换和主题系统。

**Architecture:** 基于 Vuetify 主题配置系统，抽取独立的 vuetify 插件文件，修改 Stepper 组件支持点击切换，通过 localStorage 实现主题持久化。

**Tech Stack:** Vue 3, Vuetify 3, Pinia

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `web/src/plugins/vuetify.js` | 新建 | Vuetify 主题配置 |
| `web/src/main.js` | 修改 | 引入 vuetify 插件 |
| `web/src/stores/theme.js` | 新建 | 主题状态管理 |
| `web/src/views/CreateChapter.vue` | 修改 | Stepper 点击切换 |
| `web/src/views/Comics.vue` | 修改 | 添加主题切换按钮 |

---

### Task 1: 创建 Vuetify 主题配置

**Files:**
- Create: `web/src/plugins/vuetify.js`

- [ ] **Step 1: 创建 plugins 目录和 vuetify.js 文件**

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
        dark: false,
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#f4f4f5',
          surface: '#ffffff',
          'on-background': '#18181b',
          'on-surface': '#18181b',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#18181b',
          surface: '#27272a',
          'on-background': '#fafafa',
          'on-surface': '#fafafa',
        },
      },
    },
  },
})

export default vuetify
```

- [ ] **Step 2: 提交**

```bash
git add web/src/plugins/vuetify.js
git commit -m "feat(web): 添加 Vuetify 主题配置"
```

---

### Task 2: 更新 main.js 引入主题配置

**Files:**
- Modify: `web/src/main.js`

- [ ] **Step 1: 修改 main.js 引入 vuetify 插件**

```javascript
// web/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import vuetify from './plugins/vuetify'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
```

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd web && npm run dev`
Expected: 应用正常启动，无报错

- [ ] **Step 3: 提交**

```bash
git add web/src/main.js
git commit -m "refactor(web): 抽取 Vuetify 配置到独立插件文件"
```

---

### Task 3: 创建主题状态管理

**Files:**
- Create: `web/src/stores/theme.js`

- [ ] **Step 1: 创建 theme store**

```javascript
// web/src/stores/theme.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'ai-print-theme'

  // 获取初始主题：localStorage > 系统偏好 > light
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  const currentTheme = ref(getInitialTheme())

  // 应用主题到 Vuetify
  function applyTheme(vuetifyInstance) {
    vuetifyInstance.theme.global.name.value = currentTheme.value
  }

  // 切换主题
  function toggleTheme(vuetifyInstance) {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(vuetifyInstance)
    localStorage.setItem(STORAGE_KEY, currentTheme.value)
  }

  // 监听系统主题变化
  function watchSystemTheme(vuetifyInstance) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      // 仅当用户未手动设置时跟随系统
      if (!localStorage.getItem(STORAGE_KEY)) {
        currentTheme.value = e.matches ? 'dark' : 'light'
        applyTheme(vuetifyInstance)
      }
    })
  }

  return {
    currentTheme,
    applyTheme,
    toggleTheme,
    watchSystemTheme,
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add web/src/stores/theme.js
git commit -m "feat(web): 添加主题状态管理"
```

---

### Task 4: 在 Comics 页面添加主题切换按钮

**Files:**
- Modify: `web/src/views/Comics.vue`

- [ ] **Step 1: 添加主题切换按钮到操作栏**

修改 `web/src/views/Comics.vue` 的模板部分，在操作按钮区域添加主题切换按钮：

找到第 8-31 行的按钮区域，添加主题切换按钮：

```vue
<!-- web/src/views/Comics.vue 第 8-31 行替换为 -->
<div class="d-flex justify-space-between align-center mb-4">
  <h1>我的漫画</h1>
  <div>
    <v-btn
      color="primary"
      variant="text"
      to="/characters"
      class="mr-2"
    >
      <v-icon left>mdi-account-group</v-icon>
      角色库
    </v-btn>
    <v-btn
      color="secondary"
      variant="text"
      to="/settings/ai"
      class="mr-2"
    >
      <v-icon left>mdi-cog</v-icon>
      AI 设置
    </v-btn>
    <v-btn
      color="default"
      variant="text"
      class="mr-2"
      @click="toggleTheme"
    >
      <v-icon left>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
      {{ isDark ? '浅色' : '深色' }}
    </v-btn>
    <v-btn color="error" variant="text" @click="logout">
      <v-icon left>mdi-logout</v-icon>
      登出
    </v-btn>
  </div>
</div>
```

- [ ] **Step 2: 添加主题相关逻辑到 script 部分**

在 `<script setup>` 中添加主题相关代码：

```javascript
// 在 import 部分添加
import { useThemeStore } from '../stores/theme'
import { useTheme } from 'vuetify'
import { computed, onMounted } from 'vue'

// 在现有代码后添加
const vuetifyTheme = useTheme()
const themeStore = useThemeStore()

const isDark = computed(() => themeStore.currentTheme === 'dark')

function toggleTheme() {
  themeStore.toggleTheme(vuetifyTheme)
}

onMounted(() => {
  themeStore.applyTheme(vuetifyTheme)
  themeStore.watchSystemTheme(vuetifyTheme)
})
```

- [ ] **Step 3: 启动开发服务器验证**

Run: `cd web && npm run dev`
Expected: 点击主题切换按钮，界面颜色切换正常

- [ ] **Step 4: 提交**

```bash
git add web/src/views/Comics.vue
git commit -m "feat(web): 添加主题切换按钮"
```

---

### Task 5: 修改 Stepper 支持点击切换

**Files:**
- Modify: `web/src/views/CreateChapter.vue`

- [ ] **Step 1: 修改 v-stepper-header 添加点击事件**

找到 `web/src/views/CreateChapter.vue` 第 29-39 行的 `v-stepper-header` 部分，替换为：

```vue
<v-stepper-header>
  <v-stepper-item
    :value="1"
    :complete="currentStep > 1"
    @click="currentStep = 1"
    style="cursor: pointer"
  >
    选择角色
  </v-stepper-item>
  <v-divider />
  <v-stepper-item
    :value="2"
    :complete="currentStep > 2"
    @click="currentStep = 2"
    style="cursor: pointer"
  >
    生成分镜脚本
  </v-stepper-item>
  <v-divider />
  <v-stepper-item
    :value="3"
    :complete="currentStep > 3"
    @click="currentStep = 3"
    style="cursor: pointer"
  >
    生成漫画图片
  </v-stepper-item>
</v-stepper-header>
```

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd web && npm run dev`
Expected: 点击任意步骤可切换到对应步骤

- [ ] **Step 3: 提交**

```bash
git add web/src/views/CreateChapter.vue
git commit -m "feat(web): Stepper 支持点击切换步骤"
```

---

### Task 6: 全局样式优化

**Files:**
- Modify: `web/src/plugins/vuetify.js`

- [ ] **Step 1: 添加全局样式变量到 vuetify 配置**

修改 `web/src/plugins/vuetify.js`，添加 `defaults` 配置：

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
        dark: false,
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#f4f4f5',
          surface: '#ffffff',
          'on-background': '#18181b',
          'on-surface': '#18181b',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#18181b',
          surface: '#27272a',
          'on-background': '#fafafa',
          'on-surface': '#fafafa',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'lg',
      elevation: 2,
    },
    VBtn: {
      rounded: 'lg',
    },
    VTextField: {
      rounded: 'lg',
    },
    VTextarea: {
      rounded: 'lg',
    },
  },
})

export default vuetify
```

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd web && npm run dev`
Expected: 卡片和按钮圆角增大，阴影更柔和

- [ ] **Step 3: 提交**

```bash
git add web/src/plugins/vuetify.js
git commit -m "style(web): 优化全局样式 - 圆角和阴影"
```

---

### Task 7: 验收测试

- [ ] **Step 1: 手动验收测试**

检查项：
1. [ ] Stepper 点击切换正常工作
2. [ ] 主题切换按钮正常工作
3. [ ] 刷新页面后主题保持
4. [ ] 深色/浅色主题配色正确
5. [ ] 卡片和按钮圆角已更新
6. [ ] 现有功能不受影响（漫画创建、角色管理、章节创作）

- [ ] **Step 2: 最终提交（如有遗漏修复）**

```bash
git add -A
git commit -m "fix(web): 前端优化验收修复"
```

---

## 验收标准

- [ ] Stepper 支持点击切换任意步骤
- [ ] 应用默认跟随系统主题偏好
- [ ] 用户可手动切换深色/浅色主题
- [ ] 切换后刷新页面主题保持
- [ ] 整体视觉风格更现代、有质感
- [ ] 现有功能不受影响
