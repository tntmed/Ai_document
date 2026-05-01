import api from './axios'

export const getTasks = (params = {}) =>
  api.get('/tasks', { params }).then(r => r.data)

export const getMyTasks = (params = {}) =>
  api.get('/tasks/my', { params }).then(r => r.data)

export const getTask = (id) =>
  api.get(`/tasks/${id}`).then(r => r.data)

export const updateTaskStatus = (id, status, note = '') =>
  api.patch(`/tasks/${id}/status`, { status, note }).then(r => r.data)

export const completeTask = (id, completion_note = '') =>
  api.post(`/tasks/${id}/complete`, { completion_note }).then(r => r.data)

export const assignTaskUser = (id, user_id, note = '') =>
  api.patch(`/tasks/${id}/assign-user`, { user_id, note }).then(r => r.data)

export const getTaskComments = (id) =>
  api.get(`/comments/task/${id}`).then(r => r.data)
