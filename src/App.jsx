import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth-context'
import Layout from './components/Layout'
import Login from './pages/Login'
import Pending from './pages/Pending'
import Dashboard from './pages/Dashboard'
import ReportForm from './pages/ReportForm'
import ReportDetail from './pages/ReportDetail'
import MyReports from './pages/MyReports'
import AllReports from './pages/AllReports'
import Schedule from './pages/Schedule'
import Personnel from './pages/Personnel'
import Summary from './pages/Summary'

function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, profile, loading, error } = useAuth()

  if (loading) return <div className="center-screen">กำลังโหลด...</div>
  if (!user) return <Login />
  if (error) return <div className="center-screen error">{error}</div>
  if (!profile || profile.role === 'pending') return <Pending />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="reports/:id" element={<ReportDetail />} />
        <Route path="reports/:id/edit" element={<ReportForm />} />
        <Route path="my-reports" element={<MyReports />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="personnel" element={<Personnel />} />
        <Route path="admin/reports" element={<AdminOnly><AllReports /></AdminOnly>} />
        <Route path="admin/summary" element={<AdminOnly><Summary /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
