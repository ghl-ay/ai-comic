<!-- web/src/components/base/AppCard.vue -->
<template>
  <v-card
    class="app-card"
    :class="cardClasses"
    :elevation="elevation"
    :hover="hover"
    :variant="variant"
    :color="color"
    :rounded="rounded"
    @click="$emit('click', $event)"
  >
    <slot />
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 卡片变体
  variant: {
    type: String,
    default: 'elevated',
    validator: (value) => ['elevated', 'flat', 'tonal', 'outlined', 'text', 'plain'].includes(value)
  },
  
  // 阴影等级
  elevation: {
    type: Number,
    default: 2,
    validator: (value) => value >= 0 && value <= 24
  },
  
  // 悬停效果
  hover: {
    type: Boolean,
    default: true
  },
  
  // 圆角大小
  rounded: {
    type: [String, Number, Boolean],
    default: 'lg'
  },
  
  // 颜色
  color: {
    type: String,
    default: undefined
  },
  
  // 可点击
  clickable: {
    type: Boolean,
    default: false
  },
  
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  
  // 禁用状态
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

// 计算卡片样式类
const cardClasses = computed(() => ({
  'app-card--hover': props.hover,
  'app-card--clickable': props.clickable,
  'app-card--loading': props.loading,
  'app-card--disabled': props.disabled,
  [`app-card--${props.variant}`]: props.variant,
}))
</script>

<style scoped>
.app-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

/* 悬停效果 */
.app-card--hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* 可点击状态 */
.app-card--clickable {
  cursor: pointer;
  user-select: none;
}

.app-card--clickable:active {
  transform: scale(0.98);
}

/* 加载状态 */
.app-card--loading {
  pointer-events: none;
  opacity: 0.7;
}

.app-card--loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: card-loading 1.5s infinite;
}

@keyframes card-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 禁用状态 */
.app-card--disabled {
  pointer-events: none;
  opacity: 0.5;
  filter: grayscale(0.5);
}

/* 变体样式 */
.app-card--elevated {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.app-card--flat {
  box-shadow: none;
}

.app-card--tonal {
  box-shadow: none;
}

.app-card--outlined {
  box-shadow: none;
  border: 1px solid var(--color-outline);
}

.app-card--text {
  box-shadow: none;
  background: transparent;
}

.app-card--plain {
  box-shadow: none;
  background: transparent;
}

/* 深色主题调整 */
[data-theme="dark"] .app-card--hover:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .app-card--elevated {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .app-card--loading::after {
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
}
</style>
