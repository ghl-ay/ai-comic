<!-- web/src/components/base/AppNotifications.vue -->
<template>
  <div class="app-notifications">
    <transition-group name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="app-notification"
        :class="getNotificationClasses(notification)"
      >
        <div class="app-notification__icon">
          <v-icon :color="getIconColor(notification.type)">
            {{ getIcon(notification.type) }}
          </v-icon>
        </div>
        
        <div class="app-notification__content">
          <div v-if="notification.title" class="app-notification__title">
            {{ notification.title }}
          </div>
          <div class="app-notification__message">
            {{ notification.message }}
          </div>
        </div>
        
        <v-btn
          v-if="notification.closable !== false"
          icon
          variant="text"
          size="small"
          class="app-notification__close"
          @click="removeNotification(notification.id)"
        >
          <v-icon size="small">mdi-close</v-icon>
        </v-btn>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '../../stores/ui'

const uiStore = useUIStore()

// 通知列表
const notifications = computed(() => uiStore.notifications)

// 获取通知样式类
function getNotificationClasses(notification) {
  return {
    [`app-notification--${notification.type}`]: notification.type,
    'app-notification--closable': notification.closable !== false,
  }
}

// 获取图标
function getIcon(type) {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  }
  return icons[type] || icons.info
}

// 获取图标颜色
function getIconColor(type) {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }
  return colors[type] || colors.info
}

// 移除通知
function removeNotification(id) {
  uiStore.removeNotification(id)
}
</script>

<style scoped>
.app-notifications {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: var(--z-index-toast);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  width: 100%;
  pointer-events: none;
}

.app-notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 4px solid transparent;
}

.app-notification--success {
  border-left-color: var(--color-success);
}

.app-notification--error {
  border-left-color: var(--color-error);
}

.app-notification--warning {
  border-left-color: var(--color-warning);
}

.app-notification--info {
  border-left-color: var(--color-info);
}

.app-notification__icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.app-notification__content {
  flex: 1;
  min-width: 0;
}

.app-notification__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin-bottom: 4px;
}

.app-notification__message {
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
  line-height: 1.5;
}

.app-notification__close {
  flex-shrink: 0;
  margin: -4px -4px -4px 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.app-notification__close:hover {
  opacity: 1;
}

/* 过渡动画 */
.notification-enter-active {
  transition: all 0.3s ease;
}

.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .app-notifications {
    top: 8px;
    right: 8px;
    left: 8px;
    max-width: none;
  }
  
  .app-notification {
    padding: 12px;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .app-notification {
  background-color: var(--color-surface);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}
</style>
