// web/src/api/ai-assist.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default {
  async fillForm(schema, context, providerId = null) {
    const body = { schema, context }
    if (providerId != null) body.providerId = providerId
    const res = await api.post('/ai-assist/fill-form', body)
    return res.data
  },
}
