<!-- web/src/components/base/AppSkeleton.vue -->
<template>
  <div class="app-skeleton" :class="skeletonClasses">
    <!-- 文本骨架屏 -->
    <template v-if="type === 'text'">
      <div
        v-for="i in lines"
        :key="i"
        class="app-skeleton__line"
        :style="getLineStyle(i)"
      />
    </template>
    
    <!-- 标题骨架屏 -->
    <template v-else-if="type === 'heading'">
      <div class="app-skeleton__heading" :style="headingStyle" />
    </template>
    
    <!-- 头像骨架屏 -->
    <template v-else-if="type === 'avatar'">
      <div class="app-skeleton__avatar" :style="avatarStyle" />
    </template>
    
    <!-- 卡片骨架屏 -->
    <template v-else-if="type === 'card'">
      <div class="app-skeleton__card">
        <div class="app-skeleton__card-image" />
        <div class="app-skeleton__card-content">
          <div class="app-skeleton__card-title" />
          <div class="app-skeleton__card-text" />
          <div class="app-skeleton__card-text app-skeleton__card-text--short" />
        </div>
      </div>
    </template>
    
    <!-- 图片骨架屏 -->
    <template v-else-if="type === 'image'">
      <div class="app-skeleton__image" :style="imageStyle" />
    </template>
    
    <!-- 按钮骨架屏 -->
    <template v-else-if="type === 'button'">
      <div class="app-skeleton__button" :style="buttonStyle" />
    </template>
    
    <!-- 自定义骨架屏 -->
    <template v-else-if="type === 'custom'">
      <div class="app-skeleton__custom" :style="customStyle" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 骨架屏类型
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'heading', 'avatar', 'card', 'image', 'button', 'custom'].includes(value)
  },
  
  // 行数（文本类型）
  lines: {
    type: Number,
    default: 3
  },
  
  // 宽度
  width: {
    type: [String, Number],
    default: '100%'
  },
  
  // 高度
  height: {
    type: [String, Number],
    default: undefined
  },
  
  // 圆角
  rounded: {
    type: [String, Number, Boolean],
    default: 'md'
  },
  
  // 动画
  animation: {
    type: String,
    default: 'pulse',
    validator: (value) => ['pulse', 'wave', 'none'].includes(value)
  }
})

// 计算骨架屏样式类
const skeletonClasses = computed(() => ({
  [`app-skeleton--${props.type}`]: props.type,
  [`app-skeleton--${props.animation}`]: props.animation,
  'app-skeleton--rounded': props.rounded === true,
  [`app-skeleton--rounded-${props.rounded}`]: typeof props.rounded === 'string',
}))

// 获取文本行样式
function getLineStyle(index) {
  const widths = [100, 85, 70, 90, 75, 80, 95, 65]
  const width = widths[(index - 1) % widths.length]
  
  return {
    width: `${width}%`,
    height: props.height || '12px',
    marginBottom: index < props.lines ? '12px' : '0',
  }
}

// 标题样式
const headingStyle = computed(() => ({
  width: props.width,
  height: props.height || '24px',
}))

// 头像样式
const avatarStyle = computed(() => ({
  width: props.width || '48px',
  height: props.height || '48px',
}))

// 图片样式
const imageStyle = computed(() => ({
  width: props.width,
  height: props.height || '200px',
}))

// 按钮样式
const buttonStyle = computed(() => ({
  width: props.width || '120px',
  height: props.height || '40px',
}))

// 自定义样式
const customStyle = computed(() => ({
  width: props.width,
  height: props.height || '100px',
}))
</script>

<style scoped>
.app-skeleton {
  display: flex;
  flex-direction: column;
}

.app-skeleton__line,
.app-skeleton__heading,
.app-skeleton__avatar,
.app-skeleton__image,
.app-skeleton__button,
.app-skeleton__custom {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: var(--border-radius-md);
}

