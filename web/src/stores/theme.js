// web/src/stores/theme.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

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
  function applyTheme(vuetifyTheme) {
    // 使用 Vuetify 3.5+ 的新 API
    if (typeof vuetifyTheme.change === 'function') {
      vuetifyTheme.change(currentTheme.value)
    } else {
      // 兼容旧版本
      vuetifyTheme.global.name.value = currentTheme.value
    }
  }

  // 切换主题
  function toggleTheme(vuetifyTheme) {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(vuetifyTheme)
    localStorage.setItem(STORAGE_KEY, currentTheme.value)
  }

  // 监听系统主题变化
  function watchSystemTheme(vuetifyTheme) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      // 仅当用户未手动设置时跟随系统
      if (!localStorage.getItem(STORAGE_KEY)) {
        currentTheme.value = e.matches ? 'dark' : 'light'
        applyTheme(vuetifyTheme)
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
