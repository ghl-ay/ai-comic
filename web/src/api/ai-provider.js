// web/src/api/ai-provider.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async list(type) {
    const res = await api.get('/ai-providers', { params: type ? { type } : {} })
    return res.data
  },

  async options(type) {
    const res = await api.get('/ai-providers/options', { params: { type } })
    return res.data
  },

  async create(data) {
    const res = await api.post('/ai-providers', data)
    return res.data
  },

  async update(id, data) {
    const res = await api.put(`/ai-providers/${id}`, data)
    return res.data
  },

  async remove(id) {
    const res = await api.delete(`/ai-providers/${id}`)
    return res.data
  },

  async setDefault(id) {
    const res = await api.post(`/ai-providers/${id}/set-default`)
    return res.data
  },
}
