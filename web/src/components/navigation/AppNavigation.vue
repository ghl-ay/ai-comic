<!-- web/src/components/navigation/AppNavigation.vue -->
<template>
  <v-app-bar
    app
    :elevation="scrolled ? 4 : 0"
    :color="scrolled ? 'surface' : 'transparent'"
    class="app-navigation"
    :class="{ 'app-navigation--scrolled': scrolled }"
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
      
      <!-- 用户菜单 -->
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
      
      <v-list-item @click="logout">
        <template #prepend>
          <v-icon>mdi-logout</v-icon>
        </template>
        <v-list-item-title>退出登录</v-list-item-title>
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
const scrolled = ref(false)

// 计算属性
const isDark = computed(() => themeStore.isDark)

// 导航项
const navItems = computed(() => {
  const items = [
    { path: '/comics', title: '我的漫画', icon: 'mdi-book-open-variant' },
    { path: '/characters', title: '角色库', icon: 'mdi-account-group' },
  ]
  
  if (authStore.isAdmin) {
    items.push({ path: '/admin', title: '后台管理', icon: 'mdi-shield-account' })
  }
  
  return items
})

// 判断当前路由是否激活
function isActive(path) {
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

// 滚动监听
function handleScroll() {
  scrolled.value = window.scrollY > 10
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.app-navigation {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.app-navigation--scrolled {
  background-color: rgba(var(--v-theme-surface), 0.95) !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
  background-color: var(--color-primary-container);
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

/* 深色主题调整 */
[data-theme="dark"] .app-navigation--scrolled {
  background-color: rgba(30, 41, 59, 0.95) !important;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .app-navigation__title {
    font-size: 1.1rem;
  }
}
</style>
