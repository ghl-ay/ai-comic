// web/src/composables/useResponsive.js
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 断点定义
const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
}

export function useResponsive() {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

  // 计算当前断点
  const currentBreakpoint = computed(() => {
    const width = windowWidth.value
    if (width < BREAKPOINTS.sm) return 'xs'
    if (width < BREAKPOINTS.md) return 'sm'
    if (width < BREAKPOINTS.lg) return 'md'
    if (width < BREAKPOINTS.xl) return 'lg'
    return 'xl'
  })

  // 设备类型判断
  const isMobile = computed(() => ['xs', 'sm'].includes(currentBreakpoint.value))
  const isTablet = computed(() => currentBreakpoint.value === 'md')
  const isDesktop = computed(() => ['lg', 'xl'].includes(currentBreakpoint.value))
  const isLargeScreen = computed(() => currentBreakpoint.value === 'xl')

  // 具体断点判断
  const isXs = computed(() => currentBreakpoint.value === 'xs')
  const isSm = computed(() => currentBreakpoint.value === 'sm')
  const isMd = computed(() => currentBreakpoint.value === 'md')
  const isLg = computed(() => currentBreakpoint.value === 'lg')
  const isXl = computed(() => currentBreakpoint.value === 'xl')

  // 最小宽度判断
  const smAndUp = computed(() => windowWidth.value >= BREAKPOINTS.sm)
  const mdAndUp = computed(() => windowWidth.value >= BREAKPOINTS.md)
  const lgAndUp = computed(() => windowWidth.value >= BREAKPOINTS.lg)
  const xlAndUp = computed(() => windowWidth.value >= BREAKPOINTS.xl)

  // 最大宽度判断
  const smAndDown = computed(() => windowWidth.value < BREAKPOINTS.md)
  const mdAndDown = computed(() => windowWidth.value < BREAKPOINTS.lg)
  const lgAndDown = computed(() => windowWidth.value < BREAKPOINTS.xl)

  // 更新窗口尺寸
  function updateWindowSize() {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // 防抖处理
  let resizeTimer = null
  function handleResize() {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = setTimeout(() => {
      updateWindowSize()
    }, 100)
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('resize', handleResize, { passive: true })
    updateWindowSize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
  })

  return {
    // 窗口尺寸
    windowWidth,
    windowHeight,
    
    // 当前断点
    currentBreakpoint,
    
    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    
    // 具体断点
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    
    // 最小宽度
    smAndUp,
    mdAndUp,
    lgAndUp,
    xlAndUp,
    
    // 最大宽度
    smAndDown,
    mdAndDown,
    lgAndDown,
    
    // 断点常量
    BREAKPOINTS,
  }
}

// 全局响应式状态（单例模式）
let globalResponsive = null

export function useGlobalResponsive() {
  if (!globalResponsive) {
    globalResponsive = useResponsive()
  }
  return globalResponsive
}

export default useResponsive
