import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getRules, createRule, updateRule, deleteRule } from '../api/routing'
import { getDepartments } from '../api/users'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import DepartmentBadge from '../components/DepartmentBadge'

const DOC_TYPES = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'MEMO',      label: 'บันทึกข้อความ' },
  { value: 'LETTER',    label: 'หนังสือ' },
  { value: 'ORDER',     label: 'คำสั่ง' },
  { value: 'REPORT',    label: 'รายงาน' },
  { value: 'REQUEST',   label: 'คำขอ / ขออนุมัติ' },
  { value: 'COMPLAINT', label: 'ร้องเรียน' },
  { value: 'OTHER',     label: 'อื่นๆ' },
]

const EMPTY_FORM = { keyword: '', target_department_id: '', document_type: '', priority: 0, is_active: true }

export default function RoutingRules() {
  const [rules, setRules] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [r, d] = await Promise.all([getRules(), getDepartments()])
    setRules(r)
    setDepts(d)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleEdit = (rule) => {
    setEditId(rule.id)
    setForm({
      keyword: rule.keyword,
      target_department_id: String(rule.target_department_id),
      document_type: rule.document_type || '',
      priority: rule.priority,
      is_active: rule.is_active,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.keyword.trim() || !form.target_department_id) {
      toast.error('กรุณากรอกคำสำคัญและเลือกหน่วยงาน')
      return
    }
    setSaving(true)
    try {
      const payload = {
        keyword: form.keyword.trim(),
        target_department_id: parseInt(form.target_department_id),
        document_type: form.document_type || null,
        priority: parseInt(form.priority) || 0,
        is_active: form.is_active,
      }
      if (editId) {
        await updateRule(editId, payload)
        toast.success('แก้ไขกฎเรียบร้อย')
      } else {
        await createRule(payload)
        toast.success('เพิ่มกฎเรียบร้อย')
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('ลบกฎนี้?')) return
    try {
      await deleteRule(id)
      toast.success('ลบกฎเรียบร้อย')
      fetchData()
    } catch {}
  }

  const handleToggle = async (rule) => {
    try {
      await updateRule(rule.id, { is_active: !rule.is_active })
      fetchData()
    } catch {}
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: k === 'is_active' ? e.target.checked : e.target.value }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">กฎ Routing</h1>
          <p className="page-subtitle">กำหนดคำสำคัญสำหรับแนะนำหน่วยงานอัตโนมัติ ({rules.length} กฎ)</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>
          <PlusIcon className="w-4 h-4" /> เพิ่มกฎ
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{editId ? 'แก้ไขกฎ' : 'เพิ่มกฎใหม่'}</h2>
            <button onClick={() => setShowForm(false)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2 md:col-span-1">
              <label className="label">คำสำคัญ (keyword) <span className="text-red-500">*</span></label>
              <input className="input" placeholder="เช่น ส่งซ่อม, ลงโปรแกรม, LAN" value={form.keyword} onChange={set('keyword')} />
            </div>
            <div className="form-group">
              <label className="label">หน่วยงานเป้าหมาย <span className="text-red-500">*</span></label>
              <select className="select" value={form.target_department_id} onChange={set('target_department_id')}>
                <option value="">เลือกหน่วยงาน</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">ประเภทเอกสาร (ถ้าต้องการกรอง)</label>
              <select className="select" value={form.document_type} onChange={set('document_type')}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">ความสำคัญ (0–10)</label>
              <input type="number" className="input" min="0" max="10" value={form.priority} onChange={set('priority')} />
            </div>
            <div className="form-group flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4" />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">เปิดใช้งาน</label>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <CheckIcon className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : (editId ? 'บันทึกการแก้ไข' : 'เพิ่มกฎ')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules table */}
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
                  <th>คำสำคัญ</th>
                  <th>หน่วยงาน</th>
                  <th>ประเภทเอกสาร</th>
                  <th>ความสำคัญ</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{rule.keyword}</code>
                    </td>
                    <td><DepartmentBadge name={rule.department_name} /></td>
                    <td className="text-sm text-gray-500">{rule.document_type || <span className="text-gray-300">ทุกประเภท</span>}</td>
                    <td>
                      <span className={`badge ${rule.priority >= 5 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.priority}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggle(rule)}
                        className={`badge cursor-pointer ${rule.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {rule.is_active ? 'เปิด' : 'ปิด'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-400 hover:text-primary-600 rounded"
                          onClick={() => handleEdit(rule)}>
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 rounded"
                          onClick={() => handleDelete(rule.id)}>
                          <TrashIcon className="w-4 h-4" />
                        </button>
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
