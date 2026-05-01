import api from './axios'

export const suggestDepartment = (data) =>
  api.post('/routing/suggest', data).then(r => r.data)

export const saveFeedback = (data) =>
  api.post('/routing/feedback', data).then(r => r.data)

export const getRules = () =>
  api.get('/routing/rules').then(r => r.data)

export const createRule = (data) =>
  api.post('/routing/rules', data).then(r => r.data)

export const updateRule = (id, data) =>
  api.patch(`/routing/rules/${id}`, data).then(r => r.data)

export const deleteRule = (id) =>
  api.delete(`/routing/rules/${id}`)
