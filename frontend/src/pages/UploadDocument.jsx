import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { uploadDocument } from '../api/documents'
import { DOC_TYPE_LABELS } from '../utils/statusUtils'
import {
  CloudArrowUpIcon, DocumentIcon, XMarkIcon,
  CheckCircleIcon, SparklesIcon, ClockIcon,
} from '@heroicons/react/24/outline'

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS)
const PRIORITIES = [
  { value: 'LOW',    label: 'ต่ำ' },
  { value: 'NORMAL', label: 'ปกติ' },
  { value: 'HIGH',   label: 'สูง' },
  { value: 'URGENT', label: 'ด่วนมาก' },
]

// ─── Success screen shown after upload ────────────────────────────────────────

function UploadResult({ doc, onReset }) {
  const auto = doc.auto_assignment

  return (
    <div className="max-w-lg mx-auto">
      <div className="card text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">อัปโหลดสำเร็จ!</h2>
        <p className="text-sm text-gray-500 font-mono mb-4">{doc.document_no}</p>
        <p className="text-sm font-semibold text-gray-700 mb-4">{doc.title}</p>

        {/* Auto-assignment result */}
        {auto && auto.assigned && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">มอบหมายอัตโนมัติแล้ว</span>
              {auto.confidence > 0 && (
                <span className="badge bg-green-100 text-green-700 ml-auto">
                  {Math.round(auto.confidence * 100)}% match
                </span>
              )}
            </div>
            <p className="text-sm text-green-700">
              หน่วยงาน: <span className="font-semibold">{auto.department_name}</span>
            </p>
            {auto.reason && (
              <p className="text-xs text-green-600 mt-1">{auto.reason}</p>
            )}
            {auto.matched_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {auto.matched_keywords.map(kw => (
                  <span key={kw} className="badge bg-green-100 text-green-600">{kw}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {auto && auto.fallback_to_chief && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">รอผู้อำนวยการพิจารณา</span>
            </div>
            <p className="text-xs text-yellow-700">{auto.reason}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            className="btn-secondary"
            onClick={onReset}
          >
            อัปโหลดเอกสารใหม่
          </button>
          <Link to={`/documents/${doc.id}`} className="btn-primary">
            ดูเอกสาร →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Upload form ──────────────────────────────────────────────────────────────

export default function UploadDocument() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [form, setForm]       = useState({
    title: '',
    incoming_no: '',
    sender: '',
    received_date: new Date().toISOString().split('T')[0],
    document_type: 'OTHER',
    priority: 'NORMAL',
    summary: '',
  })

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('กรุณาเลือกไฟล์ PDF เท่านั้น'); return }
    if (f.size > 50 * 1024 * 1024) { toast.error('ขนาดไฟล์ต้องไม่เกิน 50 MB'); return }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile({ target: { files: [f] } })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('กรุณาเลือกไฟล์ PDF'); return }
    if (!form.title.trim()) { toast.error('กรุณากรอกชื่อเรื่อง'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })

      const doc = await uploadDocument(fd)
      setResult(doc)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return <UploadResult doc={result} onReset={() => {
      setResult(null)
      setFile(null)
      setForm({
        title: '',
        incoming_no: '',
        sender: '',
        received_date: new Date().toISOString().split('T')[0],
        document_type: 'OTHER',
        priority: 'NORMAL',
        summary: '',
      })
    }} />
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">อัปโหลดเอกสาร</h1>
          <p className="page-subtitle">รับเอกสารสแกน / PDF เข้าระบบ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'}`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <DocumentIcon className="w-10 h-10 text-green-500" />
              <div className="text-left">
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="ml-2 text-gray-400 hover:text-red-500">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div>
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-600">คลิกหรือลากไฟล์ PDF มาวางที่นี่</p>
              <p className="text-sm text-gray-400 mt-1">รองรับเฉพาะ PDF ขนาดไม่เกิน 50 MB</p>
            </div>
          )}
        </div>

        {/* Form fields */}
        <div className="card space-y-4">
          <div className="form-group">
            <label className="label">ชื่อเรื่อง <span className="text-red-500">*</span></label>
            <input className="input" placeholder="ชื่อเรื่องเอกสาร" value={form.title} onChange={set('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">เลขที่เอกสารภายนอก</label>
              <input className="input" placeholder="เลขที่หนังสือ / ใบขอ" value={form.incoming_no} onChange={set('incoming_no')} />
            </div>
            <div className="form-group">
              <label className="label">จาก / ผู้ส่ง</label>
              <input className="input" placeholder="ชื่อผู้ส่ง / หน่วยงาน" value={form.sender} onChange={set('sender')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">วันที่รับเอกสาร</label>
              <input type="date" className="input" value={form.received_date} onChange={set('received_date')} />
            </div>
            <div className="form-group">
              <label className="label">ประเภทเอกสาร</label>
              <select className="select" value={form.document_type} onChange={set('document_type')}>
                {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">ความเร่งด่วน</label>
              <select className="select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">บันทึกย่อ / สรุปเนื้อหา</label>
            <textarea
              className="input resize-none h-24"
              placeholder="สรุปเนื้อหาเอกสาร (ถ้ามี)"
              value={form.summary}
              onChange={set('summary')}
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <SparklesIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              ระบบจะวิเคราะห์ข้อความ OCR จากไฟล์ PDF และมอบหมายงานให้หน่วยงานที่เกี่ยวข้องโดยอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate('/documents')}>
            ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังอัปโหลดและวิเคราะห์...
              </span>
            ) : 'อัปโหลดเอกสาร'}
          </button>
        </div>
      </form>
    </div>
  )
}
