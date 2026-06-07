// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, transition: 'fade' },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { public: true, transition: 'fade' },
      },
      {
        path: 'comics',
        name: 'Comics',
        component: () => import('../views/Comics.vue'),
        meta: { transition: 'slide-up' },
      },
      {
        path: 'comics/:id',
        name: 'ComicDetail',
        component: () => import('../views/ComicDetail.vue'),
        meta: { transition: 'slide-left' },
      },
      {
        path: 'novel-wizard',
        name: 'NovelWizard',
        component: () => import('../views/NovelWizard.vue'),
        meta: { transition: 'slide-up' },
      },
      {
        path: 'create/:comicId/:chapterId?',
        name: 'CreateChapter',
        component: () => import('../views/CreateChapter.vue'),
        meta: { transition: 'slide-left' },
      },
      {
        path: 'short-comic/create',
        name: 'CreateShortComic',
        component: () => import('../views/CreateShortComic.vue'),
        meta: { transition: 'slide-up' },
      },
      {
        path: 'short-comic/:id/edit',
        name: 'EditShortComic',
        component: () => import('../views/CreateShortComic.vue'),
        meta: { transition: 'slide-left' },
      },
      {
        path: 'characters',
        name: 'Characters',
        component: () => import('../views/Characters.vue'),
        meta: { transition: 'slide-up' },
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('../views/Admin.vue'),
        meta: { requiresAdmin: true, transition: 'slide-up' },
        children: [
          {
            path: '',
            redirect: '/admin/ai-config',
          },
          {
            path: 'ai-config',
            name: 'AdminAiConfig',
            component: () => import('../views/admin/AiConfig.vue'),
          },
          {
            path: 'users',
            name: 'AdminUsers',
            component: () => import('../views/admin/Users.vue'),
          },
          {
            path: 'style-presets',
            name: 'AdminStylePresets',
            component: () => import('../views/admin/StylePresets.vue'),
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果还没检查过登录状态，先检查
  if (!authStore.checked) {
    await authStore.checkAuth()
  }

  // 非公开页面需要登录
  if (!to.meta.public && !authStore.user) {
    return next('/login')
  }

  // 已登录用户不能访问登录页
  if (to.meta.public && authStore.user && to.path === '/login') {
    return next('/')
  }

  // 管理员页面需要管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/comics')
  }

  next()
})

export default router
