<!-- web/src/components/business/EmptyState.vue -->
<template>
  <div class="empty-state" :class="emptyStateClasses">
    <div class="empty-state__icon" :style="iconStyle">
      <v-icon :size="iconSize" :color="iconColor">{{ icon }}</v-icon>
    </div>
    
    <h3 class="empty-state__title">{{ title }}</h3>
    
    <p v-if="description" class="empty-state__description">
      {{ description }}
    </p>
    
    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
    
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 图标
  icon: {
    type: String,
    default: 'mdi-book-open-variant'
  },
  
  // 图标大小
  iconSize: {
    type: Number,
    default: 80
  },
  
  // 图标颜色
  iconColor: {
    type: String,
    default: 'grey-lighten-1'
  },
  
  // 标题
  title: {
    type: String,
    default: '暂无数据'
  },
  
  // 描述
  description: {
    type: String,
    default: ''
  },
  
  // 大小
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value)
  },
  
  // 垂直内边距
  padding: {
    type: [String, Number],
    default: '80px'
  }
})

// 计算空状态样式类
const emptyStateClasses = computed(() => ({
  [`empty-state--${props.size}`]: props.size,
}))

// 图标样式
const iconStyle = computed(() => ({
  marginBottom: '24px',
}))

// 图标大小
const iconSize = computed(() => {
  const sizes = {
    small: 48,
    default: 80,
    large: 120,
  }
  return sizes[props.size] || props.iconSize
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: v-bind(padding);
}

.empty-state--small {
  padding: 40px 20px;
}

.empty-state--default {
  padding: 80px 20px;
}

.empty-state--large {
  padding: 120px 20px;
}

.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-surface-variant);
  margin-bottom: 24px;
}

.empty-state--small .empty-state__icon {
  width: 80px;
  height: 80px;
}

.empty-state--large .empty-state__icon {
  width: 160px;
  height: 160px;
}

.empty-state__title {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin-bottom: 12px;
}

.empty-state--small .empty-state__title {
  font-size: 1.25rem;
}

.empty-state--large .empty-state__title {
  font-size: 1.75rem;
}

.empty-state__description {
  font-size: 1rem;
  color: var(--color-on-surface-variant);
  max-width: 400px;
  line-height: 1.6;
  margin-bottom: 32px;
}

.empty-state__actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .empty-state {
    padding: 40px 16px;
  }
  
  .empty-state__icon {
    width: 80px;
    height: 80px;
  }
  
  .empty-state__title {
    font-size: 1.25rem;
  }
  
  .empty-state__description {
    font-size: 0.875rem;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .empty-state__icon {
  background: var(--color-surface-variant);
}
</style>
