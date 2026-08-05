// web/src/api/chapter.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async createChapter(comicId, data) {
    const res = await api.post(`/comics/${comicId}/chapters`, data)
    return res.data
  },

  async getChapter(id) {
    const res = await api.get(`/chapters/${id}`)
    return res.data
  },

  async updateChapter(id, data) {
    const res = await api.put(`/chapters/${id}`, data)
    return res.data
  },

  async deleteChapter(id) {
    const res = await api.delete(`/chapters/${id}`)
    return res.data
  },

  async generateScript(id, data) {
    const res = await api.post(`/chapters/${id}/generate-script`, data)
    return res.data
  },

  async generateImage(id, data = {}) {
    const res = await api.post(`/chapters/${id}/generate-image`, data)
    return res.data
  },

  async generatePrompt(id, data) {
    const res = await api.post(`/chapters/${id}/generate-prompt`, data)
    return res.data
  },
}
