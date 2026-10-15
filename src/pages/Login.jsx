import { useState } from 'react'
import { useAuth } from '../auth-context'
import { SCHOOL_NAME } from '../constants'

export default function Login() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogin = async () => {
    setError('')
    setBusy(true)
    try {
      await login()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message)
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
        <button className="btn btn-primary btn-lg" onClick={handleLogin} disabled={busy}>
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
