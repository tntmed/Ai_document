import api from './axios'

export const getUsers = (params = {}) =>
  api.get('/users', { params }).then(r => r.data)

export const getUser = (id) =>
  api.get(`/users/${id}`).then(r => r.data)

export const createUser = (data) =>
  api.post('/users', data).then(r => r.data)

export const updateUser = (id, data) =>
  api.patch(`/users/${id}`, data).then(r => r.data)

export const deactivateUser = (id) =>
  api.delete(`/users/${id}`)

export const getDepartments = () =>
  api.get('/users/departments').then(r => r.data)

export const getDepartmentMembers = (department_id) =>
  api.get('/users/departments/members', { params: { department_id } }).then(r => r.data)

export const postComment = (data) =>
  api.post('/comments', data).then(r => r.data)
