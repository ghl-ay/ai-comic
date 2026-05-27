<!-- web/src/components/base/AppButton.vue -->
<template>
  <v-btn
    class="app-button"
    :class="buttonClasses"
    :color="color"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :block="block"
    :rounded="rounded"
    :icon="icon"
    @click="$emit('click', $event)"
  >
    <slot />
  </v-btn>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 按钮颜色
  color: {
    type: String,
    default: 'primary'
  },
  
  // 按钮变体
  variant: {
    type: String,
    default: 'elevated',
    validator: (value) => ['elevated', 'flat', 'tonal', 'outlined', 'text', 'plain'].includes(value)
  },
  
  // 按钮大小
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['x-small', 'small', 'default', 'large', 'x-large'].includes(value)
  },
  
  // 禁用状态
  disabled: {
    type: Boolean,
    default: false
  },
  
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  
  // 块级按钮
  block: {
    type: Boolean,
    default: false
  },
  
  // 圆角
  rounded: {
    type: [String, Number, Boolean],
    default: 'md'
  },
  
  // 图标按钮
  icon: {
    type: Boolean,
    default: false
  },
  
  // 按钮类型
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  }
})

defineEmits(['click'])

// 计算按钮样式类
const buttonClasses = computed(() => ({
  'app-button--block': props.block,
  'app-button--icon': props.icon,
  [`app-button--${props.size}`]: props.size,
  [`app-button--${props.variant}`]: props.variant,
}))
</script>

<style scoped>
.app-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.025em;
}

/* 悬停效果 */
.app-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* 点击效果 */
.app-button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 块级按钮 */
.app-button--block {
  width: 100%;
}

/* 图标按钮 */
.app-button--icon {
  border-radius: 50%;
}

/* 大小变体 */
.app-button--x-small {
  font-size: 0.75rem;
  padding: 0 8px;
  height: 28px;
}

.app-button--small {
  font-size: 0.8125rem;
  padding: 0 12px;
  height: 32px;
}

.app-button--default {
  font-size: 0.875rem;
  padding: 0 16px;
  height: 40px;
}

.app-button--large {
  font-size: 1rem;
  padding: 0 24px;
  height: 48px;
}

.app-button--x-large {
  font-size: 1.125rem;
  padding: 0 32px;
  height: 56px;
}

/* 变体样式 */
.app-button--elevated {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.app-button--elevated:hover:not(:disabled) {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.app-button--flat {
  box-shadow: none;
}

.app-button--tonal {
  box-shadow: none;
}

.app-button--outlined {
  box-shadow: none;
  border: 1px solid currentColor;
}

.app-button--text {
  box-shadow: none;
}

.app-button--plain {
  box-shadow: none;
}

/* 禁用状态 */
.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.app-button--loading {
  pointer-events: none;
}

/* 深色主题调整 */
[data-theme="dark"] .app-button--elevated {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .app-button--elevated:hover:not(:disabled) {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}
</style>
