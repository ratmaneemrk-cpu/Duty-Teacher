import { useState } from 'react'
import { useAuth } from '../auth-context'
import { usePersonnel } from '../personnel-context'
import { SCHOOL_NAME } from '../constants'
import { findByUsername } from '../roster'

function loginError(err) {
  switch (err.code) {
    case 'auth/operation-not-allowed':
      return 'ระบบยังไม่เปิดให้เข้าใช้งานด้วยวิธีนี้ กรุณาแจ้งผู้ดูแลระบบ'
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'รหัสผ่านไม่ถูกต้อง'
    case 'auth/too-many-requests':
      return 'ใส่รหัสผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
    default:
      return err.message
  }
}

export default function Login() {
  const { login, loginError: authError } = useAuth()
  const { directory } = usePersonnel()
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const person = findByUsername(directory, username)
  // บัญชี admin ไม่อยู่ในรายชื่อบุคลากร
  const isAdminUser = username.trim().toLowerCase() === 'admin'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!person && !isAdminUser) {
      setError('ไม่พบชื่อผู้ใช้งานนี้ กรุณาตรวจสอบหรือแจ้งผู้ดูแลระบบ')
      return
    }
    setBusy(true)
    try {
      // security rules ตรวจรหัสผ่าน
      await login(
        isAdminUser
          ? { name: 'ผู้ดูแลระบบ', username: 'admin', admin: true, code: code.trim() }
          : { name: person.name, username: person.username, admin: Boolean(person.admin), code: code.trim() },
      )
    } catch (err) {
      setError(loginError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="card narrow login-card">
        <img src="/favicon.svg" alt="" width="64" height="64" />
        <h1>ระบบรายงานเวรประจำวัน</h1>
        <p className="muted">{SCHOOL_NAME}</p>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>ชื่อผู้ใช้งาน</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น t016"
              autoCapitalize="none"
              autoComplete="username"
              maxLength={20}
              autoFocus
              required
            />
          </label>
          {person && <p className="highlight">{person.name}</p>}
          <label className="field">
            <span>รหัสผ่าน</span>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !username.trim() || !code}>
            {busy ? 'กำลังเข้าใช้งาน...' : 'เข้าใช้งาน'}
          </button>
          <p className="muted small">ใช้ชื่อผู้ใช้งานที่โรงเรียนกำหนด รหัสผ่านเริ่มต้นเหมือนชื่อผู้ใช้งาน เครื่องนี้จะจำไว้ ครั้งต่อไปไม่ต้องพิมพ์ใหม่</p>
        </form>
        {(error || authError) && <p className="error">{error || authError}</p>}
      </div>
    </div>
  )
}
