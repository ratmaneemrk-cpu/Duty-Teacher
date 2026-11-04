import { useEffect, useState } from 'react'
import { useAuth } from '../auth-context'
import { listMyReports, listSchedulesBetween } from '../data'
import { WEEKDAYS } from '../constants'
import { scheduleFor } from '../roster'
import { usePersonnel } from '../personnel-context'
import { errorMessage, formatThaiDate, parseDateStr, sameName, toDateStr, todayStr } from '../utils'
import TodayDuty from '../components/TodayDuty'
import DailyStatus from '../components/DailyStatus'
import DutyCalendar from '../components/DutyCalendar'

// ย้อนหลังกี่วันที่เตือนว่ายังไม่ได้บันทึกเวร
const LOOKBACK_DAYS = 30

function addDays(date, n) {
  const d = parseDateStr(date)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth()
  const { roster } = usePersonnel()
  const today = todayStr()
  const [schedules, setSchedules] = useState({})
  const [myReports, setMyReports] = useState(null)
  const [error, setError] = useState('')
  // วันที่กำลังบันทึกเวร (วันนี้ หรือวันย้อนหลังที่ลืมบันทึก)
  const [recordDate, setRecordDate] = useState(today)
  // เปิดฟอร์มเองในวันที่ไม่มีเวรตามตาราง (เวรแทน/สลับเวร/ย้อนหลัง)
  const [manual, setManual] = useState(false)
  // เพิ่มค่าเพื่อโหลดรายงานของฉันใหม่หลังบันทึก
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [sch, mine] = await Promise.all([
          listSchedulesBetween(addDays(today, -LOOKBACK_DAYS), addDays(today, 14)),
          listMyReports(user.uid),
        ])
        setSchedules(sch)
        setMyReports(mine)
      } catch (err) {
        setError(errorMessage(err))
      }
    }
    load()
  }, [today, user.uid, reload])

  const isMe = (t) => sameName(t.name, profile.displayName)
  const onDutyOn = (date) => scheduleFor(date, schedules, roster).teachers.some(isMe)
  const reportOn = (date) => {
    const list = (myReports ?? []).filter((r) => r.date === date)
    return list.find((r) => r.shift === 'allday') ?? list[0]
  }

  const todaySchedule = scheduleFor(today, schedules, roster)
  const onDutyToday = onDutyOn(today)
  const myWeekdays = Object.entries(roster.weekly)
    .filter(([, names]) => names.some((n) => sameName(n, profile.displayName)))
    .map(([day]) => WEEKDAYS[day])
  // วันเวรที่ผ่านมาแล้วแต่ยังไม่ได้บันทึก (ใหม่สุดก่อน)
  const missed = myReports
    ? Array.from({ length: LOOKBACK_DAYS }, (_, i) => addDays(today, -(i + 1))).filter(
        (d) => onDutyOn(d) && !reportOn(d),
      )
    : []
  const hasDuty = onDutyToday || myWeekdays.length > 0 || missed.length > 0
  // ผู้ดูแลที่ไม่มีเวร ไม่ต้องแสดงส่วนของครูเวร
  const showTeacherView = !isAdmin || hasDuty

  const recordReport = reportOn(recordDate)
  const showForm = myReports && (onDutyOn(recordDate) || recordReport || manual)
  const isBackdated = recordDate !== today

  const openDate = (date) => {
    setRecordDate(date)
    setManual(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaved = () => setReload((n) => n + 1)

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
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {showTeacherView && missed.length > 0 && (
        <section className="card stack missed">
          <h2>เวรที่ยังไม่ได้บันทึก ({missed.length})</h2>
          <ul className="missed-list">
            {missed.map((d) => (
              <li key={d}>
                <span>{formatThaiDate(d)}</span>
                <button className="btn btn-primary btn-sm" onClick={() => openDate(d)} disabled={recordDate === d}>
                  บันทึกย้อนหลัง
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showTeacherView && (
        <div className="record-date">
          <label className="field">
            <span>วันที่บันทึกเวร</span>
            <input
              type="date"
              value={recordDate}
              max={today}
              onChange={(e) => {
                if (!e.target.value) return
                setRecordDate(e.target.value)
                setManual(false)
              }}
            />
          </label>
          {isBackdated && (
            <button
              className="btn btn-light"
              onClick={() => {
                setRecordDate(today)
                setManual(false)
              }}
            >
              กลับไปวันนี้
            </button>
          )}
          {myReports && !showForm && (
            <button className="btn btn-light" onClick={() => setManual(true)}>
              {isBackdated ? 'บันทึกเวรของวันที่เลือก' : 'บันทึกเวรวันนี้ (เวรแทน/สลับเวร)'}
            </button>
          )}
        </div>
      )}

      {showForm && (
        <TodayDuty
          key={`${recordDate}-${recordReport?.id ?? 'new'}`}
          date={recordDate}
          backdated={isBackdated}
          report={recordReport}
          onSaved={handleSaved}
        />
      )}

      {!isAdmin && (
        <section className="card">
          <h2>ครูเวรวันนี้</h2>
          {todaySchedule.teachers.length ? (
            <ul className="plain-list">
              {todaySchedule.teachers.map((t) => (
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

      {!isAdmin && <DutyCalendar mode="mine" onPickDate={openDate} version={reload} />}
    </div>
  )
}
