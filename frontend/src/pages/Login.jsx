import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login } from '../api/auth'
import useAuthStore from '../store/authStore'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      return
    }
    setLoading(true)
    try {
      const data = await login(form.username, form.password)
      setAuth(data.access_token, data.user)
      toast.success(`ยินดีต้อนรับ ${data.user.full_name}`)
      navigate('/dashboard')
    } catch (err) {
      // error toast handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
            <DocumentTextIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ระบบจัดการเอกสาร</h1>
          <p className="text-blue-200 mt-1 text-sm">ศูนย์คอมพิวเตอร์ โรงพยาบาล</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">ชื่อผู้ใช้งาน</label>
              <input
                type="text"
                className="input"
                placeholder="กรอกชื่อผู้ใช้"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="label">รหัสผ่าน</label>
              <input
                type="password"
                className="input"
                placeholder="กรอกรหัสผ่าน"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              บัญชีทดสอบ: admin / admin123 &nbsp;|&nbsp; chief / chief123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
