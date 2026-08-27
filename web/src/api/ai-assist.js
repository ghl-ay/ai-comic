// web/src/api/ai-assist.js
import api from './client'

export default {
  async fillForm(schema, context, providerId = null) {
    const body = { schema, context }
    if (providerId != null) body.providerId = providerId
    const res = await api.post('/ai-assist/fill-form', body)
    return res.data
  },
}
