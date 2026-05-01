import api from './axios'

export const uploadDocument = (formData) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const getDocuments = (params = {}) =>
  api.get('/documents', { params }).then(r => r.data)

export const getDocument = (id) =>
  api.get(`/documents/${id}`).then(r => r.data)

export const updateDocument = (id, data) =>
  api.patch(`/documents/${id}`, data).then(r => r.data)

export const submitForReview = (id) =>
  api.post(`/documents/${id}/submit-review`).then(r => r.data)

export const assignDocument = (id, data) =>
  api.post(`/documents/${id}/assign`, data).then(r => r.data)

export const closeDocument = (id, closing_note = '') =>
  api.post(`/documents/${id}/close`, { closing_note }).then(r => r.data)

export const getTimeline = (id) =>
  api.get(`/documents/${id}/timeline`).then(r => r.data)

export const getDocumentComments = (id) =>
  api.get(`/comments/document/${id}`).then(r => r.data)

