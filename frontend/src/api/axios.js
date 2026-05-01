import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Attach JWT token from storage
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch {}
  return config
})

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.detail || error.message || 'เกิดข้อผิดพลาด'
    if (error.response?.status !== 404) {
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
    return Promise.reject(error)
  }
)

export default api
