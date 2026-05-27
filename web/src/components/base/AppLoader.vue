<!-- web/src/components/base/AppLoader.vue -->
<template>
  <div class="app-loader" :class="loaderClasses">
    <!-- 骨架屏模式 -->
    <template v-if="type === 'skeleton'">
      <div v-for="i in lines" :key="i" class="app-loader__skeleton" :style="getSkeletonStyle(i)" />
    </template>
    
    <!-- 旋转加载模式 -->
    <template v-else-if="type === 'spinner'">
      <v-progress-circular
        :size="size"
        :width="width"
        :color="color"
        indeterminate
      />
      <span v-if="text" class="app-loader__text">{{ text }}</span>
    </template>
    
    <!-- 进度条模式 -->
    <template v-else-if="type === 'progress'">
      <v-progress-linear
        :model-value="value"
        :color="color"
        :height="height"
        :rounded="rounded"
        :indeterminate="indeterminate"
      />
      <span v-if="text" class="app-loader__text">{{ text }}</span>
    </template>
    
    <!-- 点状加载模式 -->
    <template v-else-if="type === 'dots'">
      <div class="app-loader__dots">
        <span v-for="i in 3" :key="i" class="app-loader__dot" :style="{ animationDelay: `${(i - 1) * 0.2}s` }" />
      </div>
      <span v-if="text" class="app-loader__text">{{ text }}</span>
    </template>
    
    <!-- 脉冲模式 -->
    <template v-else-if="type === 'pulse'">
      <div class="app-loader__pulse" :style="{ width: `${size}px`, height: `${size}px` }" />
      <span v-if="text" class="app-loader__text">{{ text }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 加载类型
  type: {
    type: String,
    default: 'spinner',
    validator: (value) => ['skeleton', 'spinner', 'progress', 'dots', 'pulse'].includes(value)
  },
  
  // 大小
  size: {
    type: Number,
    default: 40
  },
  
  // 线条宽度（旋转模式）
  width: {
    type: Number,
    default: 4
  },
  
  // 高度（进度条模式）
  height: {
    type: Number,
    default: 4
  },
  
  // 颜色
  color: {
    type: String,
    default: 'primary'
  },
  
  // 文本
  text: {
    type: String,
    default: ''
  },
  
  // 骨架屏行数
  lines: {
    type: Number,
    default: 3
  },
  
  // 进度值
  value: {
    type: Number,
    default: 0
  },
  
  // 圆角
  rounded: {
    type: Boolean,
    default: true
  },
  
  // 不确定状态
  indeterminate: {
    type: Boolean,
    default: false
  },
  
  // 全屏模式
  fullscreen: {
    type: Boolean,
    default: false
  },
  
  // 内联模式
  inline: {
    type: Boolean,
    default: false
  }
})

// 计算加载器样式类
const loaderClasses = computed(() => ({
  'app-loader--fullscreen': props.fullscreen,
  'app-loader--inline': props.inline,
  [`app-loader--${props.type}`]: props.type,
}))

// 获取骨架屏样式
function getSkeletonStyle(index) {
  const widths = [100, 85, 70, 90, 75, 80, 95, 65]
  const width = widths[(index - 1) % widths.length]
  
  return {
    width: `${width}%`,
    height: '12px',
    marginBottom: index < props.lines ? '12px' : '0',
  }
}
</script>

<style scoped>
.app-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.app-loader--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: var(--z-index-modal);
}

.app-loader--inline {
  padding: 8px;
}

.app-loader__text {
  margin-top: 12px;
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
}

/* 骨架屏样式 */
.app-loader__skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--border-radius-md);
}

@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

/* 点状加载样式 */
.app-loader__dots {
  display: flex;
  gap: 8px;
}

.app-loader__dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: dots-bounce 1.4s ease-in-out infinite both;
}

@keyframes dots-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 脉冲样式 */
.app-loader__pulse {
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: pulse-scale 1.2s ease-in-out infinite;
}

@keyframes pulse-scale {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  50% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .app-loader--fullscreen {
  background-color: rgba(15, 23, 42, 0.9);
}

[data-theme="dark"] .app-loader__skeleton {
  background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%);
  background-size: 200px 100%;
}
</style>
