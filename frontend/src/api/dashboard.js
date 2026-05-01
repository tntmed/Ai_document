import api from './axios'

export const getSummary = () =>
  api.get('/dashboard/summary').then(r => r.data)

export const getByDepartment = () =>
  api.get('/dashboard/by-department').then(r => r.data)

export const getOverdueTasks = () =>
  api.get('/dashboard/overdue-tasks').then(r => r.data)
