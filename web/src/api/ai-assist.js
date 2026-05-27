// web/src/api/ai-assist.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async fillForm(schema, context) {
    const res = await api.post('/ai-assist/fill-form', { schema, context })
    return res.data
  },
}
