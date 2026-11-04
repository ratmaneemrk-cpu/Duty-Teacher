import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { listMyReports, listSchedulesBetween } from '../data'
import { WEEKDAYS, shiftLabel } from '../constants'
import { scheduleFor } from '../roster'
import { usePersonnel } from '../personnel-context'
import { errorMessage, formatThaiDate, parseDateStr, sameName, toDateStr, todayStr } from '../utils'
import StatusBadge from '../components/StatusBadge'
import TodayDuty from '../components/TodayDuty'
import DailyStatus from '../components/DailyStatus'
import DutyCalendar from '../components/DutyCalendar'

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth()
  const { roster } = usePersonnel()
  const [schedules, setSchedules] = useState({})
  const [myToday, setMyToday] = useState([])
  const [error, setError] = useState('')
  // เพิ่มค่าเพื่อโหลดรายงานของฉันใหม่หลังบันทึกจากหน้าแรก
  const [reload, setReload] = useState(0)
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
      } catch (err) {
        setError(errorMessage(err))
      }
    }
    load()
  }, [today, user.uid, reload])

  const isMe = (t) => sameName(t.name, profile.displayName)
  const todaySchedule = scheduleFor(today, schedules, roster)
  const todayTeachers = todaySchedule.teachers
  const myUpcoming = Array.from({ length: 14 }, (_, i) => {
    const d = parseDateStr(today)
    d.setDate(d.getDate() + i + 1)
    return scheduleFor(toDateStr(d), schedules, roster)
  }).filter((s) => s.teachers.some(isMe))
  const onDutyToday = todayTeachers.some(isMe)
  // วันเวรประจำสัปดาห์ของฉันตามรายชื่อบุคลากร
  const myWeekdays = Object.entries(roster.weekly)
    .filter(([, names]) => names.some((n) => sameName(n, profile.displayName)))
    .map(([day]) => WEEKDAYS[day])
  const todayReport = myToday.find((r) => r.shift === 'allday') ?? myToday[0]
  // ผู้ดูแลที่ไม่มีเวร ไม่ต้องแสดงส่วนของครูเวร
  const showTeacherView = !isAdmin || onDutyToday || myWeekdays.length > 0 || myUpcoming.length > 0

  return (
    <div className="stack">
      {isAdmin && <DailyStatus />}
      {isAdmin && <DutyCalendar mode="admin" />}

      {showTeacherView && (
        <section className="card hero">
          <div>
            <h1>สวัสดี {profile.displayName}</h1>
            <p className="muted">{formatThaiDate(today)}</p>
            {myWeekdays.length > 0 && (
              <p>
                เวรประจำของคุณ: <strong>ทุกวัน{myWeekdays.join(', วัน')}</strong>
              </p>
            )}
            {onDutyToday && <p className="highlight">วันนี้คุณเป็นครูเวรประจำวัน</p>}
          </div>
          <Link className="btn btn-primary btn-lg" to="/reports/new">+ เขียนรายงานเวร</Link>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {onDutyToday && (
        <TodayDuty
          key={todayReport?.id ?? 'new'}
          date={today}
          report={todayReport}
          onSaved={() => setReload((n) => n + 1)}
        />
      )}

      {showTeacherView && (
        <div className="grid-2">
          {!isAdmin && (
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
          )}

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
        </div>
      )}

      {!isAdmin && <DutyCalendar mode="mine" />}
    </div>
  )
}
