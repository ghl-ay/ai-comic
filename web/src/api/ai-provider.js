// web/src/api/ai-provider.js
import api from './client'

export default {
  async list(type) {
    const res = await api.get('/ai-providers', { params: type ? { type } : {} })
    return res.data
  },

  async options(type) {
    const res = await api.get('/ai-providers/options', { params: { type } })
    return res.data
  },

  async create(data) {
    const res = await api.post('/ai-providers', data)
    return res.data
  },

  async update(id, data) {
    const res = await api.put(`/ai-providers/${id}`, data)
    return res.data
  },

  async remove(id) {
    const res = await api.delete(`/ai-providers/${id}`)
    return res.data
  },

  async setDefault(id) {
    const res = await api.post(`/ai-providers/${id}/set-default`)
    return res.data
  },

  async fetchModels(data) {
    const res = await api.post('/ai-providers/fetch-models', data)
    return res.data
  },

  async testConnection(data) {
    const res = await api.post('/ai-providers/test-connection', data)
    return res.data
  },

  async inspectComfyUI(data) {
    const res = await api.post('/ai-providers/comfyui/inspect', data)
    return res.data
  },

  async getComfyUITemplates() {
    const res = await api.get('/ai-providers/comfyui/templates')
    return res.data
  },

  async generateComfyUIWorkflow(data) {
    const res = await api.post('/ai-providers/comfyui/generate-workflow', data)
    return res.data
  },
}
