import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { ROLES, SCHOOL_NAME } from '../constants'

export default function Layout() {
  const { user, profile, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  const handleLogout = () => {
    // ผู้ใช้ที่เข้าด้วยชื่อ ถ้าออกแล้วจะแก้ไขรายงานที่ส่งจากเครื่องนี้ไม่ได้อีก
    if (user.isAnonymous && !window.confirm('ออกจากระบบแล้วจะแก้ไขรายงานที่ส่งไปแล้วไม่ได้ ต้องการออกใช่หรือไม่?')) return
    logout()
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="ตราโรงเรียน" width="33" height="46" />
          <div>
            <div className="brand-title">รายงานเวรประจำวัน</div>
            <div className="brand-sub">{SCHOOL_NAME}</div>
          </div>
        </div>
        <button className="menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="เมนู">
          ☰
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <NavLink to="/" end onClick={close}>หน้าแรก</NavLink>
          <NavLink to="/my-reports" onClick={close}>รายงานของฉัน</NavLink>
          <NavLink to="/schedule" onClick={close}>ตารางเวร</NavLink>
          <NavLink to="/personnel" onClick={close}>บุคลากร</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/reports" onClick={close}>รายงานการทำเวร</NavLink>
              <NavLink to="/admin/summary" onClick={close}>สรุปการปฏิบัติหน้าที่</NavLink>
            </>
          )}
          <div className="user-box">
            <span>
              {profile.displayName}
              <small> ({ROLES[profile.role]})</small>
            </span>
            <button className="btn btn-light btn-sm" onClick={handleLogout}>ออกจากระบบ</button>
          </div>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
