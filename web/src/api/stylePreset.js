// web/src/api/stylePreset.js
import api from './client';

export const stylePresetApi = {
  list: () => api.get('/style-presets').then(res => res.data),
  adminList: () => api.get('/admin/style-presets').then(res => res.data),
  create: data => api.post('/admin/style-presets', data).then(res => res.data),
  update: (id, data) => api.put(`/admin/style-presets/${id}`, data).then(res => res.data),
  toggle: id => api.put(`/admin/style-presets/${id}/toggle`).then(res => res.data),
  destroy: id => api.delete(`/admin/style-presets/${id}`).then(res => res.data),
  regenerateCover: (id, data = {}) =>
    api.post(`/admin/style-presets/${id}/regenerate-cover`, data, { timeout: 180000 }).then(res => res.data),
};
