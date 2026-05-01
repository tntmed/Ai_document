import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getMyTasks, updateTaskStatus, completeTask, assignTaskUser } from '../api/tasks'
import { getDepartmentMembers } from '../api/users'
import { TaskStatusBadge } from '../components/StatusBadge'
import DepartmentBadge from '../components/DepartmentBadge'
import Modal from '../components/Modal'
import { formatDate } from '../utils/statusUtils'
import {
  CheckCircleIcon, PlayIcon, ExclamationTriangleIcon,
  InboxStackIcon, UserPlusIcon,
} from '@heroicons/react/24/outline'
import useAuthStore from '../store/authStore'

export default function MyTasks() {
  const user   = useAuthStore(s => s.user)
  const role   = user?.role ?? 'staff'

  const isDeptHead      = role === 'department_head'
  const isAdminOrChief  = role === 'admin' || role === 'chief'

  const pageTitle  = isDeptHead ? 'งานรอมอบหมายในแผนก' : 'งานที่มอบหมายให้ฉัน'
  const emptyLabel = isDeptHead ? 'ไม่มีงานรอมอบหมายในแผนก' : 'ไม่มีงานที่ได้รับมอบหมายในขณะนี้'

  // ─── State ────────────────────────────────────────────────────────────────
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeStatus, setActive]   = useState('')
  const [completing, setCompleting] = useState(null)

  // Complete modal
  const [completeModal, setCompleteModal] = useState({ open: false, taskId: null, taskTitle: '' })
  const [completionNote, setCompletionNote] = useState('')

  // Sub-assign modal (department_head)
  const [assignModal, setAssignModal]   = useState({ open: false, task: null })
  const [deptUsers, setDeptUsers]       = useState([])
  const [assignUserId, setAssignUserId] = useState('')
  const [assignNote, setAssignNote]     = useState('')
  const [assigning, setAssigning]       = useState(false)

  // ─── Data ─────────────────────────────────────────────────────────────────
  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = activeStatus ? { status: activeStatus } : {}
      const data = await getMyTasks(params)
      setTasks(data.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [activeStatus])

  // ─── Handlers: status ─────────────────────────────────────────────────────
  const handleAccept = async (taskId) => {
    try {
      await updateTaskStatus(taskId, 'ACCEPTED', 'รับงานแล้ว')
      toast.success('รับงานแล้ว')
      fetchTasks()
    } catch {}
  }

  const handleStartWork = async (taskId) => {
    try {
      await updateTaskStatus(taskId, 'IN_PROGRESS', 'เริ่มดำเนินการ')
      toast.success('เริ่มดำเนินการแล้ว')
      fetchTasks()
    } catch {}
  }

  // ─── Handlers: complete modal ──────────────────────────────────────────────
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
      toast.success('บันทึกผลงานเรียบร้อย')
      closeCompleteModal()
      fetchTasks()
    } catch {}
    setCompleting(null)
  }

  // ─── Handlers: sub-assign modal ───────────────────────────────────────────
  const openAssignModal = async (task) => {
    setAssignModal({ open: true, task })
    setAssignUserId(task.assigned_to_user_id ? String(task.assigned_to_user_id) : '')
    setAssignNote('')
    try {
      const res = await getDepartmentMembers(task.assigned_department_id)
      setDeptUsers(res.items ?? res ?? [])
    } catch {
      setDeptUsers([])
    }
  }
  const closeAssignModal = () => {
    setAssignModal({ open: false, task: null })
    setAssignUserId('')
    setAssignNote('')
  }
  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!assignUserId) return
    setAssigning(true)
    try {
      await assignTaskUser(assignModal.task.id, parseInt(assignUserId), assignNote)
      toast.success('มอบหมายงานเรียบร้อย')
      closeAssignModal()
      fetchTasks()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
    setAssigning(false)
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    { label: 'ทั้งหมด',        value: '' },
    { label: 'มอบหมายแล้ว',    value: 'ASSIGNED' },
    { label: 'รับงานแล้ว',     value: 'ACCEPTED' },
    { label: 'กำลังดำเนินการ', value: 'IN_PROGRESS' },
    { label: 'เสร็จสิ้น',      value: 'COMPLETED' },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            {isDeptHead && <InboxStackIcon className="w-6 h-6 text-primary-600" />}
            {pageTitle}
          </h1>
          <p className="page-subtitle">
            {tasks.length} รายการ
            {isDeptHead && (
              <span className="ml-2 text-xs text-amber-600 font-medium">
                · งานที่ยังไม่ได้มอบหมายให้บุคคล — คลิก "มอบหมาย" เพื่อส่งงานให้สมาชิกในแผนก
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setActive(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${activeStatus === t.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Complete modal ── */}
      <Modal open={completeModal.open} onClose={closeCompleteModal} title="บันทึกผลการดำเนินงาน" size="md">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            งาน: <span className="font-semibold text-gray-800">{completeModal.taskTitle}</span>
          </p>
          <div className="form-group">
            <label className="label">สรุปผลการดำเนินงาน</label>
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

      {/* ── Sub-assign modal (department_head only) ── */}
      {isDeptHead && (
        <Modal open={assignModal.open} onClose={closeAssignModal} title="มอบหมายงานให้บุคลากร" size="md">
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              <p className="font-semibold">{assignModal.task?.task_title}</p>
              {assignModal.task?.task_detail && (
                <p className="text-xs mt-0.5 text-amber-600">{assignModal.task.task_detail}</p>
              )}
            </div>
            <div className="form-group">
              <label className="label">เลือกผู้รับผิดชอบ <span className="text-red-500">*</span></label>
              <select
                className="select"
                value={assignUserId}
                onChange={e => setAssignUserId(e.target.value)}
                required
              >
                <option value="">-- เลือกบุคลากรในแผนก --</option>
                {deptUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              {deptUsers.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">ไม่พบบุคลากรในหน่วยงาน</p>
              )}
            </div>
            <div className="form-group">
              <label className="label">หมายเหตุ</label>
              <input
                className="input"
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                value={assignNote}
                onChange={e => setAssignNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={closeAssignModal}>ยกเลิก</button>
              <button type="submit" className="btn-primary" disabled={!assignUserId || assigning}>
                <UserPlusIcon className="w-4 h-4" />
                {assigning ? 'กำลังมอบหมาย...' : 'ยืนยันมอบหมาย'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">{emptyLabel}</div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`card border-l-4 ${
                task.is_overdue         ? 'border-red-400'
                : !task.assigned_to_user_id ? 'border-amber-400'
                : 'border-primary-400'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/documents/${task.document_id}`}
                      className="text-xs font-mono font-semibold text-primary-600 hover:underline"
                    >
                      {task.document_no}
                    </Link>
                    <TaskStatusBadge status={task.status} />
                    <DepartmentBadge name={task.department_name} />
                    {!task.assigned_to_user_id && isDeptHead && (
                      <span className="badge bg-amber-100 text-amber-700">⏳ รอมอบหมาย</span>
                    )}
                    {task.assigned_user_name && (
                      <span className="badge bg-blue-100 text-blue-700">👤 {task.assigned_user_name}</span>
                    )}
                    {task.is_overdue && (
                      <span className="badge bg-red-100 text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3" /> เกินกำหนด
                      </span>
                    )}
                  </div>

                  <p className="font-semibold text-gray-800">{task.task_title}</p>
                  {task.document_title && (
                    <p className="text-sm text-gray-500 line-clamp-1">{task.document_title}</p>
                  )}
                  {task.task_detail && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.task_detail}</p>
                  )}

                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    {task.due_date && (
                      <span className={task.is_overdue ? 'text-red-500 font-semibold' : ''}>
                        กำหนดส่ง: {formatDate(task.due_date)}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-green-600">เสร็จ: {formatDate(task.completed_at)}</span>
                    )}
                    <span>รับจาก: {task.assigner_name}</span>
                  </div>

                  {task.completion_note && (
                    <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                      ผลการดำเนินงาน: {task.completion_note}
                    </div>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {/* Assign button — department_head on unassigned tasks */}
                  {isDeptHead && !task.assigned_to_user_id && !['COMPLETED', 'CANCELLED', 'RETURNED'].includes(task.status) && (
                    <button
                      className="btn-sm whitespace-nowrap flex items-center gap-1 bg-amber-500 text-white hover:bg-amber-600 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      onClick={() => openAssignModal(task)}
                    >
                      <UserPlusIcon className="w-3.5 h-3.5" /> มอบหมาย
                    </button>
                  )}

                  {/* Re-assign button — task already assigned but dept_head wants to change */}
                  {isDeptHead && task.assigned_to_user_id && !['COMPLETED', 'CANCELLED', 'RETURNED'].includes(task.status) && (
                    <button
                      className="btn-secondary btn-sm whitespace-nowrap flex items-center gap-1"
                      onClick={() => openAssignModal(task)}
                    >
                      <UserPlusIcon className="w-3.5 h-3.5" /> เปลี่ยนผู้รับ
                    </button>
                  )}

                  {/* Accept / Start / Complete — for directly assigned user */}
                  {task.status === 'ASSIGNED' && (task.assigned_to_user_id || isAdminOrChief) && (
                    <button className="btn-secondary btn-sm whitespace-nowrap" onClick={() => handleAccept(task.id)}>
                      รับงาน
                    </button>
                  )}
                  {task.status === 'ACCEPTED' && (
                    <button className="btn-primary btn-sm whitespace-nowrap" onClick={() => handleStartWork(task.id)}>
                      <PlayIcon className="w-3 h-3" /> เริ่มงาน
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button className="btn-success btn-sm whitespace-nowrap" onClick={() => openCompleteModal(task)}>
                      <CheckCircleIcon className="w-3 h-3" /> เสร็จสิ้น
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
