// web/src/api/character.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

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

  async generateReference(id) {
    const res = await api.post(`/characters/${id}/generate-reference`)
    return res.data
  },
}