.app-skeleton--rounded .app-skeleton__line,
.app-skeleton--rounded .app-skeleton__heading,
.app-skeleton--rounded .app-skeleton__avatar,
.app-skeleton--rounded .app-skeleton__image,
.app-skeleton--rounded .app-skeleton__button,
.app-skeleton--rounded .app-skeleton__custom {
  border-radius: var(--border-radius-full);
}

.app-skeleton--rounded-sm .app-skeleton__line,
.app-skeleton--rounded-sm .app-skeleton__heading,
.app-skeleton--rounded-sm .app-skeleton__avatar,
.app-skeleton--rounded-sm .app-skeleton__image,
.app-skeleton--rounded-sm .app-skeleton__button,
.app-skeleton--rounded-sm .app-skeleton__custom {
  border-radius: var(--border-radius-sm);
}

.app-skeleton--rounded-lg .app-skeleton__line,
.app-skeleton--rounded-lg .app-skeleton__heading,
.app-skeleton--rounded-lg .app-skeleton__avatar,
.app-skeleton--rounded-lg .app-skeleton__image,
.app-skeleton--rounded-lg .app-skeleton__button,
.app-skeleton--rounded-lg .app-skeleton__custom {
  border-radius: var(--border-radius-lg);
}

.app-skeleton--rounded-xl .app-skeleton__line,
.app-skeleton--rounded-xl .app-skeleton__heading,
.app-skeleton--rounded-xl .app-skeleton__avatar,
.app-skeleton--rounded-xl .app-skeleton__image,
.app-skeleton--rounded-xl .app-skeleton__button,
.app-skeleton--rounded-xl .app-skeleton__custom {
  border-radius: var(--border-radius-xl);
}

.app-skeleton__avatar {
  border-radius: 50%;
}

/* 动画效果 */
.app-skeleton--pulse .app-skeleton__line,
.app-skeleton--pulse .app-skeleton__heading,
.app-skeleton--pulse .app-skeleton__avatar,
.app-skeleton--pulse .app-skeleton__image,
.app-skeleton--pulse .app-skeleton__button,
.app-skeleton--pulse .app-skeleton__custom {
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.app-skeleton--wave .app-skeleton__line,
.app-skeleton--wave .app-skeleton__heading,
.app-skeleton--wave .app-skeleton__avatar,
.app-skeleton--wave .app-skeleton__image,
.app-skeleton--wave .app-skeleton__button,
.app-skeleton--wave .app-skeleton__custom {
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

@keyframes skeleton-wave {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.app-skeleton--none .app-skeleton__line,
.app-skeleton--none .app-skeleton__heading,
.app-skeleton--none .app-skeleton__avatar,
.app-skeleton--none .app-skeleton__image,
.app-skeleton--none .app-skeleton__button,
.app-skeleton--none .app-skeleton__custom {
  animation: none;
}

/* 卡片骨架屏 */
.app-skeleton__card {
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-outline);
}

.app-skeleton__card-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

.app-skeleton__card-content {
  padding: 20px;
}

.app-skeleton__card-title {
  width: 60%;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
  border-radius: var(--border-radius-sm);
  margin-bottom: 12px;
}

.app-skeleton__card-text {
  width: 100%;
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
  border-radius: var(--border-radius-sm);
  margin-bottom: 8px;
}

.app-skeleton__card-text--short {
  width: 75%;
}

/* 深色主题调整 */
[data-theme="dark"] .app-skeleton__line,
[data-theme="dark"] .app-skeleton__heading,
[data-theme="dark"] .app-skeleton__avatar,
[data-theme="dark"] .app-skeleton__image,
[data-theme="dark"] .app-skeleton__button,
[data-theme="dark"] .app-skeleton__custom,
[data-theme="dark"] .app-skeleton__card-image,
[data-theme="dark"] .app-skeleton__card-title,
[data-theme="dark"] .app-skeleton__card-text {
  background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%);
  background-size: 200px 100%;
}

[data-theme="dark"] .app-skeleton__card {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}
</style>
