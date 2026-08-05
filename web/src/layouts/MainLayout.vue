<!-- web/src/layouts/MainLayout.vue -->
<template>
  <v-app class="main-layout">
    <!-- 顶部导航栏 -->
    <app-navigation />
    
    <!-- 主内容区域 -->
    <v-main class="main-layout__content">
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </v-main>
    
    <!-- 页脚 -->
    <app-footer />
    
    <!-- 全局通知 -->
    <app-notifications />
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '../components/navigation/AppNavigation.vue'
import AppFooter from '../components/navigation/AppFooter.vue'
import AppNotifications from '../components/base/AppNotifications.vue'

const route = useRoute()

// 根据路由动态选择过渡动画
const transitionName = computed(() => {
  return route.meta.transition || 'fade'
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.main-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 0 !important;
  width: 100%;
}

/* 确保 router-view 占满空间；宽度由全局 --layout-content-max 约束 v-container */
.main-layout__content > :deep(.v-container) {
  flex: 1;
  width: 100%;
}

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
