// web/src/stores/ui.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // 状态
  const sidebarOpen = ref(false)
  const currentBreakpoint = ref('lg')
  const loading = ref(false)
  const notifications = ref([])
  const modals = ref({})
  const drawers = ref({})
  const tooltips = ref({})

  // 计算属性
  const isMobile = computed(() => ['xs', 'sm'].includes(currentBreakpoint.value))
  const isTablet = computed(() => currentBreakpoint.value === 'md')
  const isDesktop = computed(() => ['lg', 'xl'].includes(currentBreakpoint.value))

  // 设置断点
  function setBreakpoint(breakpoint) {
    currentBreakpoint.value = breakpoint
  }

  // 切换侧边栏
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 打开侧边栏
  function openSidebar() {
    sidebarOpen.value = true
  }

  // 关闭侧边栏
  function closeSidebar() {
    sidebarOpen.value = false
  }

  // 设置全局加载状态
  function setLoading(value) {
    loading.value = value
  }

  // 显示通知
  function showNotification(notification) {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      type: 'info',
      closable: true,
      autoClose: true,
      duration: 5000,
      ...notification,
    }
    
    notifications.value.push(newNotification)
    
    // 自动关闭
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
    
    return id
  }

  // 移除通知
  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  // 清空所有通知
  function clearNotifications() {
    notifications.value = []
  }

  // 显示成功通知
  function showSuccess(message, title = '成功') {
    return showNotification({
      type: 'success',
      title,
      message,
    })
  }

  // 显示错误通知
  function showError(message, title = '错误') {
    return showNotification({
      type: 'error',
      title,
      message,
      autoClose: false,
    })
  }

  // 显示警告通知
  function showWarning(message, title = '警告') {
    return showNotification({
      type: 'warning',
      title,
      message,
    })
  }

  // 显示信息通知
  function showInfo(message, title = '提示') {
    return showNotification({
      type: 'info',
      title,
      message,
    })
  }

  // 打开模态框
  function openModal(name, props = {}) {
    modals.value[name] = {
      open: true,
      props,
    }
  }

  // 关闭模态框
  function closeModal(name) {
    if (modals.value[name]) {
      modals.value[name].open = false
    }
  }

  // 关闭所有模态框
  function closeAllModals() {
    Object.keys(modals.value).forEach(name => {
      modals.value[name].open = false
    })
  }

  // 打开抽屉
  function openDrawer(name, props = {}) {
    drawers.value[name] = {
      open: true,
      props,
    }
  }

  // 关闭抽屉
  function closeDrawer(name) {
    if (drawers.value[name]) {
      drawers.value[name].open = false
    }
  }

  // 关闭所有抽屉
  function closeAllDrawers() {
    Object.keys(drawers.value).forEach(name => {
      drawers.value[name].open = false
    })
  }

  // 显示工具提示
  function showTooltip(name, text, options = {}) {
    tooltips.value[name] = {
      visible: true,
      text,
      ...options,
    }
  }

  // 隐藏工具提示
  function hideTooltip(name) {
    if (tooltips.value[name]) {
      tooltips.value[name].visible = false
    }
  }

  // 隐藏所有工具提示
  function hideAllTooltips() {
    Object.keys(tooltips.value).forEach(name => {
      tooltips.value[name].visible = false
    })
  }

  // 重置状态
  function reset() {
    sidebarOpen.value = false
    loading.value = false
    notifications.value = []
    modals.value = {}
    drawers.value = {}
    tooltips.value = {}
  }

  return {
    // 状态
    sidebarOpen,
    currentBreakpoint,
    loading,
    notifications,
    modals,
    drawers,
    tooltips,

    // 计算属性
    isMobile,
    isTablet,
    isDesktop,

    // 方法
    setBreakpoint,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setLoading,
    showNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    openModal,
    closeModal,
    closeAllModals,
    openDrawer,
    closeDrawer,
    closeAllDrawers,
    showTooltip,
    hideTooltip,
    hideAllTooltips,
    reset,
  }
})
