import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { usePersonnel } from '../personnel-context'
import { WEEKDAYS } from '../constants'
import { defaultPersonnel } from '../roster'
import { deletePasswords, passwordDocId, passwordProblem, setPassword, setPersonAdmin } from '../data'
import { errorMessage, sameName } from '../utils'

const EMPTY = { username: '', name: '', position: '', phone: '', dutyDay: 0, head: false }

function PersonForm({ initial, onSave, onCancel, busy }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial }))
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim().replace(/\s+/g, ' ')
    if (!name) return
    onSave({
      username: form.username.trim().toLowerCase(),
      name,
      position: form.position.trim(),
      phone: form.phone.trim(),
      dutyDay: Number(form.dutyDay),
      head: Number(form.dutyDay) > 0 && form.head,
    })
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="filters">
        <label className="field">
          <span>ชื่อผู้ใช้งาน</span>
          <input
            type="text"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            maxLength={20}
            pattern="[A-Za-z0-9_.\-]+"
            title="ตัวอักษรภาษาอังกฤษหรือตัวเลข เช่น t030"
            placeholder="เช่น t030"
            autoCapitalize="none"
            required
          />
        </label>
        <label className="field">
          <span>ชื่อ-นามสกุล</span>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={100} required autoFocus />
        </label>
        <label className="field">
          <span>ตำแหน่ง</span>
          <input
            type="text"
            value={form.position}
            onChange={(e) => set('position', e.target.value)}
            maxLength={100}
            placeholder="เช่น ครู, ครูผู้ช่วย"
          />
        </label>
        <label className="field">
          <span>เบอร์โทร</span>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} />
        </label>
        <label className="field">
          <span>วันเวร</span>
          <select value={form.dutyDay} onChange={(e) => set('dutyDay', Number(e.target.value))}>
            {Object.entries(WEEKDAYS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={form.head}
            disabled={!form.dutyDay}
            onChange={(e) => set('head', e.target.checked)}
          />
          <span>หัวหน้าครูเวร</span>
        </label>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-light btn-sm" onClick={onCancel} disabled={busy}>ยกเลิก</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !form.name.trim()}>บันทึก</button>
      </div>
    </form>
  )
}

