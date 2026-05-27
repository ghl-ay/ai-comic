// web/src/stores/theme.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { lightTheme, darkTheme } from '../themes/colors'

export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'ai-comic-theme'

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
  const systemTheme = ref('light')

  // 计算属性
  const isDark = computed(() => currentTheme.value === 'dark')
  const themeColors = computed(() => isDark.value ? darkTheme : lightTheme)

  // 应用主题到 Vuetify
  function applyTheme(vuetifyTheme) {
    // Vuetify 3.5+ 使用 global.name.value 设置主题
    if (vuetifyTheme.global?.name) {
      vuetifyTheme.global.name.value = currentTheme.value
    }
    
    // 应用 CSS 变量到文档根元素
    applyCSSVariables()
    
    // 设置 data-theme 属性
    document.documentElement.setAttribute('data-theme', currentTheme.value)
  }

  // 应用 CSS 变量
  function applyCSSVariables() {
    const colors = themeColors.value
    const root = document.documentElement
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })
  }

  // 切换主题
  function toggleTheme(vuetifyTheme) {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(vuetifyTheme)
    localStorage.setItem(STORAGE_KEY, currentTheme.value)
  }

  // 设置主题
  function setTheme(theme, vuetifyTheme) {
    if (theme === 'light' || theme === 'dark') {
      currentTheme.value = theme
      applyTheme(vuetifyTheme)
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  // 设置系统主题
  function setSystemTheme(theme) {
    systemTheme.value = theme
    // 如果用户未手动设置，则跟随系统
    if (!localStorage.getItem(STORAGE_KEY)) {
      currentTheme.value = theme
    }
  }

  // 监听系统主题变化
  function watchSystemTheme(vuetifyTheme) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    // 初始化系统主题
    systemTheme.value = mediaQuery.matches ? 'dark' : 'light'
    
    mediaQuery.addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setSystemTheme(newTheme)
      
      // 仅当用户未手动设置时跟随系统
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(vuetifyTheme)
      }
    })
  }

  // 重置为系统主题
  function resetToSystemTheme(vuetifyTheme) {
    localStorage.removeItem(STORAGE_KEY)
    currentTheme.value = systemTheme.value
    applyTheme(vuetifyTheme)
  }

  // 获取主题配置
  function getThemeConfig() {
    return {
      isDark: isDark.value,
      colors: themeColors.value,
      currentTheme: currentTheme.value,
      systemTheme: systemTheme.value,
    }
  }

  return {
    // 状态
    currentTheme,
    systemTheme,
    
    // 计算属性
    isDark,
    themeColors,
    
    // 方法
    applyTheme,
    toggleTheme,
    setTheme,
    setSystemTheme,
    watchSystemTheme,
    resetToSystemTheme,
    getThemeConfig,
    applyCSSVariables,
  }
})
