import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReportsBetween, listSchedulesBetween } from '../data'
import { CHECKLIST } from '../constants'
import { usePersonnel } from '../personnel-context'
import { scheduleFor } from '../roster'
import {
  daysInMonth,
  downloadCsv,
  errorMessage,
  formatThaiDate,
  formatThaiMonth,
  monthRange,
  sameName,
  thisMonthStr,
  todayStr,
} from '../utils'

const percent = (n, d) => (d ? Math.round((n / d) * 100) : 0)

/**
 * สรุปการปฏิบัติหน้าที่ของครูแต่ละคนในเดือน: วันที่มีเวร (ถึงวันนี้), ส่งรายงานแล้ว,
 * วันที่ขาดรายงาน และสัดส่วนหน้าที่ที่ติ๊กว่าปฏิบัติ
 */
function summarize(month, schedules, reports, roster) {
  const today = todayStr()
  const rows = []
  const rowFor = (name) => {
    let row = rows.find((r) => sameName(r.name, name))
    if (!row) {
      row = { name, due: [], reported: [], missing: [], extra: 0, checked: 0, possible: 0, incidents: 0 }
      rows.push(row)
    }
    return row
  }

  daysInMonth(month)
    .filter((d) => d <= today)
    .forEach((date) => {
      scheduleFor(date, schedules, roster).teachers.forEach((t) => {
        const row = rowFor(t.name)
        row.due.push(date)
        const has = reports.some((r) => r.date === date && sameName(r.teacherName, t.name))
        if (has) row.reported.push(date)
        else row.missing.push(date)
      })
    })

  reports.forEach((r) => {
    const row = rowFor(r.teacherName)
    if (!row.due.includes(r.date)) row.extra += 1
    row.checked += CHECKLIST.filter((c) => r.checklist?.[c.id]).length
    row.possible += CHECKLIST.length
    if (r.incidents && r.incidents.trim() !== 'ปกติ') row.incidents += 1
  })

  return rows.sort((a, b) => b.due.length - a.due.length || a.name.localeCompare(b.name, 'th'))
}

export default function Summary() {
  const { roster } = usePersonnel()
  const [month, setMonth] = useState(thisMonthStr)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!month) return
    let active = true
    setData(null)
    setError('')
    const [start, end] = monthRange(month)
    Promise.all([listSchedulesBetween(start, end), listReportsBetween(start, end)])
      .then(([schedules, reports]) => active && setData({ schedules, reports }))
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [month])

  const rows = useMemo(
    () => (data ? summarize(month, data.schedules, data.reports, roster) : []),
    [data, month, roster],
  )

  const totals = useMemo(() => {
    const due = rows.reduce((s, r) => s + r.due.length, 0)
    const reported = rows.reduce((s, r) => s + r.reported.length, 0)
    return { due, reported, missing: due - reported, incidents: rows.reduce((s, r) => s + r.incidents, 0) }
  }, [rows])

  const exportCsv = () => {
    const header = ['ครู', 'วันที่มีเวร', 'ส่งรายงาน', 'ขาดรายงาน', 'ร้อยละที่ส่ง', 'ปฏิบัติหน้าที่ (ร้อยละ)', 'รายงานนอกวันเวร', 'เหตุการณ์ที่บันทึก', 'วันที่ขาดรายงาน']
    const body = rows.map((r) => [
      r.name,
      r.due.length,
      r.reported.length,
      r.missing.length,
      percent(r.reported.length, r.due.length),
      percent(r.checked, r.possible),
      r.extra,
      r.incidents,
      r.missing.map((d) => formatThaiDate(d, false)).join(' / '),
    ])
    downloadCsv(`สรุปการปฏิบัติหน้าที่-${month}.csv`, [header, ...body])
  }

  return (
    <div className="card stack">
      <h1>สรุปการปฏิบัติหน้าที่ของครู</h1>
      <div className="filters">
        <label className="field">
          <span>เดือน</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <span className="spacer" />
        <button className="btn btn-light" onClick={exportCsv} disabled={!rows.length}>
          ดาวน์โหลด Excel (CSV)
        </button>
      </div>

      {month && (
        <div className="stats">
          <div><strong>{totals.due}</strong><span>เวรทั้งหมด (ถึงวันนี้) {formatThaiMonth(month)}</span></div>
          <div><strong>{totals.reported}</strong><span>ส่งรายงานแล้ว ({percent(totals.reported, totals.due)}%)</span></div>
          <div><strong>{totals.missing}</strong><span>ยังไม่ส่งรายงาน</span></div>
          <div><strong>{totals.incidents}</strong><span>รายงานที่มีเหตุการณ์</span></div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {!data && !error && <p>กำลังโหลด...</p>}
      {data && rows.length === 0 && <p className="muted">ไม่มีเวรในเดือนนี้</p>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ครู</th>
                <th>วันที่มีเวร</th>
                <th>ส่งรายงาน</th>
                <th>ปฏิบัติหน้าที่</th>
                <th>เหตุการณ์</th>
                <th>วันที่ยังไม่ส่งรายงาน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className={r.missing.length ? 'row-pending' : ''}>
                  <td>
                    <Link to={`/admin/reports?teacher=${encodeURIComponent(r.name)}&month=${month}`}>{r.name}</Link>
                  </td>
                  <td>{r.due.length}</td>
                  <td>
                    {r.reported.length}/{r.due.length} ({percent(r.reported.length, r.due.length)}%)
                    {r.extra > 0 && <div className="muted small">นอกวันเวร {r.extra}</div>}
                  </td>
                  <td>{r.possible ? `${percent(r.checked, r.possible)}%` : '-'}</td>
                  <td>{r.incidents || '-'}</td>
                  <td className="small">
                    {r.missing.length ? r.missing.map((d) => formatThaiDate(d, false)).join(', ') : <span className="muted">ครบ</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        &quot;ปฏิบัติหน้าที่&quot; คือสัดส่วนหน้าที่ที่ติ๊กว่าปฏิบัติในรายงานทั้งหมดของครูคนนั้น
        คลิกชื่อครูเพื่อดูรายงานการทำเวรของครูคนนั้น
      </p>
    </div>
  )
}
