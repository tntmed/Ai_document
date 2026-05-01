import { DEPT_COLORS } from '../utils/statusUtils'

export default function DepartmentBadge({ name }) {
  const color = DEPT_COLORS[name] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${color}`}>{name || '-'}</span>
}