export default function Personnel() {
  const { isAdmin } = useAuth()
  const { personnel, error: loadError } = usePersonnel()
  // null = ไม่ได้แก้ไข, 'new' = เพิ่มใหม่, หรือ id ของบุคลากรที่กำลังแก้
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const run = async (fn, done = '') => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await fn()
      setEditing(null)
      setMessage(done)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const save = (data, person) => {
    if (data.username === 'admin') {
      setError('ชื่อผู้ใช้งาน admin สงวนไว้สำหรับผู้ดูแลระบบ')
      return
    }
    const taken = personnel.find((p) => p.id !== person?.id && p.username === data.username)
    if (taken) {
      setError(`ชื่อผู้ใช้งาน ${data.username} ถูกใช้แล้วโดย ${taken.name}`)
      return
    }
    const duplicate = personnel.some((p) => p.id !== person?.id && sameName(p.name, data.name))
    if (duplicate && !window.confirm(`มีชื่อ ${data.name} อยู่แล้ว ต้องการบันทึกซ้ำหรือไม่?`)) return
    run(async () => {
      if (person) {
        await updateDoc(doc(db, 'personnel', person.id), { ...data, updatedAt: serverTimestamp() })
        // เปลี่ยนชื่อผู้ใช้งาน: รหัสผ่านกลับเป็นค่าเริ่มต้น (= ชื่อผู้ใช้งานใหม่)
        if (person.username !== data.username) {
          await setPassword(data.username, data.username, person.admin)
          if (person.username) await deletePasswords(person.username)
        }
      } else {
        await addDoc(collection(db, 'personnel'), { ...data, admin: false, order: Date.now(), createdAt: serverTimestamp() })
        await setPassword(data.username, data.username, false)
      }
    }, person ? 'บันทึกแล้ว' : `เพิ่ม ${data.name} แล้ว รหัสผ่านเริ่มต้นคือ ${data.username}`)
  }

  const setDuty = (p, dutyDay) =>
    run(() => updateDoc(doc(db, 'personnel', p.id), { dutyDay, head: dutyDay ? Boolean(p.head) : false }))

  const setHead = (p, head) => run(() => updateDoc(doc(db, 'personnel', p.id), { head }))

  const changePassword = (username, admin, label) => {
    const password = window.prompt(`ตั้งรหัสผ่านใหม่ของ ${label} (อย่างน้อย 4 ตัวอักษร)`)
    if (password == null) return
    const problem = passwordProblem(password)
    if (problem) {
      setError(problem)
      return
    }
    run(() => setPassword(username, password, admin), `เปลี่ยนรหัสผ่านของ ${label} แล้ว`)
  }

  const toggleAdmin = (p) => {
    const question = p.admin
      ? `ยกเลิกสิทธิ์ผู้ดูแลของ ${p.name}? จะกลับเป็นครู`
      : `ให้ ${p.name} เป็นผู้ดูแลระบบ?`
    if (window.confirm(question)) run(() => setPersonAdmin(p, !p.admin), 'เปลี่ยนสิทธิ์แล้ว')
  }

  const remove = (p) => {
    if (!window.confirm(`ลบ ${p.name} ออกจากรายชื่อบุคลากร? จะเข้าระบบไม่ได้อีก`)) return
    run(async () => {
      if (p.username) await deletePasswords(p.username)
      await deleteDoc(doc(db, 'personnel', p.id))
    })
  }

  const importDefault = () =>
    run(async () => {
      const batch = writeBatch(db)
      defaultPersonnel().forEach((p, order) => {
        batch.set(doc(db, 'personnel', p.username), { ...p, order, createdAt: serverTimestamp() })
        batch.set(doc(db, 'passwords', passwordDocId(p.username, p.username)), {
          username: p.username,
          admin: p.admin,
          updatedAt: serverTimestamp(),
        })
      })
      await batch.commit()
    })

  return (
    <div className="card stack">
      <div className="hero">
        <h1>{isAdmin ? 'จัดการบุคลากร' : 'รายชื่อบุคลากร'}</h1>
        {isAdmin && (
          <div className="actions">
            <button
              className="btn btn-light"
              onClick={() => changePassword('admin', true, 'บัญชี admin')}
              disabled={busy}
            >
              รหัสผ่านบัญชี admin
            </button>
            {editing !== 'new' && (
              <button className="btn btn-primary" onClick={() => setEditing('new')}>+ เพิ่มบุคลากร</button>
            )}
          </div>
        )}
      </div>
      <p className="muted">
        ครูเข้าใช้งานด้วยชื่อผู้ใช้งานและรหัสผ่าน (เริ่มต้นเหมือนชื่อผู้ใช้งาน) วันเวรใช้จัดตารางเวรประจำสัปดาห์
        {!isAdmin && ' (แก้ไขได้เฉพาะผู้ดูแลระบบ)'}
      </p>
      {loadError && <p className="error">{loadError}</p>}
      {error && <p className="error">{error}</p>}
      {message && <p className="highlight">{message}</p>}

      {editing === 'new' && (
        <div className="editor">
          <PersonForm onSave={(data) => save(data)} onCancel={() => setEditing(null)} busy={busy} />
        </div>
      )}

      {!personnel && <p>กำลังโหลด...</p>}
      {personnel?.length === 0 && (
        <div className="stack">
          <p className="muted">ยังไม่มีรายชื่อบุคลากรในระบบ ตอนนี้ใช้รายชื่อและตารางเวรเริ่มต้นของโรงเรียน</p>
          {isAdmin && (
            <div>
              <button className="btn btn-light" onClick={importDefault} disabled={busy}>
                นำเข้ารายชื่อบุคลากรเริ่มต้นของโรงเรียน
              </button>
            </div>
          )}
        </div>
      )}
      {personnel?.length > 0 && (
        <div className="table-wrap">
          <table className="personnel-table">
            <thead>
              <tr>
                <th>ชื่อผู้ใช้งาน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>วันเวร</th>
                {isAdmin && <th>จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {personnel.map((p) =>
                editing === p.id ? (
                  <tr key={p.id}>
                    <td colSpan={4}>
                      <PersonForm initial={p} onSave={(data) => save(data, p)} onCancel={() => setEditing(null)} busy={busy} />
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>{p.username || <span className="muted">-</span>}</td>
                    <td>
                      {p.name}
                      {p.admin && <strong className="tag-admin">ผู้ดูแลระบบ</strong>}
                      <div className="muted small">
                        {[p.position, p.phone].filter(Boolean).join(' · ') || ''}
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <div className="duty-pick">
                          <select value={p.dutyDay ?? 0} onChange={(e) => setDuty(p, Number(e.target.value))} disabled={busy}>
                            {Object.entries(WEEKDAYS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          {p.dutyDay > 0 && (
                            <label className="check small">
                              <input type="checkbox" checked={Boolean(p.head)} onChange={(e) => setHead(p, e.target.checked)} disabled={busy} />
                              <span>หัวหน้าครูเวร</span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <>
                          {WEEKDAYS[p.dutyDay ?? 0]}
                          {p.head && <strong> (หัวหน้าครูเวร)</strong>}
                        </>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="row-actions wrap">
                          <button
                            className="btn btn-light btn-sm"
                            onClick={() => changePassword(p.username, p.admin, p.name)}
                            disabled={busy || !p.username}
                          >
                            เปลี่ยนรหัสผ่าน
                          </button>
                          <button
                            className="btn btn-light btn-sm"
                            onClick={() => toggleAdmin(p)}
                            disabled={busy || !p.username}
                          >
                            {p.admin ? 'ยกเลิกผู้ดูแล' : 'ให้เป็นผู้ดูแล'}
                          </button>
                          <button className="btn btn-light btn-sm" onClick={() => setEditing(p.id)} disabled={busy}>แก้ไข</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(p)} disabled={busy}>ลบ</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
