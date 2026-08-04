// web/src/api/auth.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // 携带 cookie
})

export default {
  async register(username, password) {
    const res = await api.post('/auth/register', { username, password })
    return res.data
  },

  async login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    return res.data
  },

  async logout() {
    const res = await api.post('/auth/logout')
    return res.data
  },

  async getMe() {
    const res = await api.get('/auth/me')
    return res.data
  },

  async getOidcStatus() {
    const res = await api.get('/auth/oidc/status')
    return res.data
  },

  async getOidcPending() {
    const res = await api.get('/auth/oidc/pending')
    return res.data
  },

  async oidcBind(username, password) {
    const res = await api.post('/auth/oidc/bind', { username, password })
    return res.data
  },

  async oidcRegister(username, password) {
    const res = await api.post('/auth/oidc/register', { username, password })
    return res.data
  },

  /** 整页跳转发起 OIDC（需走浏览器顶层导航以携带/写入 Cookie） */
  startOidcLogin(returnTo = '/comics') {
    const query = new URLSearchParams({ returnTo })
    window.location.href = `/api/auth/oidc/login?${query.toString()}`
  },
}
