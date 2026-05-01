import { useRef } from 'react'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { MANUAL_META } from '../../data/manualContent'

const SectionHeading = ({ number, title }) => (
  <h3 className="text-sm font-bold text-primary-800 uppercase tracking-wide mt-6 mb-2 pb-1 border-b border-primary-100">
    {number}. {title}
  </h3>
)

const InfoBadge = ({ label, value, color = 'gray' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  }
  return (
    <div className={`rounded-lg px-3 py-2 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

const ScreenshotPlaceholder = ({ caption }) => (
  <div className="my-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-6 gap-2 print:border-gray-400">
    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-xl">🖼️</div>
    <p className="text-xs text-gray-500 text-center max-w-sm px-4">{caption}</p>
  </div>
)

const WarningBox = ({ text }) => (
  <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 my-2">
    <span className="text-red-500 text-base flex-shrink-0">⚠️</span>
    <p className="text-xs text-red-700 font-medium">{text}</p>
  </div>
)

const NoteBox = ({ text }) => (
  <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
    <span className="text-blue-500 text-base flex-shrink-0">ℹ️</span>
    <p className="text-xs text-blue-700">{text}</p>
  </div>
)

export default function ManualSection({ section }) {
  const [copied, setCopied] = useState(false)
  const contentRef = useRef(null)

  const handleCopy = () => {
    const text = contentRef.current?.innerText || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => window.print()

  return (
    <div ref={contentRef}>
      {/* Document Header Card */}
      <div className="card border border-primary-200 bg-primary-50 mb-6 print:border-gray-400">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span>
            <div>
              <p className="text-xs text-primary-500 font-mono font-semibold">{section.code} | Rev {section.version}</p>
              <h1 className="text-xl font-bold text-primary-900">{section.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{MANUAL_META.systemName} — {MANUAL_META.department}</p>
            </div>
          </div>
          <div className="print:hidden flex gap-2 flex-shrink-0">
            <button onClick={handleCopy} className="btn-secondary btn-sm flex items-center gap-1">
              {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
            <button onClick={handlePrint} className="btn-secondary btn-sm">🖨️ พิมพ์</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <InfoBadge label="วันที่มีผลบังคับ" value={section.effectiveDate} color="blue" />
          <InfoBadge label="วันที่ทบทวนครั้งถัดไป" value={section.reviewDate} color="green" />
          <InfoBadge label="เจ้าของเอกสาร" value={section.owner} color="gray" />
          <InfoBadge label="ผู้อนุมัติ" value={section.approver} color="gray" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            section.classification === 'CONFIDENTIAL'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            🔒 {section.classification}
          </span>
          <span className="text-xs text-gray-400">{MANUAL_META.classification}</span>
        </div>
      </div>

      {/* 1. Purpose */}
      {section.purpose && (
        <>
          <SectionHeading number="1" title="วัตถุประสงค์ (Purpose)" />
          <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg p-3 border border-gray-100">{section.purpose}</p>
        </>
      )}

      {/* 2. Scope */}
      {section.scope && (
        <>
          <SectionHeading number="2" title="ขอบเขต (Scope)" />
          <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg p-3 border border-gray-100">{section.scope}</p>
        </>
      )}

      {/* 3. Definitions */}
      {section.definitions?.length > 0 && (
        <>
          <SectionHeading number="3" title="คำนิยาม (Definitions)" />
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th className="w-1/3">คำศัพท์</th><th>ความหมาย</th></tr></thead>
              <tbody>
                {section.definitions.map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium text-primary-700">{d.term}</td>
                    <td className="text-gray-600">{d.definition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4. Responsibilities */}
      {section.responsibilities?.length > 0 && (
        <>
          <SectionHeading number="4" title="ผู้รับผิดชอบ (Responsibilities)" />
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th className="w-1/3">บทบาท</th><th>หน้าที่รับผิดชอบ</th></tr></thead>
              <tbody>
                {section.responsibilities.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium text-gray-800">{r.role}</td>
                    <td className="text-gray-600">{r.duty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Role Matrix (Section 5) */}
      {section.roleMatrix && section.roleMatrixHeaders && (
        <>
          <SectionHeading number="4.1" title="ตาราง Permission Matrix" />
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>บทบาท</th>
                  {section.roleMatrixHeaders.map(h => <th key={h.key} className="text-center">{h.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {section.roleMatrix.map((row, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-gray-800">{row.role}</td>
                    {section.roleMatrixHeaders.map(h => (
                      <td key={h.key} className="text-center">
                        <span className={row.permissions[h.key] === '✓'
                          ? 'text-green-600 font-bold'
                          : row.permissions[h.key] === '-'
                          ? 'text-gray-300'
                          : 'text-blue-600 text-xs'}>
                          {row.permissions[h.key]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5. Procedures */}
      {section.procedures?.length > 0 && (
        <>
          <SectionHeading number="5" title="ขั้นตอนการปฏิบัติ (Procedure)" />
          <div className="space-y-4">
            {section.procedures.map((proc) => (
              <div key={proc.step} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-primary-700 text-white px-4 py-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {proc.step}
                  </span>
                  <span className="text-sm font-semibold">{proc.title}</span>
                </div>
                <div className="p-4 bg-white space-y-2">
                  <p className="text-sm text-gray-700">{proc.desc}</p>
                  {proc.substeps?.length > 0 && (
                    <ol className="space-y-1 ml-2">
                      {proc.substeps.map((sub, si) => (
                        <li key={si} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center mt-0.5 font-medium">
                            {si + 1}
                          </span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {proc.note && <NoteBox text={proc.note} />}
                  {proc.warning && <WarningBox text={proc.warning} />}
                  {proc.screenshot && <ScreenshotPlaceholder caption={proc.screenshot} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6. Control Points */}
      {section.controlPoints?.length > 0 && (
        <>
          <SectionHeading number="6" title="จุดควบคุม (Control Points)" />
          <div className="space-y-2">
            {section.controlPoints.map((cp, i) => (
              <div key={i} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <span className="text-yellow-500 flex-shrink-0 mt-0.5">◆</span>
                <p className="text-sm text-yellow-900">{cp}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* UAT Checklist */}
      {section.checklistItems?.length > 0 && (
        <>
          <SectionHeading number="5.1" title="รายการทดสอบ (Test Cases)" />
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>TC ID</th>
                  <th>หมวด</th>
                  <th>รายละเอียด</th>
                  <th>ผลที่คาดหวัง</th>
                  <th>เกณฑ์</th>
                  <th className="text-center">ผล</th>
                </tr>
              </thead>
              <tbody>
                {section.checklistItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono font-semibold text-primary-700 whitespace-nowrap">{item.id}</td>
                    <td><span className="badge bg-gray-100 text-gray-700">{item.category}</span></td>
                    <td>{item.description}</td>
                    <td className="text-gray-600">{item.expected}</td>
                    <td className="text-gray-500 text-xs">{item.criteria}</td>
                    <td className="text-center">
                      <span className="inline-block w-16 border border-gray-300 rounded text-center text-xs py-0.5 text-gray-400">PASS / FAIL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* System Version History */}
      {section.systemVersions?.length > 0 && (
        <>
          <SectionHeading number="5.1" title="ประวัติเวอร์ชันระบบ (System Version History)" />
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th>Version</th><th>วันที่</th><th>ผู้ดำเนินการ</th><th>การเปลี่ยนแปลง</th><th>ผู้อนุมัติ</th></tr></thead>
              <tbody>
                {section.systemVersions.map((v, i) => (
                  <tr key={i}>
                    <td><span className="font-mono font-bold text-primary-700">{v.version}</span></td>
                    <td className="whitespace-nowrap">{v.date}</td>
                    <td>{v.author}</td>
                    <td className="text-gray-600">{v.changes}</td>
                    <td>{v.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Document Version History */}
      {section.docVersions?.length > 0 && (
        <>
          <SectionHeading number="5.2" title="ประวัติเวอร์ชันเอกสารคู่มือ" />
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead><tr><th>รหัสเอกสาร</th><th>ชื่อเอกสาร</th><th>Version</th><th>วันที่</th><th>การเปลี่ยนแปลง</th><th>ผู้จัดทำ</th></tr></thead>
              <tbody>
                {section.docVersions.map((v, i) => (
                  <tr key={i}>
                    <td className="font-mono text-primary-700 whitespace-nowrap">{v.docCode}</td>
                    <td>{v.title}</td>
                    <td className="font-semibold text-center">{v.version}</td>
                    <td className="whitespace-nowrap">{v.date}</td>
                    <td>{v.changes}</td>
                    <td>{v.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 7. References */}
      {section.references?.length > 0 && (
        <>
          <SectionHeading number="7" title="เอกสารอ้างอิง (References)" />
          <div className="space-y-1">
            {section.references.map((ref, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-400 text-xs w-4">[{i + 1}]</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 whitespace-nowrap">{ref.code}</span>
                <span className="text-gray-700 flex-1">{ref.title}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{ref.type}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 text-center">
        {MANUAL_META.systemName} | {section.code} Rev {section.version} | มีผลบังคับ {section.effectiveDate} | {MANUAL_META.classification}
      </div>
    </div>
  )
}
