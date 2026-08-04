// web/src/api/admin.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getUsers() {
    const res = await api.get('/admin/users')
    return res.data
  },

  async setUserAdmin(userId, isAdmin) {
    const res = await api.put(`/admin/users/${userId}/admin`, { is_admin: isAdmin })
    return res.data
  },

  async unbindUserOidc(userId) {
    const res = await api.post(`/admin/users/${userId}/oidc/unbind`)
    return res.data
  },

  async testOidc(draft = {}) {
    const res = await api.post('/admin/oidc/test', draft)
    return res.data
  },
}
