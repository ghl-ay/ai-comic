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
}
