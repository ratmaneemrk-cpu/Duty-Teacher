import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { listSchedulesBetween } from '../data'
import { errorMessage, daysInMonth, formatThaiDate, formatThaiMonth, monthRange, parseDateStr, thisMonthStr, todayStr } from '../utils'

function ScheduleEditor({ date, current, staff, onSaved, onCancel }) {
  const [selected, setSelected] = useState(() => new Set((current?.teachers ?? []).map((t) => t.uid)))
  const [note, setNote] = useState(current?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (uid) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const ref = doc(db, 'schedules', date)
      if (selected.size === 0 && !note.trim()) {
        await deleteDoc(ref)
        onSaved(date, null)
      } else {
        const data = {
          date,
          teachers: staff.filter((u) => selected.has(u.id)).map((u) => ({ uid: u.id, name: u.displayName })),
          note: note.trim(),
          updatedAt: serverTimestamp(),
        }
        await setDoc(ref, data)
        onSaved(date, data)
      }
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="editor stack">
      <div className="checklist">
        {staff.map((u) => (
          <label key={u.id} className="check">
            <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
            <span>{u.displayName}</span>
          </label>
        ))}
      </div>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn btn-light btn-sm" onClick={onCancel} disabled={busy}>ยกเลิก</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>บันทึก</button>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { user, isAdmin } = useAuth()
  const [month, setMonth] = useState(thisMonthStr)
  const [schedules, setSchedules] = useState({})
  const [staff, setStaff] = useState([])
  const [editing, setEditing] = useState(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [error, setError] = useState('')
  const today = todayStr()

  useEffect(() => {
    if (!month) return
    let active = true
    const [start, end] = monthRange(month)
    listSchedulesBetween(start, end)
      .then((s) => active && setSchedules(s))
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [month])

  useEffect(() => {
    if (!isAdmin) return
    getDocs(collection(db, 'users'))
      .then((snap) =>
        setStaff(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.role === 'teacher' || u.role === 'admin')
            .sort((a, b) => a.displayName.localeCompare(b.displayName, 'th')),
        ),
      )
      .catch((err) => setError(errorMessage(err)))
  }, [isAdmin])

  const handleSaved = (date, data) => {
    setSchedules((s) => {
      const next = { ...s }
      if (data) next[date] = data
      else delete next[date]
      return next
    })
    setEditing(null)
  }

  const days = month ? daysInMonth(month) : []
  const shownDays = onlyMine
    ? days.filter((d) => schedules[d]?.teachers?.some((t) => t.uid === user.uid))
    : days

  return (
    <div className="card stack">
      <h1>ตารางเวรประจำวัน</h1>
      <div className="filters">
        <label className="field">
          <span>เดือน</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          <span>แสดงเฉพาะเวรของฉัน</span>
        </label>
      </div>
      {month && <h2>{formatThaiMonth(month)}</h2>}
      {error && <p className="error">{error}</p>}

      <ul className="schedule">
        {shownDays.map((date) => {
          const s = schedules[date]
          const dow = parseDateStr(date).getDay()
          const weekend = dow === 0 || dow === 6
          const mine = s?.teachers?.some((t) => t.uid === user.uid)
          const cls = ['day', weekend && 'weekend', date === today && 'today', mine && 'mine']
            .filter(Boolean)
            .join(' ')
          return (
            <li key={date} className={cls}>
              <div className="day-head">
                <span className="day-date">{formatThaiDate(date)}</span>
                {isAdmin && editing !== date && (
                  <button className="btn btn-light btn-sm" onClick={() => setEditing(date)}>จัดเวร</button>
                )}
              </div>
              {editing === date ? (
                <ScheduleEditor
                  date={date}
                  current={s}
                  staff={staff}
                  onSaved={handleSaved}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="day-body">
                  {s?.teachers?.length ? s.teachers.map((t) => t.name).join(', ') : <span className="muted">-</span>}
                  {s?.note && <div className="note">{s.note}</div>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {onlyMine && shownDays.length === 0 && <p className="muted">ไม่มีเวรในเดือนนี้</p>}
    </div>
  )
}
