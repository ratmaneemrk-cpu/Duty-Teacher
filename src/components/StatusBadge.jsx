import { STATUS } from '../constants'

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS[status] ?? status}</span>
}
