<!-- web/src/components/navigation/AppNavigation.vue -->
<template>
  <v-app-bar
    app
    elevation="0"
    class="app-navigation"
  >
    <v-container class="d-flex align-center">
      <!-- Logo -->
      <v-app-bar-title class="d-flex align-center app-navigation__logo">
        <router-link to="/" class="d-flex align-center text-decoration-none">
          <v-avatar size="32" class="mr-2" color="primary">
            <v-icon color="white" size="20">mdi-book-open-page-variant</v-icon>
          </v-avatar>
          <span class="font-weight-bold text-h6 app-navigation__title">AI漫画</span>
        </router-link>
      </v-app-bar-title>
      
      <v-spacer />
      
      <!-- 桌面端导航 -->
      <div class="d-none d-md-flex align-center">
        <v-btn
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          variant="text"
          class="mx-1 app-navigation__nav-item"
          :class="{ 'app-navigation__nav-item--active': isActive(item.path) }"
        >
          <v-icon left size="20">{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>
      </div>
      
      <!-- 已登录：用户菜单 -->
      <template v-if="authStore.user">
        <v-menu offset-y>
          <template #activator="{ props }">
            <v-btn icon v-bind="props" class="ml-2">
              <v-avatar size="32" color="primary">
                <v-icon color="white" size="20">mdi-account</v-icon>
              </v-avatar>
            </v-btn>
          </template>
          
          <v-list class="app-navigation__user-menu">
            <v-list-item @click="toggleTheme">
              <template #prepend>
                <v-icon>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
              </template>
              <v-list-item-title>{{ isDark ? '浅色模式' : '深色模式' }}</v-list-item-title>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item @click="logout">
              <template #prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>退出登录</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <!-- 未登录：登录按钮 -->
      <template v-else>
        <v-btn
          variant="flat"
          color="primary"
          class="ml-2"
          to="/login"
        >
          登录
        </v-btn>
      </template>
      
      <!-- 移动端菜单按钮 -->
      <v-btn icon class="d-md-none ml-2" @click="drawer = true">
        <v-icon>mdi-menu</v-icon>
      </v-btn>
    </v-container>
  </v-app-bar>
  
  <!-- 移动端抽屉菜单 -->
  <v-navigation-drawer v-model="drawer" temporary location="right">
    <v-list-item class="pa-4">
      <template #prepend>
        <v-avatar size="40" color="primary">
          <v-icon color="white" size="24">mdi-account</v-icon>
        </v-avatar>
      </template>
      <v-list-item-title class="font-weight-bold">用户菜单</v-list-item-title>
    </v-list-item>
    
    <v-divider />
    
    <v-list class="pa-2">
      <v-list-item
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="app-navigation__drawer-item"
        @click="drawer = false"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
    
    <v-divider />
    
    <v-list class="pa-2">
      <v-list-item @click="toggleTheme">
        <template #prepend>
          <v-icon>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
        </template>
        <v-list-item-title>{{ isDark ? '浅色模式' : '深色模式' }}</v-list-item-title>
      </v-list-item>
      
      <v-list-item v-if="authStore.user" @click="logout">
        <template #prepend>
          <v-icon>mdi-logout</v-icon>
        </template>
        <v-list-item-title>退出登录</v-list-item-title>
      </v-list-item>
      <v-list-item v-else to="/login" @click="drawer = false">
        <template #prepend>
          <v-icon>mdi-login</v-icon>
        </template>
        <v-list-item-title>登录</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const vuetifyTheme = useTheme()

// 状态
const drawer = ref(false)

// 计算属性
const isDark = computed(() => themeStore.isDark)

// 导航项
const navItems = computed(() => {
  const items = [
    { path: '/', title: '首页', icon: 'mdi-home' },
  ]

  if (authStore.user) {
    items.push(
      { path: '/comics', title: '我的漫画', icon: 'mdi-book-open-variant' },
      { path: '/characters', title: '角色库', icon: 'mdi-account-group' },
    )
  }

  if (authStore.isAdmin) {
    items.push({ path: '/admin', title: '后台管理', icon: 'mdi-shield-account' })
  }
  
  return items
})

// 判断当前路由是否激活
function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// 切换主题
function toggleTheme() {
  themeStore.toggleTheme(vuetifyTheme)
}

// 退出登录
async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-navigation {
  position: sticky !important;
  top: 0;
  z-index: 100;
  background: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid var(--color-outline);
}

.app-navigation__logo {
  flex: none;
}

.app-navigation__title {
  color: var(--color-on-surface);
  font-family: var(--font-family-display);
}

.app-navigation__nav-item {
  transition: all 0.2s ease;
  border-radius: var(--border-radius-md);
}

.app-navigation__nav-item:hover {
  background-color: var(--color-state-hover);
}

.app-navigation__nav-item--active {
  color: var(--color-primary) !important;
  background-color: rgba(99, 102, 241, 0.12);
}

.app-navigation__user-menu {
  min-width: 200px;
}

.app-navigation__user-menu :deep(.v-divider) {
  margin: 4px 0;
  border-color: var(--color-outline-variant);
  opacity: 0.6;
}

.app-navigation__drawer-item {
  border-radius: var(--border-radius-md);
  margin-bottom: 4px;
}

.app-navigation__drawer-item:hover {
  background-color: var(--color-state-hover);
}

/* 抽屉菜单分割线样式 */
:deep(.v-navigation-drawer .v-divider) {
  margin: 8px 16px;
  border-color: var(--color-outline-variant);
  opacity: 0.6;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .app-navigation__title {
    font-size: 1.1rem;
  }
}
</style>
