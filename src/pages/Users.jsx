import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { ROLES } from '../constants'
import { setPersonAdmin } from '../data'
import { usePersonnel } from '../personnel-context'
import { errorMessage, sameName } from '../utils'

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
    if (next.length < 8) return setError('รหัสใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    if (next.includes('/') || next.startsWith('.')) return setError('รหัสใหม่ห้ามมีเครื่องหมาย / หรือขึ้นต้นด้วยจุด')
    if (next !== confirm) return setError('รหัสใหม่ทั้งสองช่องไม่ตรงกัน')
    setBusy(true)
    try {
      await changeAdminCode(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage('เปลี่ยนรหัสผู้ดูแลระบบเรียบร้อยแล้ว')
    } catch (err) {
      setError(errorMessage(err))
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
  const { user } = useAuth()
  const { personnel } = usePersonnel()
  const [users, setUsers] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users'),
        (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => setError(errorMessage(err)),
      ),
    [],
  )

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // บัญชีที่เข้าใช้งานแล้ว (หนึ่งบัญชีต่อหนึ่งเครื่อง) ของบุคลากรแต่ละคน
  const accountsOf = (p) =>
    (users ?? []).filter((u) => (u.username ? u.username === p.username : sameName(u.displayName, p.name)))
  const others = (users ?? [])
    .filter((u) => !(personnel ?? []).some((p) => accountsOf(p).includes(u)))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'))
  const loggedIn = (personnel ?? []).filter((p) => accountsOf(p).length > 0).length

  const toggleAdmin = (p) => {
    const accounts = accountsOf(p)
    if (p.admin) {
      if (accounts.some((u) => u.id === user.uid) && !window.confirm('คุณกำลังยกเลิกสิทธิ์ผู้ดูแลของตัวเอง ต้องการดำเนินการต่อหรือไม่?')) return
      if (!window.confirm(`ยกเลิกสิทธิ์ผู้ดูแลของ ${p.name}? จะกลับเป็นครู และเข้าระบบด้วยรหัสผ่านเหมือนชื่อผู้ใช้งาน`)) return
    } else if (!window.confirm(`ให้ ${p.name} เป็นผู้ดูแลระบบ? รหัสผ่านเริ่มต้นคือ ${p.username} (เปลี่ยนได้หลังเข้าระบบ)`)) {
      return
    }
    run(() => setPersonAdmin(p, !p.admin, accounts.map((u) => u.id)))
  }

  const resetAccounts = (p, accounts) => {
    if (!window.confirm(`ล้างการเข้าใช้งานของ ${p.name} (${accounts.length} เครื่อง)? ต้องเข้าระบบใหม่ด้วยชื่อผู้ใช้งาน`)) return
    run(() => Promise.all(accounts.map((u) => deleteDoc(doc(db, 'users', u.id)))))
  }

  const changeRole = (u, role) => {
    if (u.id === user.uid && role !== 'admin' && !window.confirm('คุณกำลังลดสิทธิ์ของตัวเอง ต้องการดำเนินการต่อหรือไม่?')) return
    run(() => updateDoc(doc(db, 'users', u.id), { role }))
  }

  const remove = (u) => {
    if (window.confirm(`ลบผู้ใช้ ${u.displayName} ออกจากระบบ?`)) run(() => deleteDoc(doc(db, 'users', u.id)))
  }

  const loading = !users || !personnel

  return (
    <div className="stack">
      <div className="card stack">
        <h1>จัดการผู้ใช้</h1>
        <p className="muted">
          รายชื่อครูทั้งหมดตามเมนู &quot;บุคลากร&quot; ครูเข้าระบบด้วยชื่อผู้ใช้งาน รหัสผ่านเหมือนชื่อผู้ใช้งาน
          ผู้ดูแลระบบเข้าด้วยรหัสผ่านของตนเอง
        </p>
        {error && <p className="error">{error}</p>}
        {loading && !error && <p>กำลังโหลด...</p>}
        {!loading && (
          <>
            <div className="stats">
              <div><strong>{personnel.length}</strong><span>บุคลากรทั้งหมด</span></div>
              <div><strong>{loggedIn}</strong><span>เข้าใช้งานแล้ว</span></div>
              <div className={personnel.length - loggedIn ? 'stat-warn' : ''}>
                <strong>{personnel.length - loggedIn}</strong><span>ยังไม่เคยเข้าใช้งาน</span>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ชื่อผู้ใช้งาน</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>สิทธิ์</th>
                    <th>การเข้าใช้งาน</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {personnel.map((p) => {
                    const accounts = accountsOf(p)
                    return (
                      <tr key={p.id}>
                        <td>{p.username || <span className="muted">-</span>}</td>
                        <td>
                          {p.name}
                          {p.position && <div className="muted small">{p.position}</div>}
                        </td>
                        <td>{p.admin ? <strong>ผู้ดูแลระบบ</strong> : 'ครู'}</td>
                        <td>
                          {accounts.length ? (
                            <span className="badge badge-acknowledged">เข้าแล้ว {accounts.length} เครื่อง</span>
                          ) : (
                            <span className="badge badge-submitted">ยังไม่เคยเข้า</span>
                          )}
                        </td>
                        <td className="row-actions">
                          {p.username && (
                            <button className="btn btn-light btn-sm" onClick={() => toggleAdmin(p)} disabled={busy}>
                              {p.admin ? 'ยกเลิกสิทธิ์ผู้ดูแล' : 'ให้สิทธิ์ผู้ดูแล'}
                            </button>
                          )}
                          {accounts.length > 0 && (
                            <button className="btn btn-light btn-sm" onClick={() => resetAccounts(p, accounts)} disabled={busy}>
                              ล้างการเข้าใช้
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && others.length > 0 && (
        <div className="card stack">
          <h2>บัญชีอื่น (ไม่อยู่ในรายชื่อบุคลากร)</h2>
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
                {others.map((u) => (
                  <tr key={u.id} className={u.role === 'pending' ? 'row-pending' : ''}>
                    <td>{u.displayName}</td>
                    <td>{u.username || u.email || <span className="muted">-</span>}</td>
                    <td>
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} disabled={busy}>
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="row-actions">
                      {u.id !== user.uid && (
                        <button className="btn btn-danger btn-sm" onClick={() => remove(u)} disabled={busy}>ลบ</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ChangeAdminCode />
    </div>
  )
}
