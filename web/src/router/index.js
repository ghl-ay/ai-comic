// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/comics',
  },
  {
    path: '/comics',
    name: 'Comics',
    component: () => import('../views/Comics.vue'),
  },
  {
    path: '/comics/:id',
    name: 'ComicDetail',
    component: () => import('../views/ComicDetail.vue'),
  },
  {
    path: '/create/:comicId/:chapterId?',
    name: 'CreateChapter',
    component: () => import('../views/CreateChapter.vue'),
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('../views/Characters.vue'),
  },
  {
    path: '/settings/ai',
    name: 'AiConfig',
    component: () => import('../views/AiConfig.vue'),
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
    return next('/comics')
  }

  next()
})

export default router
