import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import {
  HomeIcon, DocumentTextIcon, CloudArrowUpIcon,
  ClipboardDocumentCheckIcon, ListBulletIcon,
  UserIcon, UsersIcon, Cog6ToothIcon,
  ArrowRightOnRectangleIcon, BriefcaseIcon,
  FingerPrintIcon, BookOpenIcon,
} from '@heroicons/react/24/outline'

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
    }
  >
    <Icon className="w-5 h-5 flex-shrink-0" />
    <span>{label}</span>
  </NavLink>
)

export default function Sidebar() {
  const { user, logout, hasRole } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isChief      = hasRole('admin', 'chief')
  const isAdmin      = hasRole('admin')
  const isAdminStaff = hasRole('admin', 'admin_staff')

  return (
    <aside className="w-64 min-h-screen bg-primary-900 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-primary-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ระบบเอกสาร</p>
            <p className="text-blue-300 text-xs">ศูนย์คอมพิวเตอร์</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/dashboard" icon={HomeIcon} label="แดชบอร์ด" />

        <div className="pt-3 pb-1">
          <p className="text-xs text-blue-400 uppercase font-semibold px-3">เอกสาร</p>
        </div>
        <NavItem to="/documents" icon={DocumentTextIcon} label="รายการเอกสาร" />
        {isAdminStaff && (
          <NavItem to="/documents/upload" icon={CloudArrowUpIcon} label="อัปโหลดเอกสาร" />
        )}
        {isChief && (
          <NavItem to="/chief-review" icon={ClipboardDocumentCheckIcon} label="รอพิจารณา (Chief)" />
        )}

        <div className="pt-3 pb-1">
          <p className="text-xs text-blue-400 uppercase font-semibold px-3">งาน</p>
        </div>
        <NavItem to="/my-tasks" icon={BriefcaseIcon} label="งานของฉัน" />
        {isChief && (
          <NavItem to="/tasks" icon={ListBulletIcon} label="งานทั้งหมด" />
        )}

        {isChief && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs text-blue-400 uppercase font-semibold px-3">จัดการ</p>
            </div>
            <NavItem to="/routing-rules" icon={Cog6ToothIcon} label="กฎ Routing" />
            <NavItem to="/signatures" icon={FingerPrintIcon} label="ลายเซ็น" />
          </>
        )}

        {isAdmin && (
          <NavItem to="/users" icon={UsersIcon} label="จัดการผู้ใช้" />
        )}

        <div className="pt-3 pb-1">
          <p className="text-xs text-blue-400 uppercase font-semibold px-3">ข้อมูล</p>
        </div>
        <NavItem to="/manual" icon={BookOpenIcon} label="คู่มือ / เอกสารระบบ" />
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-primary-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-800/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-blue-300 text-xs truncate">{user?.department_name || user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}
