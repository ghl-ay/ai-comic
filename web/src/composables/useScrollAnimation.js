// web/src/composables/useScrollAnimation.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useScrollAnimation(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
  } = options

  const elements = ref([])
  const observer = ref(null)

  // 添加元素到观察列表
  function observe(element) {
    if (element && observer.value) {
      elements.value.push(element)
      observer.value.observe(element)
    }
  }

  // 移除元素观察
  function unobserve(element) {
    if (element && observer.value) {
      observer.value.unobserve(element)
      elements.value = elements.value.filter(el => el !== element)
    }
  }

  // 初始化观察器
  function initObserver() {
    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            
            // 如果只触发一次，则停止观察
            if (once) {
              observer.value.unobserve(entry.target)
            }
          } else if (!once) {
            entry.target.classList.remove('visible')
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )
  }

  // 清理观察器
  function cleanup() {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }
    elements.value = []
  }

  onMounted(() => {
    initObserver()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    observe,
    unobserve,
    cleanup,
  }
}

// 自动添加滚动动画的指令
export const vScrollAnimate = {
  mounted(el, binding) {
    const animation = binding.value || 'fade-in-up'
    const delay = el.dataset.delay || '0'
    
    el.classList.add(animation)
    el.style.transitionDelay = `${delay}ms`
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )
    
    observer.observe(el)
    
    // 保存观察器引用以便清理
    el._scrollObserver = observer
  },
  
  unmounted(el) {
    if (el._scrollObserver) {
      el._scrollObserver.disconnect()
      delete el._scrollObserver
    }
  }
}

export default useScrollAnimation
