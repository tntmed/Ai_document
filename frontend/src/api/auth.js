import api from './axios'

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data)

export const getMe = () =>
  api.get('/auth/me').then(r => r.data)
