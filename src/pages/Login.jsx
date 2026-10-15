import { useState } from 'react'
import { useAuth } from '../auth-context'
import { SCHOOL_NAME } from '../constants'

export default function Login() {
  const { login, loginWithName } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return
      if (err.code === 'auth/operation-not-allowed') setError('ระบบยังไม่เปิดให้เข้าใช้งานด้วยชื่อ กรุณาแจ้งผู้ดูแลระบบ')
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleName = (e) => {
    e.preventDefault()
    const trimmed = name.trim().replace(/\s+/g, ' ')
    if (!trimmed) return
    run(() => loginWithName(trimmed))
  }

  return (
    <div className="center-screen">
      <div className="card narrow login-card">
        <img src="/favicon.svg" alt="" width="64" height="64" />
        <h1>ระบบรายงานเวรประจำวัน</h1>
        <p className="muted">{SCHOOL_NAME}</p>
        <form className="stack" onSubmit={handleName}>
          <label className="field">
            <span>ชื่อ-นามสกุล</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ครูสมชาย ใจดี"
              maxLength={100}
              autoFocus
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !name.trim()}>
            {busy ? 'กำลังเข้าใช้งาน...' : 'เข้าใช้งาน'}
          </button>
          <p className="muted small">กรุณาพิมพ์ชื่อให้ตรงกับในตารางเวร เครื่องนี้จะจำชื่อไว้ ครั้งต่อไปไม่ต้องพิมพ์ใหม่</p>
        </form>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-light btn-sm" onClick={() => run(login)} disabled={busy}>
          ผู้ดูแลระบบ: เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  )
}
