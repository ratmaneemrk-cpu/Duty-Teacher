import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { ROLES, SCHOOL_NAME } from '../constants'

export default function Layout() {
  const { profile, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
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
          <NavLink to="/reports/new" onClick={close}>เขียนรายงาน</NavLink>
          <NavLink to="/my-reports" onClick={close}>รายงานของฉัน</NavLink>
          <NavLink to="/schedule" onClick={close}>ตารางเวร</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/reports" onClick={close}>รายงานทั้งหมด</NavLink>
              <NavLink to="/admin/users" onClick={close}>จัดการผู้ใช้</NavLink>
            </>
          )}
          <div className="user-box">
            <span>
              {profile.displayName}
              <small> ({ROLES[profile.role]})</small>
            </span>
            <button className="btn btn-light btn-sm" onClick={logout}>ออกจากระบบ</button>
          </div>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
