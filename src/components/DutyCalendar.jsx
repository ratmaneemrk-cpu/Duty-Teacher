import { useEffect, useState } from 'react'
import { useAuth } from '../auth-context'
import { usePersonnel } from '../personnel-context'
import { listMyReports, listReportsBetween, listSchedulesBetween } from '../data'
import { scheduleFor } from '../roster'
import {
  daysInMonth,
  errorMessage,
  formatThaiDate,
  formatThaiMonth,
  monthRange,
  parseDateStr,
  sameName,
  shortName,
  thisMonthStr,
  todayStr,
} from '../utils'

const WEEK_HEAD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * ปฏิทินเวรรายเดือน
 * mode="admin": ครูเวรทุกคนในแต่ละวัน พร้อมสถานะการบันทึก เลือกดูครูทีละคนได้
 * mode="mine": วันเวรของฉัน
 */
export default function DutyCalendar({ mode, onPickDate, version = 0 }) {
  const { user, profile } = useAuth()
  const { roster, personnel } = usePersonnel()
  const [month, setMonth] = useState(thisMonthStr)
  const [data, setData] = useState(null)
  const [teacher, setTeacher] = useState('')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const today = todayStr()
  const admin = mode === 'admin'

  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    const [start, end] = monthRange(month)
    Promise.all([listSchedulesBetween(start, end), admin ? listReportsBetween(start, end) : listMyReports(user.uid)])
      .then(([schedules, reports]) => active && setData({ schedules, reports }))
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [month, admin, user.uid, version])

  const days = daysInMonth(month)
  const blanks = parseDateStr(days[0]).getDay()
  // ครูที่สนใจ: ของฉัน หรือครูที่ผู้ดูแลเลือก (ว่าง = ทุกคน)
  const focus = admin ? teacher : profile.displayName
  const teacherOptions = (personnel?.length ? personnel.filter((p) => p.dutyDay > 0).map((p) => p.name) : roster.names)

  const dayInfo = (date) => {
    const s = scheduleFor(date, data?.schedules ?? {}, roster)
    const reports = data?.reports ?? []
    const teachers = s.teachers.map((t) => ({
      ...t,
      recorded: reports.some((r) => r.date === date && sameName(r.teacherName, t.name)),
    }))
    const shown = focus ? teachers.filter((t) => sameName(t.name, focus)) : teachers
    return { schedule: s, teachers, shown }
  }

  const selectedInfo = selected && data ? dayInfo(selected) : null

  return (
    <section className="card stack">
      <div className="hero">
        <h2>{admin ? 'ปฏิทินเวรครู' : 'ปฏิทินเวรของฉัน'}</h2>
        <div className="date-nav">
          <button className="btn btn-light btn-sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="เดือนก่อน">‹</button>
          <strong className="cal-month">{formatThaiMonth(month)}</strong>
          <button className="btn btn-light btn-sm" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="เดือนถัดไป">›</button>
        </div>
      </div>

      {admin && (
        <label className="field">
          <span>ดูเวรของครู</span>
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">ทุกคน</option>
            {teacherOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <div className="calendar">
        {WEEK_HEAD.map((d) => (
          <div key={d} className="cal-head">{d}</div>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`b${i}`} className="cal-blank" />
        ))}
        {days.map((date) => {
          const { shown } = dayInfo(date)
          const past = date <= today
          const dow = parseDateStr(date).getDay()
          const recorded = shown.filter((t) => t.recorded).length
          const cls = [
            'cal-day',
            (dow === 0 || dow === 6) && 'weekend',
            date === today && 'today',
            shown.length > 0 && 'duty',
            shown.length > 0 && past && recorded < shown.length && 'missing',
            shown.length > 0 && past && recorded === shown.length && 'done',
            selected === date && 'selected',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={date} type="button" className={cls} onClick={() => setSelected(selected === date ? null : date)}>
              <span className="cal-num">{Number(date.slice(8))}</span>
              {data && shown.length > 0 && (
                <span className="cal-info">
                  {focus ? (
                    <span>{past ? (recorded ? '✓ บันทึก' : 'ยังไม่บันทึก') : 'เวร'}</span>
                  ) : (
                    <>
                      <span className="cal-count">{past ? `${recorded}/${shown.length}` : `${shown.length} คน`}</span>
                      <span className="cal-names">{shown.map((t) => shortName(t.name)).join(', ')}</span>
                    </>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="cal-legend small muted">
        <span><i className="dot duty" /> มีเวร</span>
        <span><i className="dot done" /> บันทึกครบ</span>
        <span><i className="dot missing" /> ยังไม่บันทึก</span>
      </div>

      {selectedInfo && (
        <div className="cal-detail">
          <strong>{formatThaiDate(selected)}</strong>
          {selectedInfo.teachers.length ? (
            <ul className="plain-list">
              {selectedInfo.teachers.map((t) => (
                <li key={t.name}>
                  {t.name}
                  {t.head && <span className="muted"> (หัวหน้าครูเวร)</span>}
                  {(admin || sameName(t.name, profile.displayName)) && selected <= today && (
                    <span className={t.recorded ? 'ok' : 'error'}> — {t.recorded ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">ไม่มีเวร</p>
          )}
          {selectedInfo.schedule.note && <p className="note">หมายเหตุ: {selectedInfo.schedule.note}</p>}
          {onPickDate &&
            selected <= today &&
            selectedInfo.teachers.some((t) => sameName(t.name, profile.displayName) && !t.recorded) && (
              <button className="btn btn-primary btn-sm" onClick={() => onPickDate(selected)}>
                {selected === today ? 'บันทึกเวรวันนี้' : 'บันทึกย้อนหลัง'}
              </button>
            )}
        </div>
      )}
    </section>
  )
}
