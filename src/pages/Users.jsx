import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { ROLES } from '../constants'
import { errorMessage } from '../utils'

function ChangeAdminCode() {
  const { changeAdminCode } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (next.length < 6) return setError('รหัสใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
    if (next !== confirm) return setError('รหัสใหม่ทั้งสองช่องไม่ตรงกัน')
    setBusy(true)
    try {
      await changeAdminCode(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage('เปลี่ยนรหัสผู้ดูแลระบบเรียบร้อยแล้ว')
    } catch (err) {
      setError(['auth/invalid-credential', 'auth/wrong-password'].includes(err.code) ? 'รหัสปัจจุบันไม่ถูกต้อง' : errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>เปลี่ยนรหัสผู้ดูแลระบบ</h2>
      <div className="filters">
        <label className="field">
          <span>รหัสปัจจุบัน</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </label>
        <label className="field">
          <span>รหัสใหม่</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </label>
        <label className="field">
          <span>ยืนยันรหัสใหม่</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>เปลี่ยนรหัส</button>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="highlight">{message}</p>}
    </form>
  )
}

export default function Users() {
  const { user, isAdminCode } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          // ผู้ที่รออนุมัติขึ้นก่อน
          list.sort(
            (a, b) =>
              (a.role === 'pending' ? 0 : 1) - (b.role === 'pending' ? 0 : 1) ||
              a.displayName.localeCompare(b.displayName, 'th'),
          )
          setUsers(list)
        },
        (err) => setError(errorMessage(err)),
      ),
    [],
  )

  const run = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const changeRole = (u, role) => {
    if (u.id === user.uid && role !== 'admin' && !window.confirm('คุณกำลังลดสิทธิ์ของตัวเอง ต้องการดำเนินการต่อหรือไม่?')) return
    run(() => updateDoc(doc(db, 'users', u.id), { role }))
  }

  const rename = (u) => {
    const name = window.prompt('ชื่อที่แสดง (เช่น ครูสมชาย ใจดี)', u.displayName)
    if (name && name.trim()) run(() => updateDoc(doc(db, 'users', u.id), { displayName: name.trim() }))
  }

  const remove = (u) => {
    if (window.confirm(`ลบผู้ใช้ ${u.displayName} ออกจากระบบ?`)) run(() => deleteDoc(doc(db, 'users', u.id)))
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h1>จัดการผู้ใช้</h1>
        <p className="muted">
          ครูที่เข้าใช้งานด้วยชื่อผู้ใช้งานจะได้สิทธิ์ &quot;ครู&quot; ทันที (หนึ่งรายการต่อหนึ่งเครื่อง)
          เพิ่มหรือแก้ไขชื่อผู้ใช้งานได้ที่เมนู &quot;บุคลากร&quot;
        </p>
        {error && <p className="error">{error}</p>}
        {!users && !error && <p>กำลังโหลด...</p>}
        {users && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ชื่อผู้ใช้งาน</th>
                  <th>สิทธิ์</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.role === 'pending' ? 'row-pending' : ''}>
                    <td>{u.displayName}</td>
                    <td>{u.username || u.email || <span className="muted">-</span>}</td>
                    <td>
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-light btn-sm" onClick={() => rename(u)}>แก้ชื่อ</button>
                      {u.id !== user.uid && (
                        <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>ลบ</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {isAdminCode && <ChangeAdminCode />}
    </div>
  )
}
