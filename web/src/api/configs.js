// web/src/api/configs.js
import api from './client'

export default {
  async get(category, key) {
    const res = await api.get(`/configs/${category}/${key}`)
    return res.data
  },

  async set(category, key, value) {
    const res = await api.put(`/configs/${category}/${key}`, value)
    return res.data
  },
}
