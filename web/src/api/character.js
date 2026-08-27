// web/src/api/character.js
import api from './client'

export default {
  async getCharacters() {
    const res = await api.get('/characters')
    return res.data
  },

  async getCharacter(id) {
    const res = await api.get(`/characters/${id}`)
    return res.data
  },

  async createCharacter(data) {
    const res = await api.post('/characters', data)
    return res.data
  },

  async updateCharacter(id, data) {
    const res = await api.put(`/characters/${id}`, data)
    return res.data
  },

  async deleteCharacter(id) {
    const res = await api.delete(`/characters/${id}`)
    return res.data
  },

  async generateReference(id, data = {}) {
    const res = await api.post(`/characters/${id}/generate-reference`, data)
    return res.data
  },
}
