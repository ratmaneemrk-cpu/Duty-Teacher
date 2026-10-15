import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReportsBetween } from '../data'
import { CHECKLIST, STATUS, shiftLabel } from '../constants'
import { downloadCsv, errorMessage, formatThaiDate, formatThaiMonth, monthRange, thisMonthStr } from '../utils'
import StatusBadge from '../components/StatusBadge'

export default function AllReports() {
  const [month, setMonth] = useState(thisMonthStr)
  const [statusFilter, setStatusFilter] = useState('')
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!month) return
    let active = true
    setReports(null)
    setError('')
    const [start, end] = monthRange(month)
    listReportsBetween(start, end)
      .then((r) => active && setReports(r))
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [month])

  const shown = useMemo(
    () => (reports ?? []).filter((r) => !statusFilter || r.status === statusFilter),
    [reports, statusFilter],
  )

  const summary = useMemo(
    () => ({
      total: shown.length,
      late: shown.reduce((s, r) => s + (r.studentsLate ?? 0), 0),
      absent: shown.reduce((s, r) => s + (r.studentsAbsent ?? 0), 0),
      pending: shown.filter((r) => r.status === 'submitted').length,
    }),
    [shown],
  )

  const exportCsv = () => {
    const header = [
      'วันที่', 'ช่วงเวลา', 'ครูเวร', 'อีเมล',
      ...CHECKLIST.map((c) => c.label),
      'มาสาย', 'ขาดเรียน', 'เหตุการณ์', 'การแก้ไข', 'ข้อเสนอแนะ', 'สถานะ', 'ความเห็นผู้บริหาร',
    ]
    const rows = [...shown].reverse().map((r) => [
      r.date, shiftLabel(r.shift), r.teacherName, r.teacherEmail,
      ...CHECKLIST.map((c) => (r.checklist?.[c.id] ? '✓' : '')),
      r.studentsLate ?? 0, r.studentsAbsent ?? 0, r.incidents, r.actions, r.suggestions,
      STATUS[r.status] ?? r.status, r.adminComment ?? '',
    ])
    downloadCsv(`รายงานเวร-${month}.csv`, [header, ...rows])
  }

  return (
    <div className="card stack">
      <h1>รายงานเวรทั้งหมด</h1>
      <div className="filters">
        <label className="field">
          <span>เดือน</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="field">
          <span>สถานะ</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <button className="btn btn-light" onClick={exportCsv} disabled={!shown.length}>
          ดาวน์โหลด Excel (CSV)
        </button>
      </div>

      {month && (
        <div className="stats">
          <div><strong>{summary.total}</strong><span>รายงาน ({formatThaiMonth(month)})</span></div>
          <div><strong>{summary.pending}</strong><span>รอรับทราบ</span></div>
          <div><strong>{summary.late}</strong><span>นักเรียนมาสายรวม</span></div>
          <div><strong>{summary.absent}</strong><span>นักเรียนขาดเรียนรวม</span></div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {!reports && !error && <p>กำลังโหลด...</p>}
      {reports && shown.length === 0 && <p className="muted">ไม่มีรายงาน</p>}
      {shown.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ช่วงเวลา</th>
                <th>ครูเวร</th>
                <th>มาสาย</th>
                <th>รูป</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/reports/${r.id}`}>{formatThaiDate(r.date, false)}</Link></td>
                  <td>{shiftLabel(r.shift)}</td>
                  <td>{r.teacherName}</td>
                  <td>{r.studentsLate ?? 0}</td>
                  <td>{r.photoCount || '-'}</td>
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
