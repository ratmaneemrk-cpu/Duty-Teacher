import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { listMyReports } from '../data'
import { shiftLabel } from '../constants'
import { errorMessage, formatThaiDate } from '../utils'
import StatusBadge from '../components/StatusBadge'

export default function MyReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listMyReports(user.uid)
      .then(setReports)
      .catch((err) => setError(errorMessage(err)))
  }, [user.uid])

  return (
    <div className="card stack">
      <div className="actions">
        <h1>รายงานของฉัน</h1>
        <span className="spacer" />
        <Link className="btn btn-primary" to="/reports/new">+ เขียนรายงาน</Link>
      </div>
      {error && <p className="error">{error}</p>}
      {!reports && !error && <p>กำลังโหลด...</p>}
      {reports && reports.length === 0 && <p className="muted">ยังไม่มีรายงาน</p>}
      {reports && reports.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ช่วงเวลา</th>
                <th>มาสาย</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/reports/${r.id}`}>{formatThaiDate(r.date, false)}</Link></td>
                  <td>{shiftLabel(r.shift)}</td>
                  <td>{r.studentsLate ?? 0}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
