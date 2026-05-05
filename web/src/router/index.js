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
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAdmin: true },
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
        path: 'storage',
        name: 'AdminStorage',
        component: () => import('../views/admin/Storage.vue'),
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
    return next('/comics')
  }

  // 管理员页面需要管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/comics')
  }

  next()
})

export default router
