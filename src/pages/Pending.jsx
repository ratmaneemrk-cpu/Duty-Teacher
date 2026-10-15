import { useAuth } from '../auth-context'

export default function Pending() {
  const { user, profile, logout } = useAuth()
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1>รอการอนุมัติ</h1>
        <p>
          บัญชี <strong>{user.email || profile?.displayName}</strong> ลงทะเบียนเรียบร้อยแล้ว
          กรุณาแจ้งผู้ดูแลระบบให้อนุมัติสิทธิ์การใช้งาน
        </p>
        <button className="btn btn-light" onClick={logout}>ออกจากระบบ</button>
      </div>
    </div>
  )
}
