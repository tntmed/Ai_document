import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSummary, getByDepartment, getOverdueTasks } from '../api/dashboard'
import { DocStatusBadge, PriorityBadge } from '../components/StatusBadge'
import DepartmentBadge from '../components/DepartmentBadge'
import { DOC_STATUS_LABELS, formatDate } from '../utils/statusUtils'
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon,
  ExclamationTriangleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316']

function StatCard({ icon: Icon, label, value, iconBg, textColor = 'text-gray-900' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value ?? '-'}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [deptStats, setDeptStats] = useState([])
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSummary(), getByDepartment(), getOverdueTasks()])
      .then(([s, d, o]) => {
        setSummary(s)
        setDeptStats(d)
        setOverdue(o)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statusChartData = summary?.by_status
    ? Object.entries(summary.by_status).map(([k, v]) => ({
        name: DOC_STATUS_LABELS[k] || k,
        value: v,
      }))
    : []

  const deptChartData = deptStats.map((d, i) => ({
    name: d.department_name,
    งานทั้งหมด: d.total_tasks,
    เสร็จแล้ว: d.completed,
    ค้างอยู่: d.in_progress + d.assigned,
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">แดชบอร์ด</h1>
          <p className="page-subtitle">ภาพรวมระบบจัดการเอกสาร</p>
        </div>
        <Link to="/documents" className="btn-secondary btn-sm">ดูเอกสารทั้งหมด →</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DocumentTextIcon} label="เอกสารทั้งหมด" value={summary?.total_documents} iconBg="bg-blue-500" />
        <StatCard icon={ClockIcon} label="รอผู้อำนวยการพิจารณา" value={summary?.pending_chief_review} iconBg="bg-yellow-500" textColor="text-yellow-600" />
        <StatCard icon={ArrowPathIcon} label="งานที่กำลังดำเนินการ" value={summary?.active_tasks} iconBg="bg-purple-500" />
        <StatCard icon={ExclamationTriangleIcon} label="งานเกินกำหนด" value={summary?.overdue_tasks} iconBg="bg-red-500" textColor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">เอกสารตามสถานะ</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusChartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {statusChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">งานตามหน่วยงาน</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="งานทั้งหมด" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="เสร็จแล้ว" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ค้างอยู่" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department stats table */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">สรุปงานตามหน่วยงาน</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>หน่วยงาน</th>
                <th>งานทั้งหมด</th>
                <th>มอบหมายแล้ว</th>
                <th>กำลังดำเนินการ</th>
                <th>เสร็จสิ้น</th>
                <th>เกินกำหนด</th>
              </tr>
            </thead>
            <tbody>
              {deptStats.map(d => (
                <tr key={d.department_id}>
                  <td><DepartmentBadge name={d.department_name} /></td>
                  <td className="font-semibold">{d.total_tasks}</td>
                  <td>{d.assigned}</td>
                  <td>{d.in_progress}</td>
                  <td className="text-green-600 font-medium">{d.completed}</td>
                  <td>
                    {d.overdue > 0
                      ? <span className="text-red-600 font-semibold">{d.overdue}</span>
                      : <span className="text-gray-400">0</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <div className="card border-l-4 border-red-400">
          <h2 className="text-base font-semibold text-red-700 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            งานที่เกินกำหนด ({overdue.length} รายการ)
          </h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>เลขที่เอกสาร</th>
                  <th>ชื่องาน</th>
                  <th>หน่วยงาน</th>
                  <th>ผู้รับผิดชอบ</th>
                  <th>กำหนดส่ง</th>
                  <th>เกินมา</th>
                </tr>
              </thead>
              <tbody>
                {overdue.slice(0, 10).map(t => (
                  <tr key={t.task_id}>
                    <td>
                      <Link to={`/documents/${t.document_id}`} className="text-primary-600 hover:underline font-medium">
                        {t.document_no}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate">{t.task_title}</td>
                    <td><DepartmentBadge name={t.department_name} /></td>
                    <td>{t.assigned_user || <span className="text-gray-400">-</span>}</td>
                    <td>{formatDate(t.due_date)}</td>
                    <td><span className="text-red-600 font-semibold">{t.days_overdue} วัน</span></td>
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
