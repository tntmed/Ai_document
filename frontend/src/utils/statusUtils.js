// Document status
export const DOC_STATUS_LABELS = {
  RECEIVED:           'รับเรื่องแล้ว',
  WAIT_CHIEF_REVIEW:  'รอผู้อำนวยการพิจารณา',
  ASSIGNED:           'มอบหมายแล้ว',
  IN_PROGRESS:        'กำลังดำเนินการ',
  DONE_BY_SECTION:    'เสร็จสิ้นโดยหน่วยงาน',
  RETURNED_TO_ADMIN:  'ส่งคืนธุรการ',
  CLOSED:             'ปิดเรื่องแล้ว',
  CANCELLED:          'ยกเลิก',
}

export const DOC_STATUS_COLORS = {
  RECEIVED:           'bg-blue-100 text-blue-700',
  WAIT_CHIEF_REVIEW:  'bg-yellow-100 text-yellow-700',
  ASSIGNED:           'bg-orange-100 text-orange-700',
  IN_PROGRESS:        'bg-purple-100 text-purple-700',
  DONE_BY_SECTION:    'bg-green-100 text-green-700',
  RETURNED_TO_ADMIN:  'bg-teal-100 text-teal-700',
  CLOSED:             'bg-gray-100 text-gray-600',
  CANCELLED:          'bg-red-100 text-red-700',
}

export const DOC_STATUS_DOT_COLORS = {
  RECEIVED:           'bg-blue-500',
  WAIT_CHIEF_REVIEW:  'bg-yellow-500',
  ASSIGNED:           'bg-orange-500',
  IN_PROGRESS:        'bg-purple-500',
  DONE_BY_SECTION:    'bg-green-500',
  RETURNED_TO_ADMIN:  'bg-teal-500',
  CLOSED:             'bg-gray-400',
  CANCELLED:          'bg-red-500',
}

// Task status
export const TASK_STATUS_LABELS = {
  ASSIGNED:    'มอบหมายแล้ว',
  ACCEPTED:    'รับงานแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED:   'เสร็จสิ้น',
  RETURNED:    'ส่งคืน',
  CANCELLED:   'ยกเลิก',
}

export const TASK_STATUS_COLORS = {
  ASSIGNED:    'bg-blue-100 text-blue-700',
  ACCEPTED:    'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED:   'bg-green-100 text-green-700',
  RETURNED:    'bg-orange-100 text-orange-700',
  CANCELLED:   'bg-red-100 text-red-700',
}

// Priority
export const PRIORITY_LABELS = {
  LOW:    'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH:   'สูง',
  URGENT: 'ด่วนมาก',
}

export const PRIORITY_COLORS = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

// Document type
export const DOC_TYPE_LABELS = {
  MEMO:      'บันทึกข้อความ',
  LETTER:    'หนังสือ',
  ORDER:     'คำสั่ง',
  REPORT:    'รายงาน',
  REQUEST:   'คำขอ / ขออนุมัติ',
  COMPLAINT: 'ร้องเรียน',
  OTHER:     'อื่นๆ',
}

// Department colors
export const DEPT_COLORS = {
  'ธุรการ':        'bg-blue-100 text-blue-700',
  'อินเตอร์เนต':  'bg-green-100 text-green-700',
  'โปรแกรมเมอร์': 'bg-purple-100 text-purple-700',
  'ช่าง':          'bg-orange-100 text-orange-700',
}

export const DEPT_BG_COLORS = {
  'ธุรการ':        'bg-blue-500',
  'อินเตอร์เนต':  'bg-green-500',
  'โปรแกรมเมอร์': 'bg-purple-500',
  'ช่าง':          'bg-orange-500',
}

// Role labels
export const ROLE_LABELS = {
  admin:           'ผู้ดูแลระบบ',
  chief:           'ผู้อำนวยการ',
  admin_staff:     'เจ้าหน้าที่ธุรการ',
  department_head: 'หัวหน้าหน่วยงาน',
  staff:           'เจ้าหน้าที่',
  viewer:          'ผู้ดูข้อมูล',
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function getDaysOverdue(dueDateStr) {
  if (!dueDateStr) return 0
  const diff = new Date() - new Date(dueDateStr)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
