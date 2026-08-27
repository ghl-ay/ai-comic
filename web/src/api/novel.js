// web/src/api/novel.js
import api from './client'

export default {
  async createNovel(data) {
    const res = await api.post('/novels', data)
    return res.data
  },

  async getNovel(id) {
    const res = await api.get(`/novels/${id}`)
    return res.data
  },

  async getNovelByComicId(comicId) {
    const res = await api.get(`/novels/by-comic/${comicId}`)
    return res.data
  },

  async deleteNovel(id) {
    const res = await api.delete(`/novels/${id}`)
    return res.data
  },

  async analyzeStyle(id, data = {}) {
    const res = await api.post(`/novels/${id}/analyze-style`, data)
    return res.data
  },

  async extractCharacters(id, data = {}) {
    const res = await api.post(`/novels/${id}/extract-characters`, data)
    return res.data
  },

  async generateChapters(id, data) {
    const res = await api.post(`/novels/${id}/generate-chapters`, data)
    return res.data
  },
}
