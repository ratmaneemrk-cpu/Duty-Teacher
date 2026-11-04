import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReportsBetween, listSchedulesBetween } from '../data'
import { CHECKLIST, OTHER_DUTY } from '../constants'
import { usePersonnel } from '../personnel-context'
import { scheduleFor } from '../roster'
import { errorMessage, formatThaiDate, parseDateStr, sameName, toDateStr, todayStr } from '../utils'
import StatusBadge from './StatusBadge'

function shiftDate(date, days) {
  const d = parseDateStr(date)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** รายงานผลการบันทึกเวรของวันที่เลือก: ครูเวรแต่ละคนบันทึกแล้วหรือยัง ปฏิบัติหน้าที่กี่ข้อ */
export default function DailyStatus() {
  const { roster } = usePersonnel()
  const [date, setDate] = useState(todayStr)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!date) return
    let active = true
    setData(null)
    setError('')
    Promise.all([listSchedulesBetween(date, date), listReportsBetween(date, date)])
      .then(([schedules, reports]) => active && setData({ schedules, reports }))
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [date])

  const schedule = data ? scheduleFor(date, data.schedules, roster) : null
  const reports = data?.reports ?? []
  const rows = (schedule?.teachers ?? []).map((t) => ({
    ...t,
    report: reports.find((r) => sameName(r.teacherName, t.name)),
  }))
  // ครูที่ส่งรายงานแต่ไม่อยู่ในตารางเวรวันนี้ (เช่น เวรแทน)
  const extra = reports.filter((r) => !rows.some((t) => sameName(r.teacherName, t.name)))
  const recorded = rows.filter((t) => t.report).length

  return (
    <section className="card stack">
      <div className="hero">
        <h1>ผลการบันทึกเวรประจำวัน</h1>
        <div className="date-nav">
          <button className="btn btn-light btn-sm" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="วันก่อนหน้า">
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-light btn-sm" onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="วันถัดไป">
            ›
          </button>
          {date !== todayStr() && (
            <button className="btn btn-light btn-sm" onClick={() => setDate(todayStr())}>วันนี้</button>
          )}
        </div>
      </div>
      <p className="muted">{date && formatThaiDate(date)}</p>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p>กำลังโหลด...</p>}

      {data && (
        <>
          <div className="stats">
            <div><strong>{rows.length}</strong><span>ครูเวรวันนี้</span></div>
            <div><strong>{recorded}</strong><span>บันทึกแล้ว</span></div>
            <div className={rows.length - recorded ? 'stat-warn' : ''}>
              <strong>{rows.length - recorded}</strong><span>ยังไม่บันทึก</span>
            </div>
            <div><strong>{reports.reduce((s, r) => s + (r.photoCount || 0), 0)}</strong><span>รูปภาพ</span></div>
          </div>
          {schedule.note && <p className="note">หมายเหตุ: {schedule.note}</p>}
          {rows.length === 0 && extra.length === 0 && <p className="muted">วันนี้ไม่มีเวร</p>}

          <ul className="daily-list">
            {rows.map((t) => (
              <DailyRow key={t.name} name={t.name} head={t.head} report={t.report} />
            ))}
            {extra.map((r) => (
              <DailyRow key={r.id} name={r.teacherName} report={r} extra />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function DailyRow({ name, head, report, extra }) {
  const done = report ? CHECKLIST.filter((c) => report.checklist?.[c.id]).length : 0
  return (
    <li className={report ? 'daily-item' : 'daily-item missing'}>
      <div className="daily-main">
        <div className="daily-name">
          {name}
          {head && <span className="muted small"> (หัวหน้าครูเวร)</span>}
          {extra && <span className="muted small"> (ไม่อยู่ในตารางเวรวันนี้)</span>}
        </div>
        {report ? (
          <div className="daily-detail small">
            หน้าที่ {done}/{CHECKLIST.length}
            {report.checklist?.[OTHER_DUTY.id] && ` · ${OTHER_DUTY.label}${report.otherDuty ? `: ${report.otherDuty}` : ''}`}
            {report.photoCount > 0 && ` · รูป ${report.photoCount}`}
            <div className="daily-incident">เหตุการณ์: {report.incidents || '-'}</div>
          </div>
        ) : (
          <div className="daily-detail small error">ยังไม่บันทึก</div>
        )}
      </div>
      {report && (
        <div className="daily-side">
          <StatusBadge status={report.status} />
          <Link className="btn btn-light btn-sm" to={`/reports/${report.id}`}>ดู</Link>
        </div>
      )}
    </li>
  )
}
