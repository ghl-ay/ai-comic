// web/src/stores/auth.js
import { defineStore } from 'pinia'
import authApi from '../api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    checked: false,
    loading: false,
    error: null,
  }),

  getters: {
    isAdmin: (state) => state.user?.is_admin === true,
  },

  actions: {
    async register(username, password) {
      this.loading = true
      this.error = null
      try {
        const res = await authApi.register(username, password)
        this.user = res.user
        return true
      } catch (err) {
        this.error = err.response?.data?.error || '注册失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async login(username, password) {
      this.loading = true
      this.error = null
      try {
        const res = await authApi.login(username, password)
        this.user = res.user
        return true
      } catch (err) {
        this.error = err.response?.data?.error || '登录失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await authApi.logout()
      } catch (e) {
        // ignore
      }
      this.user = null
    },

    async checkAuth() {
      try {
        const res = await authApi.getMe()
        this.user = res.user
      } catch (e) {
        this.user = null
      } finally {
        this.checked = true
      }
    },
  },
})
