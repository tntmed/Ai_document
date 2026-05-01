import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getDocuments, assignDocument } from '../api/documents'
import { suggestDepartment, saveFeedback } from '../api/routing'
import { getDepartments } from '../api/users'
import { DocStatusBadge, PriorityBadge } from '../components/StatusBadge'
import { DOC_TYPE_LABELS, formatDate } from '../utils/statusUtils'
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function ChiefReview() {
  const [docs, setDocs] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [assignments, setAssignments] = useState([
    { department_id: '', task_title: '', task_detail: '', due_date: '' }
  ])
  const [assigning, setAssigning] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    Promise.all([
      getDocuments({ status: 'WAIT_CHIEF_REVIEW', limit: 50 }),
      getDepartments(),
    ]).then(([d, dp]) => {
      setDocs(d.items)
      setDepts(dp)
    }).finally(() => setLoading(false))
  }, [])

  const handleSelect = async (doc) => {
    setSelected(doc)
    setSuggestion(null)
    setAssignments([{ department_id: '', task_title: '', task_detail: '', due_date: '' }])
    setNote('')
    // Get routing suggestion
    try {
      const s = await suggestDepartment({ document_id: doc.id })
      setSuggestion(s)
      if (s.suggested_department_id) {
        setAssignments([{
          department_id: String(s.suggested_department_id),
          task_title: doc.title,
          task_detail: s.reason,
          due_date: '',
        }])
      }
    } catch {}
  }

  const addAssignment = () => {
    setAssignments(p => [...p, { department_id: '', task_title: '', task_detail: '', due_date: '' }])
  }

  const removeAssignment = (i) => {
    setAssignments(p => p.filter((_, idx) => idx !== i))
  }

  const updateAssignment = (i, key, val) => {
    setAssignments(p => p.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  }

  const handleAssign = async () => {
    if (!selected) return
    const valid = assignments.filter(a => a.department_id && a.task_title)
    if (!valid.length) { toast.error('กรุณาระบุหน่วยงานและชื่องานอย่างน้อย 1 รายการ'); return }

    setAssigning(true)
    try {
      // Save feedback if suggestion was overridden
      if (suggestion?.suggested_department_id) {
        const selectedDeptId = parseInt(assignments[0].department_id)
        if (selectedDeptId !== suggestion.suggested_department_id) {
          await saveFeedback({
            document_id: selected.id,
            system_suggested_department_id: suggestion.suggested_department_id,
            chief_selected_department_id: selectedDeptId,
          })
        }
      }

      await assignDocument(selected.id, {
        assignments: valid.map(a => ({
          department_id: parseInt(a.department_id),
          task_title: a.task_title,
          task_detail: a.task_detail || null,
          due_date: a.due_date || null,
        })),
        note,
      })

      toast.success('มอบหมายงานเรียบร้อย')
      setDocs(p => p.filter(d => d.id !== selected.id))
      setSelected(null)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">รอผู้อำนวยการพิจารณา</h1>
          <p className="page-subtitle">{docs.length} รายการรอการพิจารณา</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document list */}
        <div>
          <div className="card p-0">
            {!docs.length ? (
              <div className="text-center py-16 text-gray-400">ไม่มีเอกสารรอพิจารณา</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors
                      ${selected?.id === doc.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
                    onClick={() => handleSelect(doc)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm line-clamp-2">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{doc.document_no}</p>
                        {doc.sender && <p className="text-xs text-gray-400">จาก: {doc.sender}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <PriorityBadge priority={doc.priority} />
                        <span className="text-xs text-gray-400">{formatDate(doc.received_date)}</span>
                      </div>
                    </div>
                    {doc.ocr_text && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 bg-gray-50 px-2 py-1 rounded">
                        OCR: {doc.ocr_text.replace('[OCR Mock] ', '')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignment panel */}
        <div>
          {!selected ? (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <p className="text-lg">👆</p>
                <p>เลือกเอกสารด้านซ้ายเพื่อพิจารณา</p>
              </div>
            </div>
          ) : (
            <div className="card space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-800">มอบหมายงาน</h2>
                <p className="text-sm text-gray-500">{selected.document_no}: {selected.title}</p>
              </div>

              {/* Routing suggestion */}
              {suggestion && (
                <div className={`rounded-xl p-3 text-sm
                  ${suggestion.suggested_department_id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-blue-700">Routing Suggestion</span>
                    {suggestion.confidence > 0 && (
                      <span className="badge bg-blue-100 text-blue-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{suggestion.reason}</p>
                  {suggestion.matched_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.matched_keywords.map(kw => (
                        <span key={kw} className="badge bg-blue-100 text-blue-600">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Assignment rows */}
              <div className="space-y-3">
                {assignments.map((a, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">งานที่ {i + 1}</span>
                      {assignments.length > 1 && (
                        <button type="button" onClick={() => removeAssignment(i)}
                          className="text-xs text-red-500 hover:text-red-700">ลบ</button>
                      )}
                    </div>
                    <select
                      className="select text-sm"
                      value={a.department_id}
                      onChange={e => updateAssignment(i, 'department_id', e.target.value)}
                    >
                      <option value="">เลือกหน่วยงาน</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <input
                      className="input text-sm"
                      placeholder="ชื่องาน"
                      value={a.task_title}
                      onChange={e => updateAssignment(i, 'task_title', e.target.value)}
                    />
                    <textarea
                      className="input text-sm h-16 resize-none"
                      placeholder="รายละเอียดงาน (ถ้ามี)"
                      value={a.task_detail}
                      onChange={e => updateAssignment(i, 'task_detail', e.target.value)}
                    />
                    <input
                      type="date"
                      className="input text-sm"
                      value={a.due_date}
                      onChange={e => updateAssignment(i, 'due_date', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button type="button" className="btn-secondary btn-sm w-full" onClick={addAssignment}>
                + เพิ่มหน่วยงาน
              </button>

              <div className="form-group">
                <label className="label">หมายเหตุ</label>
                <textarea
                  className="input resize-none h-16"
                  placeholder="คำสั่งพิเศษหรือหมายเหตุ..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Link to={`/documents/${selected.id}`} className="btn-secondary btn-sm flex-1 justify-center">
                  ดูเอกสาร
                </Link>
                <button
                  className="btn-primary flex-1 justify-center"
                  onClick={handleAssign}
                  disabled={assigning}
                >
                  <CheckIcon className="w-4 h-4" />
                  {assigning ? 'กำลังมอบหมาย...' : 'มอบหมายงาน'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
