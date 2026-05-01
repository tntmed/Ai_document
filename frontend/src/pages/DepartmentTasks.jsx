import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTasks, updateTaskStatus, completeTask, assignTaskUser } from '../api/tasks'
import { getDepartments, getDepartmentMembers } from '../api/users'
import { TaskStatusBadge } from '../components/StatusBadge'
import Modal from '../components/Modal'
import { TASK_STATUS_LABELS, formatDate } from '../utils/statusUtils'
import { ExclamationTriangleIcon, CheckCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline'

export default function DepartmentTasks() {
  const { deptId } = useParams()
  const [tasks, setTasks]           = useState([])
  const [dept, setDept]             = useState(null)
  const [deptUsers, setDeptUsers]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatus]   = useState('')
  const [completing, setCompleting] = useState(null)

  // complete modal
  const [completeModal, setCompleteModal] = useState({ open: false, taskId: null, taskTitle: '' })
  const [completionNote, setCompletionNote] = useState('')

  // sub-assign modal
  const [assignModal, setAssignModal] = useState({ open: false, task: null })
  const [assignUserId, setAssignUserId] = useState('')
  const [assignNote, setAssignNote]   = useState('')
  const [assigning, setAssigning]     = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [data, depts] = await Promise.all([
        getTasks({ department_id: deptId, status: statusFilter || undefined, limit: 100 }),
        getDepartments(),
      ])
      setTasks(data.items)
      const found = depts.find(d => d.id === parseInt(deptId))
      setDept(found)
    } finally {
      setLoading(false)
    }
  }

  // Load members of this department for the assign dropdown
  useEffect(() => {
    if (!deptId) return
    getDepartmentMembers(parseInt(deptId))
      .then(res => setDeptUsers(res.items ?? []))
      .catch(() => setDeptUsers([]))
  }, [deptId])

  useEffect(() => { fetchData() }, [deptId, statusFilter])

  const handleStatus = async (taskId, status) => {
    try {
      await updateTaskStatus(taskId, status)
      toast.success('อัปเดตสถานะแล้ว')
      fetchData()
    } catch {}
  }

  const openCompleteModal = (task) => {
    setCompleteModal({ open: true, taskId: task.id, taskTitle: task.task_title })
    setCompletionNote('')
  }
  const closeCompleteModal = () => {
    setCompleteModal({ open: false, taskId: null, taskTitle: '' })
    setCompletionNote('')
  }
  const handleCompleteSubmit = async (e) => {
    e.preventDefault()
    setCompleting(completeModal.taskId)
    try {
      await completeTask(completeModal.taskId, completionNote)
      toast.success('ทำเครื่องหมายเสร็จสิ้นแล้ว')
      closeCompleteModal()
      fetchData()
    } catch {}
    setCompleting(null)
  }

  const openAssignModal = (task) => {
    setAssignModal({ open: true, task })
    setAssignUserId(task.assigned_to_user_id ? String(task.assigned_to_user_id) : '')
    setAssignNote('')
  }
  const closeAssignModal = () => {
    setAssignModal({ open: false, task: null })
    setAssignUserId('')
    setAssignNote('')
  }
  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!assignUserId) { toast.error('กรุณาเลือกผู้รับผิดชอบ'); return }
    setAssigning(true)
    try {
      await assignTaskUser(assignModal.task.id, parseInt(assignUserId), assignNote)
      toast.success('มอบหมายงานเรียบร้อย')
      closeAssignModal()
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
    setAssigning(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            งานหน่วยงาน:{' '}
            {dept ? <span className="text-primary-600">{dept.name}</span> : '...'}
          </h1>
          <p className="page-subtitle">{tasks.length} รายการ</p>
        </div>
      </div>

      {/* Complete modal */}
      <Modal open={completeModal.open} onClose={closeCompleteModal} title="บันทึกผลการดำเนินงาน" size="md">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            งาน: <span className="font-semibold text-gray-800">{completeModal.taskTitle}</span>
          </p>
          <div className="form-group">
            <label className="label">บันทึกผลการดำเนินงาน</label>
            <textarea
              className="input resize-none h-28"
              placeholder="สรุปสิ่งที่ดำเนินการ ผลลัพธ์ หรือข้อมูลเพิ่มเติม..."
              value={completionNote}
              onChange={e => setCompletionNote(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={closeCompleteModal}>ยกเลิก</button>
            <button type="submit" className="btn-success" disabled={completing === completeModal.taskId}>
              <CheckCircleIcon className="w-4 h-4" />
              {completing === completeModal.taskId ? 'กำลังบันทึก...' : 'ยืนยันเสร็จสิ้น'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sub-assign modal */}
      <Modal open={assignModal.open} onClose={closeAssignModal} title="มอบหมายงานให้บุคลากร" size="md">
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            งาน: <span className="font-semibold text-gray-800">{assignModal.task?.task_title}</span>
          </p>
          <div className="form-group">
            <label className="label">เลือกผู้รับผิดชอบ <span className="text-red-500">*</span></label>
            <select
              className="select"
              value={assignUserId}
              onChange={e => setAssignUserId(e.target.value)}
              required
            >
              <option value="">-- เลือกบุคลากร --</option>
              {deptUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role ?? u.roles?.[0] ?? ''})
                </option>
              ))}
            </select>
            {deptUsers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">ไม่พบบุคลากรในหน่วยงานนี้</p>
            )}
          </div>
          <div className="form-group">
            <label className="label">หมายเหตุ (ถ้ามี)</label>
            <input
              className="input"
              placeholder="หมายเหตุการมอบหมาย..."
              value={assignNote}
              onChange={e => setAssignNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={closeAssignModal}>ยกเลิก</button>
            <button type="submit" className="btn-primary" disabled={assigning}>
              <UserPlusIcon className="w-4 h-4" />
              {assigning ? 'กำลังมอบหมาย...' : 'ยืนยันมอบหมาย'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Filter */}
      <div className="card mb-4 flex gap-3 flex-wrap">
        <div>
          <label className="label">สถานะ</label>
          <select className="select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">ไม่มีงาน</div>
      ) : (
        <div className="card p-0">
          <div className="table-container rounded-xl">
            <table className="table">
              <thead>
                <tr>
                  <th>เอกสาร</th>
                  <th>ชื่องาน</th>
                  <th>ผู้รับผิดชอบ</th>
                  <th>สถานะ</th>
                  <th>กำหนดส่ง</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <Link
                        to={`/documents/${task.document_id}`}
                        className="text-primary-600 hover:underline font-mono text-xs font-semibold"
                      >
                        {task.document_no}
                      </Link>
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{task.document_title}</p>
                    </td>
                    <td>
                      <p className="text-sm font-medium line-clamp-2 max-w-xs">{task.task_title}</p>
                    </td>
                    <td className="text-sm">
                      {task.assigned_user_name
                        ? <span className="font-medium text-gray-800">{task.assigned_user_name}</span>
                        : (
                          <button
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                            onClick={() => openAssignModal(task)}
                          >
                            <UserPlusIcon className="w-3 h-3" /> มอบหมาย
                          </button>
                        )
                      }
                    </td>
                    <td><TaskStatusBadge status={task.status} /></td>
                    <td>
                      {task.due_date ? (
                        <span className={task.is_overdue
                          ? 'text-red-600 font-semibold flex items-center gap-1 text-xs'
                          : 'text-sm'}>
                          {task.is_overdue && <ExclamationTriangleIcon className="w-3 h-3" />}
                          {formatDate(task.due_date)}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => openAssignModal(task)}
                          title="มอบหมายให้บุคลากร"
                        >
                          <UserPlusIcon className="w-3 h-3" />
                        </button>
                        {task.status === 'ASSIGNED' && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleStatus(task.id, 'IN_PROGRESS')}
                          >
                            เริ่มงาน
                          </button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <button
                            className="btn-success btn-sm"
                            onClick={() => openCompleteModal(task)}
                          >
                            <CheckCircleIcon className="w-3 h-3" /> เสร็จ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
