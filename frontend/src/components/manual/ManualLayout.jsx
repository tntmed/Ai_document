import { useState, useRef } from 'react'
import { MagnifyingGlassIcon, PrinterIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import ManualSection from './ManualSection'
import { manualSections, MANUAL_META } from '../../data/manualContent'

export default function ManualLayout() {
  const [activeId, setActiveId] = useState(manualSections[0].id)
  const [search, setSearch] = useState('')
  const [printAll, setPrintAll] = useState(false)
  const printAllRef = useRef(null)

  const filtered = search.trim()
    ? manualSections.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.shortDesc.toLowerCase().includes(search.toLowerCase())
      )
    : manualSections

  const activeSection = manualSections.find(s => s.id === activeId) || manualSections[0]

  const handlePrintAll = () => {
    setPrintAll(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintAll(false), 500)
    }, 300)
  }

  const handleSelect = (id) => {
    setActiveId(id)
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside className="print:hidden w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-100 bg-primary-50">
          <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider mb-1">คู่มือ / เอกสารระบบ</p>
          <p className="text-sm font-bold text-primary-900">{MANUAL_META.systemName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{MANUAL_META.department}</p>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              className="input pl-8 pr-8 text-sm py-2"
              placeholder="ค้นหาหัวข้อ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {search && (
            <p className="text-xs text-gray-400 mt-1 px-1">พบ {filtered.length} รายการ</p>
          )}
        </div>

        {/* Section list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">ไม่พบรายการ</p>
          ) : (
            filtered.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => handleSelect(sec.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-gray-50
                  ${activeId === sec.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''}`}
              >
                <span className="flex-shrink-0 text-base mt-0.5">{sec.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-mono text-gray-400">{manualSections.indexOf(sec) + 1}.</span>
                    <p className={`text-sm font-medium truncate ${activeId === sec.id ? 'text-primary-700' : 'text-gray-800'}`}>
                      {sec.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{sec.code}</p>
                </div>
              </button>
            ))
          )}
        </nav>

        {/* Sidebar footer actions */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          <button onClick={handlePrintAll} className="btn-secondary btn-sm w-full justify-center flex items-center gap-1.5">
            <PrinterIcon className="w-4 h-4" />
            พิมพ์คู่มือทั้งหมด
          </button>
          <button onClick={handlePrintAll} className="btn-secondary btn-sm w-full justify-center flex items-center gap-1.5">
            <DocumentArrowDownIcon className="w-4 h-4" />
            ส่งออก PDF (ทั้งหมด)
          </button>
          <p className="text-xs text-gray-400 text-center">เลือก "Save as PDF" ในกล่องพิมพ์</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top action bar */}
        <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">คู่มือ</span>
            <span>/</span>
            <span className="font-medium text-gray-800">{activeSection.title}</span>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{activeSection.code}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary btn-sm flex items-center gap-1.5">
              <PrinterIcon className="w-4 h-4" />
              พิมพ์หน้านี้
            </button>
            <button onClick={handlePrintAll} className="btn-secondary btn-sm flex items-center gap-1.5">
              <DocumentArrowDownIcon className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Section content */}
        <div className="px-6 py-6 max-w-4xl">
          {printAll ? (
            /* Print all: render every section */
            <div ref={printAllRef} className="space-y-16">
              {manualSections.map((sec, i) => (
                <div key={sec.id} className={i > 0 ? 'print:break-before-page' : ''}>
                  <ManualSection section={sec} />
                </div>
              ))}
            </div>
          ) : (
            <ManualSection section={activeSection} />
          )}
        </div>
      </main>
    </div>
  )
}
