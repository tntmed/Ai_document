import api from './axios'

export const getMySignatures = () =>
  api.get('/signatures/me').then(r => r.data)

export const uploadSignature = (formData) =>
  api.post('/signatures/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const deleteSignature = (id) =>
  api.delete(`/signatures/${id}`)

export const stampDocument = (documentId, data) =>
  api.post(`/signatures/documents/${documentId}/stamp`, data).then(r => r.data)

export const getDocumentPdfVersions = (documentId) =>
  api.get(`/signatures/documents/${documentId}/versions`).then(r => r.data)

export const getDocumentAuditLogs = (documentId) =>
  api.get(`/signatures/documents/${documentId}/audit-logs`).then(r => r.data)
