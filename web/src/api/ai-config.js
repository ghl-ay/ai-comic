// web/src/api/ai-config.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getConfigs() {
    const res = await api.get('/ai-config')
    return res.data
  },

  async saveTextConfig(data) {
    const res = await api.put('/ai-config/text', data)
    return res.data
  },

  async saveImageConfig(data) {
    const res = await api.put('/ai-config/image', data)
    return res.data
  },
}
