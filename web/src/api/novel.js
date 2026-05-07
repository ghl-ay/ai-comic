// web/src/api/novel.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async createNovel(data) {
    const res = await api.post('/novels', data)
    return res.data
  },

  async getNovel(id) {
    const res = await api.get(`/novels/${id}`)
    return res.data
  },

  async deleteNovel(id) {
    const res = await api.delete(`/novels/${id}`)
    return res.data
  },

  async analyzeStyle(id) {
    const res = await api.post(`/novels/${id}/analyze-style`)
    return res.data
  },

  async extractCharacters(id) {
    const res = await api.post(`/novels/${id}/extract-characters`)
    return res.data
  },

  async generateChapters(id, data) {
    const res = await api.post(`/novels/${id}/generate-chapters`, data)
    return res.data
  },
}
