import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth-context'
import { usePersonnel } from '../personnel-context'
import { WEEKDAYS } from '../constants'
import { defaultPersonnel } from '../roster'
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

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try {
      await fn()
      setEditing(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const save = (data, id) => {
    const taken = personnel.find((p) => p.id !== id && p.username === data.username)
    if (taken) {
      setError(`ชื่อผู้ใช้งาน ${data.username} ถูกใช้แล้วโดย ${taken.name}`)
      return
    }
    const duplicate = personnel.some((p) => p.id !== id && sameName(p.name, data.name))
    if (duplicate && !window.confirm(`มีชื่อ ${data.name} อยู่แล้ว ต้องการบันทึกซ้ำหรือไม่?`)) return
    run(() =>
      id
        ? updateDoc(doc(db, 'personnel', id), { ...data, updatedAt: serverTimestamp() })
        : addDoc(collection(db, 'personnel'), { ...data, order: Date.now(), createdAt: serverTimestamp() }),
    )
  }

  const remove = (p) => {
    if (window.confirm(`ลบ ${p.name} ออกจากรายชื่อบุคลากร?`)) run(() => deleteDoc(doc(db, 'personnel', p.id)))
  }

  const importDefault = () =>
    run(async () => {
      const batch = writeBatch(db)
      defaultPersonnel().forEach((p, order) => {
        batch.set(doc(collection(db, 'personnel')), { ...p, order, createdAt: serverTimestamp() })
      })
      await batch.commit()
    })

  return (
    <div className="card stack">
      <div className="hero">
        <h1>{isAdmin ? 'จัดการบุคลากร' : 'รายชื่อบุคลากร'}</h1>
        {isAdmin && editing !== 'new' && (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>+ เพิ่มบุคลากร</button>
        )}
      </div>
      <p className="muted">
        ครูเข้าใช้งานด้วยชื่อผู้ใช้งานในรายชื่อนี้ และใช้จัดตารางเวรประจำสัปดาห์ตามวันเวรของแต่ละคน
        {!isAdmin && ' (แก้ไขได้เฉพาะผู้ดูแลระบบ)'}
      </p>
      {loadError && <p className="error">{loadError}</p>}
      {error && <p className="error">{error}</p>}

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
          <table>
            <thead>
              <tr>
                <th>ชื่อผู้ใช้งาน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ตำแหน่ง</th>
                <th>เบอร์โทร</th>
                <th>วันเวร</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {personnel.map((p) =>
                editing === p.id ? (
                  <tr key={p.id}>
                    <td colSpan={6}>
                      <PersonForm
                        initial={p}
                        onSave={(data) => save(data, p.id)}
                        onCancel={() => setEditing(null)}
                        busy={busy}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>{p.username || <span className="muted">-</span>}</td>
                    <td>{p.name}</td>
                    <td>{p.position || <span className="muted">-</span>}</td>
                    <td>{p.phone || <span className="muted">-</span>}</td>
                    <td>
                      {WEEKDAYS[p.dutyDay ?? 0]}
                      {p.head && <strong> (หัวหน้าครูเวร)</strong>}
                    </td>
                    {isAdmin && (
                      <td className="row-actions">
                        <button className="btn btn-light btn-sm" onClick={() => setEditing(p.id)} disabled={busy}>แก้ไข</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(p)} disabled={busy}>ลบ</button>
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
