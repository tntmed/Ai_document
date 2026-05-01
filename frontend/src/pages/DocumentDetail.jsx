import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getDocument, getTimeline, getDocumentComments,
  submitForReview, closeDocument, assignDocument,
} from '../api/documents'
import { postComment, getDepartments } from '../api/users'
import { DocStatusBadge, PriorityBadge, TaskStatusBadge } from '../components/StatusBadge'
import DepartmentBadge from '../components/DepartmentBadge'
import Timeline from '../components/Timeline'
import Modal from '../components/Modal'
import {
  DOC_TYPE_LABELS, formatDate, formatDateTime,
} from '../utils/statusUtils'
import useAuthStore from '../store/authStore'
import {
  DocumentIcon, PaperAirplaneIcon,
  CheckCircleIcon, ArrowLeftIcon, PlusIcon,
  FingerPrintIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

// ─── Assign modal ─────────────────────────────────────────────────────────────

function AssignModal({ open, onClose, doc, onSuccess }) {
  const [depts, setDepts]       = useState([])
  const [assignments, setAssignments] = useState([
    { department_id: '', task_title: '', task_detail: '', due_date: '' },
  ])
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (open) getDepartments().then(setDepts)
  }, [open])

  const addRow = () =>
    setAssignments(p => [...p, { department_id: '', task_title: '', task_detail: '', due_date: '' }])

  const removeRow = (i) =>
    setAssignments(p => p.filter((_, idx) => idx !== i))

  const updateRow = (i, k, v) =>
    setAssignments(p => p.map((a, idx) => idx === i ? { ...a, [k]: v } : a))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = assignments.filter(a => a.department_id && a.task_title.trim())
    if (!valid.length) { toast.error('กรุณาระบุหน่วยงานและชื่องานอย่างน้อย 1 รายการ'); return }
    setSaving(true)
    try {
      await assignDocument(doc.id, {
        assignments: valid.map(a => ({
          department_id: parseInt(a.department_id),
          task_title: a.task_title.trim(),
          task_detail: a.task_detail || null,
          due_date: a.due_date || null,
        })),
        note: note || null,
      })
      toast.success('มอบหมายงานเรียบร้อย')
      onSuccess()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="มอบหมายงาน" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">{doc?.document_no}: {doc?.title}</p>

        <div className="space-y-3">
          {assignments.map((a, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">งานที่ {i + 1}</span>
                {assignments.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)}
                    className="text-red-400 hover:text-red-600">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                className="select text-sm"
                value={a.department_id}
                onChange={e => updateRow(i, 'department_id', e.target.value)}
              >
                <option value="">เลือกหน่วยงาน *</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input
                className="input text-sm"
                placeholder="ชื่องาน *"
                value={a.task_title}
                onChange={e => updateRow(i, 'task_title', e.target.value)}
              />
              <textarea
                className="input text-sm h-16 resize-none"
                placeholder="รายละเอียดงาน (ถ้ามี)"
                value={a.task_detail}
                onChange={e => updateRow(i, 'task_detail', e.target.value)}
              />
              <input
                type="date"
                className="input text-sm"
                placeholder="วันกำหนดส่ง"
                value={a.due_date}
                onChange={e => updateRow(i, 'due_date', e.target.value)}
              />
            </div>
          ))}
        </div>

        <button type="button" className="btn-secondary btn-sm w-full" onClick={addRow}>
          <PlusIcon className="w-3 h-3" /> เพิ่มหน่วยงาน
        </button>

        <div className="form-group">
          <label className="label">หมายเหตุ / คำสั่ง</label>
          <textarea
            className="input resize-none h-16"
            placeholder="หมายเหตุประกอบการมอบหมาย (ถ้ามี)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'กำลังมอบหมาย...' : 'มอบหมายงาน'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Close document modal ─────────────────────────────────────────────────────

