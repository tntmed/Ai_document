import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTasks } from '../api/tasks'
import { getDepartments } from '../api/users'
import { TaskStatusBadge } from '../components/StatusBadge'
import DepartmentBadge from '../components/DepartmentBadge'
import { TASK_STATUS_LABELS, formatDate } from '../utils/statusUtils'
import { FunnelIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', department_id: '', page: 1, limit: 20 })

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = { page: filters.page, limit: filters.limit }
      if (filters.status)        params.status = filters.status
      if (filters.department_id) params.department_id = filters.department_id
      const data = await getTasks(params)
      setTasks(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getDepartments().then(setDepts) }, [])
  useEffect(() => { fetchTasks() }, [filters.status, filters.department_id, filters.page])

  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">งานทั้งหมด</h1>
          <p className="page-subtitle">ทั้งหมด {total} รายการ</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">สถานะ</label>
          <select className="select" value={filters.status}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))}>
            <option value="">ทั้งหมด</option>
            {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">หน่วยงาน</label>
          <select className="select" value={filters.department_id}
            onChange={e => setFilters(p => ({ ...p, department_id: e.target.value, page: 1 }))}>
            <option value="">ทั้งหมด</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">ไม่พบงาน</div>
        ) : (
          <>
            <div className="table-container rounded-xl">
              <table className="table">
                <thead>
                  <tr>
                    <th>เอกสาร</th>
                    <th>ชื่องาน</th>
                    <th>หน่วยงาน</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>สถานะ</th>
                    <th>กำหนดส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/documents/${task.document_id}`}
                          className="text-primary-600 hover:underline font-mono text-xs font-semibold">
                          {task.document_no}
                        </Link>
                      </td>
                      <td>
                        <p className="font-medium text-sm line-clamp-2 max-w-xs">{task.task_title}</p>
                      </td>
                      <td><DepartmentBadge name={task.department_name} /></td>
                      <td className="text-sm">{task.assigned_user_name || <span className="text-gray-400">-</span>}</td>
                      <td><TaskStatusBadge status={task.status} /></td>
                      <td>
                        {task.due_date ? (
                          <span className={task.is_overdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-sm'}>
                            {task.is_overdue && <ExclamationTriangleIcon className="w-4 h-4" />}
                            {formatDate(task.due_date)}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">หน้า {filters.page} / {totalPages}</p>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" disabled={filters.page <= 1}
                    onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← ก่อนหน้า</button>
                  <button className="btn-secondary btn-sm" disabled={filters.page >= totalPages}
                    onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>ถัดไป →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
