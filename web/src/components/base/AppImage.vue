<!-- web/src/components/base/AppImage.vue -->
<template>
  <div
    class="app-image"
    :class="imageClasses"
  >
    <v-img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :aspect-ratio="aspectRatio"
      :cover="cover"
      :contain="contain"
      :lazy-src="lazySrc"
      class="app-image__img"
      @load="onLoad"
      @error="onError"
    >
      <template #placeholder>
        <div
          class="app-image__placeholder"
          :style="placeholderStyle"
        >
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="primary"
            :size="24"
          />
          <v-icon
            v-else
            size="32"
            color="grey-lighten-1"
          >
            mdi-image
          </v-icon>
        </div>
      </template>
      
      <template #error>
        <div
          class="app-image__error"
          :style="placeholderStyle"
        >
          <v-icon
            size="32"
            color="grey-lighten-1"
          >
            mdi-image-broken
          </v-icon>
          <span
            v-if="showErrorText"
            class="app-image__error-text"
          >图片加载失败</span>
        </div>
      </template>
    </v-img>
    
    <!-- 加载状态遮罩 -->
    <div
      v-if="loading && showLoadingOverlay"
      class="app-image__loading-overlay"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 图片源
  src: {
    type: String,
    default: ''
  },
  
  // 替代文本
  alt: {
    type: String,
    default: ''
  },
  
  // 宽度
  width: {
    type: [String, Number],
    default: undefined
  },
  
  // 高度
  height: {
    type: [String, Number],
    default: undefined
  },
  
  // 宽高比
  aspectRatio: {
    type: [String, Number],
    default: undefined
  },
  
  // 覆盖模式
  cover: {
    type: Boolean,
    default: false
  },
  
  // 包含模式
  contain: {
    type: Boolean,
    default: false
  },
  
  // 懒加载源
  lazySrc: {
    type: String,
    default: undefined
  },
  
  // 圆角
  rounded: {
    type: [String, Number, Boolean],
    default: false
  },
  
  // 显示加载遮罩
  showLoadingOverlay: {
    type: Boolean,
    default: false
  },
  
  // 显示错误文本
  showErrorText: {
    type: Boolean,
    default: true
  },
  
  // 加载状态
  loading: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['load', 'error'])

// 计算图片样式类
const imageClasses = computed(() => ({
  'app-image--rounded': props.rounded,
  [`app-image--rounded-${props.rounded}`]: typeof props.rounded === 'string',
}))

// 占位符样式
const placeholderStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backgroundColor: 'var(--color-surface-variant)',
}))

// 加载完成
function onLoad() {
  emit('load')
}

// 加载错误
function onError() {
  emit('error')
}
</script>

<style scoped>
.app-image {
  position: relative;
  overflow: hidden;
}

.app-image--rounded {
  border-radius: var(--border-radius-md);
}

.app-image--rounded-sm {
  border-radius: var(--border-radius-sm);
}

.app-image--rounded-lg {
  border-radius: var(--border-radius-lg);
}

.app-image--rounded-xl {
  border-radius: var(--border-radius-xl);
}

.app-image--rounded-full {
  border-radius: var(--border-radius-full);
}

.app-image__img {
  transition: opacity 0.3s ease;
}

.app-image__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--color-surface-variant);
}

.app-image__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--color-surface-variant);
}

.app-image__error-text {
  font-size: 0.75rem;
  color: var(--color-on-surface-variant);
}

.app-image__loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1;
}

/* 深色主题调整 */
[data-theme="dark"] .app-image__loading-overlay {
  background-color: rgba(15, 23, 42, 0.8);
}
</style>
