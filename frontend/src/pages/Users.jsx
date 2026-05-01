import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getUsers, createUser, updateUser, deactivateUser, getDepartments } from '../api/users'
import { ROLE_LABELS } from '../utils/statusUtils'
import { PlusIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

const ROLES = Object.entries(ROLE_LABELS)
const EMPTY_FORM = { username: '', password: '', full_name: '', role: 'staff', department_id: '' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const [u, d] = await Promise.all([
      getUsers({ is_active: true }),
      getDepartments(),
    ])
    setUsers(u.items || [])
    setDepts(d)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleEdit = (user) => {
    setEditId(user.id)
    setForm({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role: user.role,
      department_id: String(user.department_id || ''),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('กรุณากรอกชื่อ-นามสกุล'); return }
    if (!editId && !form.username.trim()) { toast.error('กรุณากรอกชื่อผู้ใช้'); return }
    if (!editId && !form.password) { toast.error('กรุณากรอกรหัสผ่าน'); return }

    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        role: form.role,
        department_id: form.department_id ? parseInt(form.department_id) : null,
      }
      if (form.password) payload.password = form.password

      if (editId) {
        await updateUser(editId, payload)
        toast.success('แก้ไขผู้ใช้เรียบร้อย')
      } else {
        await createUser({ ...payload, username: form.username.trim() })
        toast.success('เพิ่มผู้ใช้เรียบร้อย')
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id, name) => {
    if (!confirm(`ปิดการใช้งานบัญชี "${name}"?`)) return
    try {
      await deactivateUser(id)
      toast.success('ปิดการใช้งานบัญชีแล้ว')
      fetchData()
    } catch {}
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (filterDept && u.department_id !== parseInt(filterDept)) return false
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการผู้ใช้งาน</h1>
          <p className="page-subtitle">{filteredUsers.length} บัญชี</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>
          <PlusIcon className="w-4 h-4" /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{editId ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h2>
            <button onClick={() => setShowForm(false)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {!editId && (
              <div className="form-group">
                <label className="label">ชื่อผู้ใช้ <span className="text-red-500">*</span></label>
                <input className="input" placeholder="username" value={form.username} onChange={set('username')} />
              </div>
            )}
            {editId && <div />}

            <div className="form-group">
              <label className="label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input className="input" placeholder="ชื่อเต็ม" value={form.full_name} onChange={set('full_name')} />
            </div>

            <div className="form-group">
              <label className="label">{editId ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</label>
              <input type="password" className="input" placeholder="รหัสผ่าน" value={form.password} onChange={set('password')} />
            </div>

            <div className="form-group">
              <label className="label">สิทธิ์</label>
              <select className="select" value={form.role} onChange={set('role')}>
                {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">หน่วยงาน</label>
              <select className="select" value={form.department_id} onChange={set('department_id')}>
                <option value="">ไม่ระบุ</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <CheckIcon className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : (editId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 flex gap-3 flex-wrap">
        <div>
          <label className="label">กรองตามสิทธิ์</label>
          <select className="select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">กรองตามหน่วยงาน</label>
          <select className="select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="table-container rounded-xl">
            <table className="table">
              <thead>
                <tr>
                  <th>ชื่อผู้ใช้</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>สิทธิ์</th>
                  <th>หน่วยงาน</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="font-mono text-sm font-semibold">{u.username}</td>
                    <td className="font-medium">{u.full_name}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700'
                        : u.role === 'chief' ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td>{u.department?.name || <span className="text-gray-400">-</span>}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'ใช้งาน' : 'ปิดแล้ว'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-400 hover:text-primary-600 rounded"
                          onClick={() => handleEdit(u)}>
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {u.is_active && (
                          <button className="p-1 text-gray-400 hover:text-red-600 rounded"
                            onClick={() => handleDeactivate(u.id, u.full_name)}>
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
