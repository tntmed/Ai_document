import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDocuments } from '../api/documents'
import { DocStatusBadge, PriorityBadge } from '../components/StatusBadge'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS, formatDate } from '../utils/statusUtils'
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline'
import useAuthStore from '../store/authStore'

const STATUSES = ['RECEIVED','WAIT_CHIEF_REVIEW','ASSIGNED','IN_PROGRESS','DONE_BY_SECTION','RETURNED_TO_ADMIN','CLOSED','CANCELLED']
const PRIORITY_LABELS = { LOW: 'ต่ำ', NORMAL: 'ปกติ', HIGH: 'สูง', URGENT: 'ด่วนมาก' }

export default function Documents() {
  const { hasRole } = useAuthStore()
  const [docs, setDocs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [priorityF, setPriorityF] = useState('')
  const [page, setPage]         = useState(1)
  const limit = 20

  const fetchDocs = useCallback(async (overrides = {}) => {
    setLoading(true)
    try {
      const params = {
        page:  overrides.page  ?? page,
        limit,
        ...(overrides.search   !== undefined ? { search:   overrides.search   } : search   ? { search   } : {}),
        ...(overrides.status   !== undefined ? { status:   overrides.status   } : statusF  ? { status:  statusF  } : {}),
        ...(overrides.priority !== undefined ? { priority: overrides.priority } : priorityF? { priority: priorityF} : {}),
      }
      const data = await getDocuments(params)
      setDocs(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusF, priorityF])

  // Refetch when pagination or filter dropdowns change
  useEffect(() => { fetchDocs() }, [page, statusF, priorityF])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchDocs({ page: 1, search })
  }

  const handleStatusChange = (val) => { setStatusF(val); setPage(1) }
  const handlePriorityChange = (val) => { setPriorityF(val); setPage(1) }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">รายการเอกสาร</h1>
          <p className="page-subtitle">ทั้งหมด {total} รายการ</p>
        </div>
        {hasRole('admin', 'admin_staff') && (
          <Link to="/documents/upload" className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            อัปโหลดเอกสาร
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="label">ค้นหา</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="เลขที่, ชื่อเรื่อง, ผู้ส่ง..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">สถานะ</label>
            <select className="select" value={statusF} onChange={e => handleStatusChange(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{DOC_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">ความเร่งด่วน</label>
            <select className="select" value={priorityF} onChange={e => handlePriorityChange(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary">
            <FunnelIcon className="w-4 h-4" /> ค้นหา
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">ไม่พบเอกสาร</div>
        ) : (
          <>
            <div className="table-container rounded-xl">
              <table className="table">
                <thead>
                  <tr>
                    <th>เลขที่</th>
                    <th>ชื่อเรื่อง</th>
                    <th>ประเภท</th>
                    <th>ความเร่งด่วน</th>
                    <th>สถานะ</th>
                    <th>วันที่รับ</th>
                    <th>ผู้สร้าง</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <Link to={`/documents/${doc.id}`} className="text-primary-600 hover:underline font-semibold text-xs">
                          {doc.document_no}
                        </Link>
                        {doc.incoming_no && (
                          <p className="text-xs text-gray-400">{doc.incoming_no}</p>
                        )}
                      </td>
                      <td>
                        <Link to={`/documents/${doc.id}`} className="hover:text-primary-600 font-medium line-clamp-2 max-w-xs">
                          {doc.title}
                        </Link>
                        {doc.sender && <p className="text-xs text-gray-400">จาก: {doc.sender}</p>}
                      </td>
                      <td className="text-xs">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</td>
                      <td><PriorityBadge priority={doc.priority} /></td>
                      <td><DocStatusBadge status={doc.status} /></td>
                      <td className="text-xs text-gray-500">{formatDate(doc.received_date)}</td>
                      <td className="text-xs text-gray-500">{doc.creator_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">หน้า {page} / {totalPages} (ทั้งหมด {total} รายการ)</p>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}>← ก่อนหน้า</button>
                  <button className="btn-secondary btn-sm" disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}>ถัดไป →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
