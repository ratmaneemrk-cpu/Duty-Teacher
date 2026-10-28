import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { listMyReports, listReportsBetween, listSchedulesBetween } from '../data'
import { shiftLabel } from '../constants'
import { scheduleFor } from '../roster'
import { errorMessage, formatThaiDate, parseDateStr, sameName, toDateStr, todayStr } from '../utils'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth()
  const [schedules, setSchedules] = useState({})
  const [myToday, setMyToday] = useState([])
  const [allToday, setAllToday] = useState([])
  const [error, setError] = useState('')
  const today = todayStr()

  useEffect(() => {
    const end = parseDateStr(today)
    end.setDate(end.getDate() + 14)
    const load = async () => {
      try {
        const [sch, mine] = await Promise.all([
          listSchedulesBetween(today, toDateStr(end)),
          listMyReports(user.uid),
        ])
        setSchedules(sch)
        setMyToday(mine.filter((r) => r.date === today))
        if (isAdmin) setAllToday(await listReportsBetween(today, today))
      } catch (err) {
        setError(errorMessage(err))
      }
    }
    load()
  }, [today, user.uid, isAdmin])

  const isMe = (t) => sameName(t.name, profile.displayName)
  const todaySchedule = scheduleFor(today, schedules)
  const todayTeachers = todaySchedule.teachers
  const myUpcoming = Array.from({ length: 14 }, (_, i) => {
    const d = parseDateStr(today)
    d.setDate(d.getDate() + i + 1)
    return scheduleFor(toDateStr(d), schedules)
  }).filter((s) => s.teachers.some(isMe))
  const onDutyToday = todayTeachers.some(isMe)

  return (
    <div className="stack">
      <section className="card hero">
        <div>
          <h1>สวัสดี {profile.displayName}</h1>
          <p className="muted">{formatThaiDate(today)}</p>
          {onDutyToday && <p className="highlight">วันนี้คุณเป็นครูเวรประจำวัน</p>}
        </div>
        <Link className="btn btn-primary btn-lg" to="/reports/new">+ เขียนรายงานเวร</Link>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <section className="card">
          <h2>ครูเวรวันนี้</h2>
          {todayTeachers.length ? (
            <ul className="plain-list">
              {todayTeachers.map((t) => (
                <li key={t.name}>
                  {t.name}
                  {t.head && <strong> (หัวหน้าครูเวร)</strong>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">วันนี้ไม่มีเวร</p>
          )}
          {todaySchedule.note && <p className="note">หมายเหตุ: {todaySchedule.note}</p>}
        </section>

        <section className="card">
          <h2>เวรของฉันใน 14 วันข้างหน้า</h2>
          {myUpcoming.length ? (
            <ul className="plain-list">
              {myUpcoming.map((s) => (
                <li key={s.date}>{formatThaiDate(s.date)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">ไม่มีเวร</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>รายงานของฉันวันนี้</h2>
        {myToday.length ? (
          <ul className="plain-list">
            {myToday.map((r) => (
              <li key={r.id}>
                <Link to={`/reports/${r.id}`}>{shiftLabel(r.shift)}</Link> <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">ยังไม่ได้ส่งรายงานวันนี้</p>
        )}
      </section>

      {isAdmin && (
        <section className="card">
          <h2>รายงานทั้งหมดวันนี้ ({allToday.length})</h2>
          {allToday.length ? (
            <ul className="plain-list">
              {allToday.map((r) => (
                <li key={r.id}>
                  <Link to={`/reports/${r.id}`}>
                    {r.teacherName} — {shiftLabel(r.shift)}
                  </Link>{' '}
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">ยังไม่มีรายงาน</p>
          )}
        </section>
      )}
    </div>
  )
}
