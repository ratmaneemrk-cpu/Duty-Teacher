import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { ROLES } from '../constants'
import { errorMessage } from '../utils'

export default function Users() {
  const { user } = useAuth()
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
    <div className="card stack">
      <h1>จัดการผู้ใช้</h1>
      <p className="muted">
        ครูที่เข้าใช้งานด้วยชื่อจะได้สิทธิ์ &quot;ครู&quot; ทันที (หนึ่งรายการต่อหนึ่งเครื่อง)
        ส่วนผู้ที่เข้าด้วย Google จะมีสถานะ &quot;รออนุมัติ&quot; ให้เปลี่ยนสิทธิ์เพื่อเปิดใช้งาน
      </p>
      {error && <p className="error">{error}</p>}
      {!users && !error && <p>กำลังโหลด...</p>}
      {users && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.role === 'pending' ? 'row-pending' : ''}>
                  <td>{u.displayName}</td>
                  <td>{u.email || <span className="muted">เข้าด้วยชื่อ</span>}</td>
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
  )
}
