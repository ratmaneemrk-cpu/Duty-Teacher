import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listReportsBetween } from '../data'
import { CHECKLIST, STATUS, shiftLabel } from '../constants'
import { downloadCsv, errorMessage, formatThaiDate, formatThaiMonth, monthRange, sameName, thisMonthStr } from '../utils'
import StatusBadge from '../components/StatusBadge'
import PhotoCleanup from '../components/PhotoCleanup'

export default function AllReports() {
  // เปิดจากหน้าสรุปได้ด้วย ?teacher=ชื่อ&month=YYYY-MM
  const [params] = useSearchParams()
  const [month, setMonth] = useState(() => params.get('month') || thisMonthStr())
  const [statusFilter, setStatusFilter] = useState('')
  const [teacher, setTeacher] = useState(() => params.get('teacher') ?? '')
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
    () =>
      (reports ?? []).filter(
        (r) => (!statusFilter || r.status === statusFilter) && (!teacher || sameName(r.teacherName, teacher)),
      ),
    [reports, statusFilter, teacher],
  )

  const teachers = useMemo(() => {
    const names = []
    ;[...(teacher ? [teacher] : []), ...(reports ?? []).map((r) => r.teacherName)].forEach((n) => {
      if (n && !names.some((o) => sameName(o, n))) names.push(n)
    })
    return names.sort((a, b) => a.localeCompare(b, 'th'))
  }, [reports, teacher])

  const summary = useMemo(
    () => ({
      total: shown.length,
      pending: shown.filter((r) => r.status === 'submitted').length,
    }),
    [shown],
  )

  const exportCsv = () => {
    const header = [
      'วันที่', 'ช่วงเวลา', 'ครูเวร', 'ชื่อผู้ใช้งาน',
      ...CHECKLIST.map((c) => c.label),
      'อื่นๆ ที่ได้รับมอบหมาย',
      'เหตุการณ์', 'การแก้ไข', 'ข้อเสนอแนะ', 'สถานะ', 'ความเห็นผู้บริหาร',
    ]
    const rows = [...shown].reverse().map((r) => [
      r.date, shiftLabel(r.shift), r.teacherName, r.teacherUsername ?? '',
      ...CHECKLIST.map((c) => (r.checklist?.[c.id] ? '✓' : '')),
      r.otherDuty ?? '',
      r.incidents, r.actions, r.suggestions,
      STATUS[r.status] ?? r.status, r.adminComment ?? '',
    ])
    downloadCsv(`รายงานเวร-${month}.csv`, [header, ...rows])
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h1>รายงานการทำเวรของครู</h1>
        <div className="filters">
          <label className="field">
            <span>เดือน</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="field">
            <span>ครู</span>
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
              <option value="">ทุกคน</option>
              {teachers.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
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
                  <th>หน้าที่</th>
                  <th>เหตุการณ์</th>
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
                    <td>{CHECKLIST.filter((c) => r.checklist?.[c.id]).length}/{CHECKLIST.length}</td>
                    <td className="small">{r.incidents || '-'}</td>
                    <td>{r.photoCount || '-'}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PhotoCleanup />
    </div>
  )
}
