import { formatDateTime } from '../utils/statusUtils'
import { DOC_STATUS_DOT_COLORS } from '../utils/statusUtils'

const EVENT_DOT = {
  status_change: 'bg-blue-500',
  task_created:  'bg-orange-500',
  task_status:   'bg-purple-500',
  comment:       'bg-gray-400',
}

const EVENT_ICONS = {
  status_change: '📋',
  task_created:  '📌',
  task_status:   '✅',
  comment:       '💬',
}

export default function Timeline({ entries = [] }) {
  if (!entries.length) {
    return <p className="text-sm text-gray-400 py-4">ยังไม่มีประวัติ</p>
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <div key={i} className="timeline-item">
          <div className={`timeline-dot ${EVENT_DOT[entry.event_type] || 'bg-gray-400'}`}>
            <span className="text-white text-xs">{EVENT_ICONS[entry.event_type] || '•'}</span>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">{entry.description}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {formatDateTime(entry.timestamp)}
              </span>
            </div>

            {entry.actor && (
              <p className="text-xs text-gray-500 mt-0.5">โดย: {entry.actor}</p>
            )}
            {entry.note && (
              <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                หมายเหตุ: {entry.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
