import { DOC_STATUS_LABELS, DOC_STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../utils/statusUtils'

export function DocStatusBadge({ status }) {
  const label = DOC_STATUS_LABELS[status] || status
  const color = DOC_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${color}`}>{label}</span>
}

export function TaskStatusBadge({ status }) {
  const label = TASK_STATUS_LABELS[status] || status
  const color = TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${color}`}>{label}</span>
}

export function PriorityBadge({ priority }) {
  const label = PRIORITY_LABELS[priority] || priority
  const color = PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${color}`}>{label}</span>
}
