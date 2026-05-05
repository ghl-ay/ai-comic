// web/src/api/storage-config.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async getConfig() {
    const res = await api.get('/storage-config')
    return res.data
  },

  async saveConfig(data) {
    const res = await api.put('/storage-config', data)
    return res.data
  },
}
