import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getMySignatures, uploadSignature, deleteSignature,
  stampDocument, getDocumentPdfVersions,
} from '../api/signatures'
import { getDocuments } from '../api/documents'
import Modal from '../components/Modal'
import { formatDateTime } from '../utils/statusUtils'
import {
  PlusIcon, TrashIcon, CheckBadgeIcon, ArrowDownTrayIcon,
  DocumentIcon, FingerPrintIcon,
} from '@heroicons/react/24/outline'

const STAMP_TEXTS = ['เห็นชอบ', 'อนุมัติ', 'รับทราบ', 'ลงนาม', 'ผู้อำนวยการ', '']
const VERSION_TYPES = [
  { value: 'SIGNED',   label: 'ลงนาม (SIGNED)' },
  { value: 'APPROVED', label: 'อนุมัติ (APPROVED)' },
  { value: 'FINAL',    label: 'ฉบับสุดท้าย (FINAL)' },
]

// ─── My Signatures tab ────────────────────────────────────────────────────────

function MySignaturesTab() {
  const fileRef = useRef()
  const [sigs, setSigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ signature_name: '', is_default: false })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const reload = () => {
    setLoading(true)
    getMySignatures().then(setSigs).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('กรุณาเลือกไฟล์รูปภาพ'); return }
    if (f.size > 5 * 1024 * 1024) { toast.error('ขนาดไฟล์ต้องไม่เกิน 5 MB'); return }
    setFile(f)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('กรุณาเลือกไฟล์ลายเซ็น'); return }
    if (!form.signature_name.trim()) { toast.error('กรุณากรอกชื่อลายเซ็น'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('signature_name', form.signature_name.trim())
      fd.append('is_default', String(form.is_default))
      await uploadSignature(fd)
      toast.success('อัปโหลดลายเซ็นเรียบร้อย')
      setShowForm(false)
      setFile(null)
      setForm({ signature_name: '', is_default: false })
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteSignature(deleteId)
      toast.success('ลบลายเซ็นแล้ว')
      setDeleteId(null)
      reload()
    } catch {}
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{sigs.length} ลายเซ็น</p>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <PlusIcon className="w-4 h-4" /> อัปโหลดลายเซ็นใหม่
        </button>
      </div>

      {/* Upload form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="อัปโหลดลายเซ็น">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="form-group">
            <label className="label">ชื่อลายเซ็น <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="เช่น ลายเซ็นผู้อำนวยการ"
              value={form.signature_name}
              onChange={e => setForm(p => ({ ...p, signature_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">ไฟล์รูปลายเซ็น <span className="text-red-500">*</span></label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary-400'}`}
              onClick={() => fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              {file ? (
                <div>
                  {file.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="max-h-32 mx-auto mb-2 rounded border border-gray-200 object-contain bg-white p-1"
                    />
                  )}
                  <p className="text-sm font-medium text-green-700">{file.name}</p>
                  <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <FingerPrintIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">คลิกเพื่อเลือกรูปลายเซ็น (PNG / JPG / SVG)</p>
                  <p className="text-xs text-gray-400 mt-1">ขนาดไม่เกิน 5 MB</p>
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.is_default}
              onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
            />
            <span className="text-sm font-medium text-gray-700">ตั้งเป็นค่าเริ่มต้น</span>
          </label>

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="ยืนยันการลบ" size="sm">
        <p className="text-sm text-gray-600 mb-4">ต้องการลบลายเซ็นนี้? การลบไม่สามารถเรียกคืนได้</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>ยกเลิก</button>
          <button className="btn-danger" onClick={handleDelete}>ลบลายเซ็น</button>
        </div>
      </Modal>

      {/* Signatures grid */}
      {sigs.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FingerPrintIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>ยังไม่มีลายเซ็น</p>
          <p className="text-xs mt-1">คลิก "อัปโหลดลายเซ็นใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sigs.map(sig => (
            <div key={sig.id} className={`card relative group ${sig.is_default ? 'ring-2 ring-primary-400' : ''}`}>
              {sig.is_default && (
                <span className="absolute top-3 right-3 badge bg-primary-100 text-primary-700 flex items-center gap-1">
                  <CheckBadgeIcon className="w-3 h-3" /> ค่าเริ่มต้น
                </span>
              )}

              {/* Signature preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-center justify-center min-h-[100px]">
                <img
                  src={sig.image_path}
                  alt={sig.signature_name}
                  className="max-h-24 max-w-full object-contain"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>

              <p className="font-semibold text-gray-800 text-sm mb-1">{sig.signature_name}</p>
              <p className="text-xs text-gray-400 mb-3">{formatDateTime(sig.created_at)}</p>

              <div className="flex gap-2">
                <a
                  href={sig.image_path}
                  download
                  className="btn-secondary btn-sm flex-1 justify-center"
                >
                  <ArrowDownTrayIcon className="w-3 h-3" /> ดาวน์โหลด
                </a>
                <button
                  className="btn-danger btn-sm"
                  onClick={() => setDeleteId(sig.id)}
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stamp Document tab ───────────────────────────────────────────────────────

function StampDocumentTab({ initialDocId }) {
  const [sigs, setSigs] = useState([])
  const [docs, setDocs] = useState([])
  const [docSearch, setDocSearch] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [versions, setVersions] = useState([])
  const [loadingSigs, setLoadingSigs] = useState(true)
  const [stamping, setStamping] = useState(false)
  const [result, setResult] = useState(null)

  const [form, setForm] = useState({
    signature_id: '',
    page_number: 1,
    x_position: 380,
    y_position: 730,
    width: 150,
    height: 60,
    stamp_text: 'เห็นชอบ',
    version_type: 'SIGNED',
    is_final: false,
  })

  useEffect(() => {
    getMySignatures()
      .then(s => {
        setSigs(s)
        const def = s.find(x => x.is_default) || s[0]
        if (def) setForm(p => ({ ...p, signature_id: String(def.id) }))
      })
      .finally(() => setLoadingSigs(false))
  }, [])

  // If doc id passed via query param, load it
  useEffect(() => {
    if (initialDocId) {
      getDocuments({ page: 1, limit: 1 })
        .then(() => {
          // We'll just store the ID and let user confirm
          setSelectedDoc({ id: parseInt(initialDocId), document_no: `#${initialDocId}`, title: 'กำลังโหลด...' })
          getDocumentPdfVersions(initialDocId).then(setVersions)
        })
    }
  }, [initialDocId])

  const searchDocs = async () => {
    if (!docSearch.trim()) return
    const data = await getDocuments({ search: docSearch, limit: 10 })
    setDocs(data.items || [])
  }

  const selectDoc = async (doc) => {
    setSelectedDoc(doc)
    setDocs([])
    setDocSearch(doc.document_no)
    setResult(null)
    const vs = await getDocumentPdfVersions(doc.id)
    setVersions(vs)
  }

  const handleStamp = async (e) => {
    e.preventDefault()
    if (!selectedDoc) { toast.error('กรุณาเลือกเอกสาร'); return }
    if (!form.signature_id) { toast.error('กรุณาเลือกลายเซ็น'); return }

    setStamping(true)
    try {
      const res = await stampDocument(selectedDoc.id, {
        signature_id: parseInt(form.signature_id),
        page_number: parseInt(form.page_number),
        x_position: parseFloat(form.x_position),
        y_position: parseFloat(form.y_position),
        width: parseFloat(form.width),
        height: parseFloat(form.height),
        stamp_text: form.stamp_text || null,
        version_type: form.version_type,
        is_final: form.is_final,
      })
      setResult(res)
      toast.success('ประทับลายเซ็นเรียบร้อย')
      const vs = await getDocumentPdfVersions(selectedDoc.id)
      setVersions(vs)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'เกิดข้อผิดพลาดในการประทับลายเซ็น')
    } finally {
      setStamping(false)
    }
  }

  const set = (k) => (e) => setForm(p => ({
    ...p,
    [k]: k === 'is_final' ? e.target.checked : e.target.value,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: form */}
      <div className="space-y-4">
        {/* Document search */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">เลือกเอกสาร</h3>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="ค้นหาด้วยเลขที่หรือชื่อเรื่อง..."
              value={docSearch}
              onChange={e => setDocSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchDocs()}
            />
            <button className="btn-secondary btn-sm whitespace-nowrap" onClick={searchDocs}>
              ค้นหา
            </button>
          </div>

          {docs.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {docs.map(doc => (
                <button
                  key={doc.id}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                  onClick={() => selectDoc(doc)}
                >
                  <p className="text-xs font-mono font-semibold text-primary-600">{doc.document_no}</p>
                  <p className="text-sm text-gray-700 truncate">{doc.title}</p>
                </button>
              ))}
            </div>
          )}

          {selectedDoc && (
            <div className="mt-3 bg-primary-50 rounded-lg px-3 py-2 border border-primary-200">
              <p className="text-xs font-mono font-semibold text-primary-700">{selectedDoc.document_no}</p>
              <p className="text-sm font-medium text-gray-800">{selectedDoc.title}</p>
            </div>
          )}
        </div>

        {/* Stamp form */}
        <form onSubmit={handleStamp} className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">ตั้งค่าลายเซ็น</h3>

          {/* Signature selection */}
          {loadingSigs ? (
            <div className="text-sm text-gray-400">กำลังโหลดลายเซ็น...</div>
          ) : sigs.length === 0 ? (
            <div className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
              ยังไม่มีลายเซ็น — กรุณาอัปโหลดลายเซ็นในแท็บ "ลายเซ็นของฉัน" ก่อน
            </div>
          ) : (
            <div>
              <label className="label">เลือกลายเซ็น <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {sigs.map(sig => (
                  <label key={sig.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors
                    ${form.signature_id === String(sig.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="signature_id"
                      value={sig.id}
                      checked={form.signature_id === String(sig.id)}
                      onChange={() => setForm(p => ({ ...p, signature_id: String(sig.id) }))}
                      className="sr-only"
                    />
                    <img
                      src={sig.image_path}
                      alt={sig.signature_name}
                      className="w-12 h-10 object-contain bg-white border border-gray-100 rounded"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    <span className="text-xs font-medium text-gray-700 truncate">{sig.signature_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group mb-0">
              <label className="label">ข้อความประทับ</label>
              <select className="select text-sm" value={form.stamp_text} onChange={set('stamp_text')}>
                {STAMP_TEXTS.map(t => (
                  <option key={t} value={t}>{t || '(ไม่มีข้อความ)'}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="label">ประเภทเวอร์ชัน</label>
              <select className="select text-sm" value={form.version_type} onChange={set('version_type')}>
                {VERSION_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs text-gray-500 uppercase tracking-wider">ตำแหน่งบนหน้า PDF (หน่วย: points)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="label text-xs">หน้าที่</label>
                <input type="number" className="input text-sm" min="1" value={form.page_number} onChange={set('page_number')} />
              </div>
              <div className="form-group mb-0">
                <label className="label text-xs">X (horizontal)</label>
                <input type="number" className="input text-sm" value={form.x_position} onChange={set('x_position')} />
              </div>
              <div className="form-group mb-0">
                <label className="label text-xs">Y (vertical)</label>
                <input type="number" className="input text-sm" value={form.y_position} onChange={set('y_position')} />
              </div>
              <div className="form-group mb-0">
                <label className="label text-xs">กว้าง</label>
                <input type="number" className="input text-sm" value={form.width} onChange={set('width')} />
              </div>
              <div className="form-group mb-0">
                <label className="label text-xs">สูง</label>
                <input type="number" className="input text-sm" value={form.height} onChange={set('height')} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="is_final" className="w-4 h-4" checked={form.is_final} onChange={set('is_final')} />
                <label htmlFor="is_final" className="text-sm font-medium text-gray-700 cursor-pointer">ฉบับสุดท้าย</label>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">A4: กว้าง 595 × สูง 842 pts (0,0 = ล่างซ้าย)</p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={stamping || !selectedDoc || !form.signature_id}
          >
            <FingerPrintIcon className="w-4 h-4" />
            {stamping ? 'กำลังประทับ...' : 'ประทับลายเซ็น'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="card bg-green-50 border-green-200">
            <p className="text-sm font-semibold text-green-800 mb-2">ประทับสำเร็จ!</p>
            <a
              href={result.stamped_file_path}
              target="_blank"
              rel="noreferrer"
              className="btn-success btn-sm w-full justify-center"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> เปิดไฟล์ PDF ที่ประทับแล้ว
            </a>
          </div>
        )}
      </div>

      {/* Right: existing versions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">ประวัติการประทับลายเซ็น</h3>
        {!selectedDoc ? (
          <p className="text-sm text-gray-400">เลือกเอกสารเพื่อดูประวัติ</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีประวัติการประทับ</p>
        ) : (
          <div className="space-y-3">
            {versions.map(v => (
              <div key={v.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        v.version_type === 'FINAL'    ? 'bg-green-100 text-green-700' :
                        v.version_type === 'APPROVED' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{v.version_type}</span>
                      {v.is_final && <span className="badge bg-orange-100 text-orange-700">ฉบับสุดท้าย</span>}
                    </div>
                    {v.stamp_text && <p className="text-sm font-medium text-gray-800 mt-1">"{v.stamp_text}"</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      หน้า {v.page_number} · โดย {v.stamped_by_name}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(v.stamped_at)}</p>
                  </div>
                  <a
                    href={v.stamped_file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-sm flex-shrink-0"
                  >
                    <DocumentIcon className="w-3 h-3" /> เปิด
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Signatures() {
  const [searchParams] = useSearchParams()
  const initialDocId = searchParams.get('docId')
  const [tab, setTab] = useState(initialDocId ? 'stamp' : 'mine')

  const tabs = [
    { key: 'mine',  label: 'ลายเซ็นของฉัน' },
    { key: 'stamp', label: 'ประทับลายเซ็น' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการลายเซ็น</h1>
          <p className="page-subtitle">อัปโหลดและประทับลายเซ็นดิจิทัลบนเอกสาร PDF</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${tab === t.key
                ? 'bg-white border border-b-white text-primary-600 border-gray-200'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mine'  && <MySignaturesTab />}
      {tab === 'stamp' && <StampDocumentTab initialDocId={initialDocId} />}
    </div>
  )
}