function CloseModal({ open, onClose, onSubmit }) {
  const [note, setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onSubmit(note) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="ปิดเรื่อง" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          การปิดเรื่องจะสิ้นสุดกระบวนการทั้งหมด ดำเนินการต่อ?
        </p>
        <div className="form-group">
          <label className="label">หมายเหตุการปิดเรื่อง</label>
          <textarea
            className="input resize-none h-20"
            placeholder="เหตุผลหรือหมายเหตุ (ถ้ามี)"
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn-success" disabled={saving}>
            <CheckCircleIcon className="w-4 h-4" />
            {saving ? 'กำลังปิด...' : 'ยืนยันปิดเรื่อง'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Submit review confirm modal ──────────────────────────────────────────────

function ConfirmModal({ open, onClose, title, message, onConfirm, confirmLabel = 'ยืนยัน', danger = false }) {
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    setSaving(true)
    try { await onConfirm() }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={handle}
          disabled={saving}
        >
          {saving ? 'กำลังดำเนินการ...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole, user } = useAuthStore()

  const [doc, setDoc]           = useState(null)
  const [timeline, setTimeline] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('info')

  // Modals
  const [showAssign, setShowAssign]         = useState(false)
  const [showClose, setShowClose]           = useState(false)
  const [showConfirmReview, setShowConfirmReview] = useState(false)

  const reload = async () => {
    const [d, t, c] = await Promise.all([
      getDocument(id),
      getTimeline(id),
      getDocumentComments(id),
    ])
    setDoc(d)
    setTimeline(t)
    setComments(c.items || [])
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [id])

  const handleSubmitReview = async () => {
    try {
      await submitForReview(id)
      toast.success('ส่งให้ผู้อำนวยการพิจารณาแล้ว')
      setShowConfirmReview(false)
      reload()
    } catch {}
  }

  const handleClose = async (note) => {
    try {
      await closeDocument(id, note)
      toast.success('ปิดเรื่องเรียบร้อย')
      setShowClose(false)
      reload()
    } catch {}
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      await postComment({ document_id: parseInt(id), comment_text: newComment })
      setNewComment('')
      const c = await getDocumentComments(id)
      setComments(c.items || [])
    } catch {}
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!doc) return <div className="card text-center text-gray-400 py-16">ไม่พบเอกสาร</div>

  const isAdminStaff = hasRole('admin', 'admin_staff')
  const isChief      = hasRole('admin', 'chief')
  const canClose     = isAdminStaff && ['RETURNED_TO_ADMIN', 'DONE_BY_SECTION', 'ASSIGNED'].includes(doc.status)

  return (
    <div>
      {/* Modals */}
      <AssignModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        doc={doc}
        onSuccess={reload}
      />
      <CloseModal
        open={showClose}
        onClose={() => setShowClose(false)}
        onSubmit={handleClose}
      />
      <ConfirmModal
        open={showConfirmReview}
        onClose={() => setShowConfirmReview(false)}
        title="ส่งให้ผู้อำนวยการพิจารณา"
        message={`ต้องการส่งเอกสาร "${doc.title}" ให้ผู้อำนวยการพิจารณาหรือไม่?`}
        confirmLabel="ส่งให้พิจารณา"
        onConfirm={handleSubmitReview}
      />

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm mt-1">
          <ArrowLeftIcon className="w-4 h-4" /> กลับ
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <DocStatusBadge status={doc.status} />
            <PriorityBadge priority={doc.priority} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            เลขที่: <span className="font-mono font-semibold text-gray-700">{doc.document_no}</span>
            {doc.incoming_no && <span className="ml-3">เลขภายนอก: {doc.incoming_no}</span>}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {isAdminStaff && doc.status === 'RECEIVED' && (
            <button className="btn-primary btn-sm" onClick={() => setShowConfirmReview(true)}>
              <PaperAirplaneIcon className="w-4 h-4" /> ส่งให้ Chief พิจารณา
            </button>
          )}
          {isChief && (doc.status === 'WAIT_CHIEF_REVIEW' || doc.status === 'ASSIGNED') && (
            <button className="btn-primary btn-sm" onClick={() => setShowAssign(true)}>
              <PlusIcon className="w-4 h-4" /> มอบหมายงาน
            </button>
          )}
          {isChief && (
            <Link
              to={`/signatures?tab=stamp&docId=${doc.id}`}
              className="btn-secondary btn-sm"
            >
              <FingerPrintIcon className="w-4 h-4" /> ประทับลายเซ็น
            </Link>
          )}
          {canClose && (
            <button className="btn-success btn-sm" onClick={() => setShowClose(true)}>
              <CheckCircleIcon className="w-4 h-4" /> ปิดเรื่อง
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['info', 'tasks', 'timeline', 'comments'].map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${tab === t
                ? 'bg-white border border-b-white text-primary-600 border-gray-200'
                : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t)}
          >
            {{ info: 'ข้อมูลเอกสาร', tasks: `งาน (${doc.tasks?.length || 0})`, timeline: 'Timeline', comments: `ความคิดเห็น (${comments.length})` }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-4">รายละเอียดเอกสาร</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">ผู้ส่ง</dt>
                  <dd className="font-medium">{doc.sender || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">วันที่รับ</dt>
                  <dd className="font-medium">{formatDate(doc.received_date)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">ประเภทเอกสาร</dt>
                  <dd className="font-medium">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">ผู้สร้าง</dt>
                  <dd className="font-medium">{doc.creator_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">ผู้รับผิดชอบปัจจุบัน</dt>
                  <dd className="font-medium">{doc.current_owner_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">วันที่สร้าง</dt>
                  <dd className="font-medium">{formatDateTime(doc.created_at)}</dd>
                </div>
              </dl>

              {doc.summary && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">สรุปเนื้อหา</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{doc.summary}</p>
                </div>
              )}

              {doc.ocr_text && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">ข้อความ OCR</p>
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {doc.ocr_text}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Files panel */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                ไฟล์แนบ ({doc.files?.length || 0})
              </h2>
              {!doc.files?.length ? (
                <p className="text-sm text-gray-400">ไม่มีไฟล์</p>
              ) : (
                <div className="space-y-2">
                  {doc.files.map(f => (
                    <a
                      key={f.id}
                      href={f.stored_path}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
                    >
                      <DocumentIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 truncate">
                          {f.original_filename}
                        </p>
                        <p className="text-xs text-gray-400">
                          {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions card */}
            {isChief && (
              <div className="card bg-primary-50 border-primary-100">
                <h3 className="text-sm font-semibold text-primary-800 mb-2">การดำเนินการ</h3>
                <div className="space-y-2">
                  {(doc.status === 'WAIT_CHIEF_REVIEW' || doc.status === 'ASSIGNED') && (
                    <button
                      className="btn-primary btn-sm w-full justify-center"
                      onClick={() => setShowAssign(true)}
                    >
                      <PlusIcon className="w-3 h-3" /> มอบหมายงานเพิ่มเติม
                    </button>
                  )}
                  <Link
                    to={`/signatures?tab=stamp&docId=${doc.id}`}
                    className="btn-secondary btn-sm w-full justify-center"
                  >
                    <FingerPrintIcon className="w-3 h-3" /> ประทับลายเซ็น
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tasks */}
      {tab === 'tasks' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">งานที่มอบหมาย</h2>
            {isChief && (
              <button className="btn-primary btn-sm" onClick={() => setShowAssign(true)}>
                <PlusIcon className="w-3 h-3" /> มอบหมายงาน
              </button>
            )}
          </div>

          {!doc.tasks?.length ? (
            <p className="text-sm text-gray-400 py-4">ยังไม่มีงาน</p>
          ) : (
            <div className="space-y-3">
              {doc.tasks.map(task => (
                <div key={task.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">{task.task_title}</p>
                      {task.task_detail && (
                        <p className="text-sm text-gray-500 mt-0.5">{task.task_detail}</p>
                      )}
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                    <span>หน่วยงาน: <DepartmentBadge name={task.department_name} /></span>
                    {task.assigned_user_name && (
                      <span>ผู้รับผิดชอบ: {task.assigned_user_name}</span>
                    )}
                    {task.due_date && <span>กำหนดส่ง: {formatDate(task.due_date)}</span>}
                    {task.completed_at && (
                      <span className="text-green-600">เสร็จ: {formatDate(task.completed_at)}</span>
                    )}
                  </div>
                  {task.completion_note && (
                    <p className="text-xs text-gray-500 mt-2 bg-green-50 rounded px-2 py-1">
                      บันทึกเสร็จสิ้น: {task.completion_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Timeline */}
      {tab === 'timeline' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">ประวัติการดำเนินการ</h2>
          <Timeline entries={timeline} />
        </div>
      )}

      {/* Tab: Comments */}
      {tab === 'comments' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">ความคิดเห็น</h2>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {!comments.length && (
              <p className="text-sm text-gray-400">ยังไม่มีความคิดเห็น</p>
            )}
            {comments.map(c => (
              <div
                key={c.id}
                className={`rounded-xl p-3 ${c.user_id === user?.id ? 'bg-primary-50 ml-8' : 'bg-gray-50 mr-8'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.user_full_name}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{c.comment_text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="เพิ่มความคิดเห็น..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!newComment.trim()}
            >
              ส่ง
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
