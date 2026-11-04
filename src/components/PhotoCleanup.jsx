import { useState } from 'react'
import { deleteOldPhotos, listReportsWithPhotosBefore } from '../data'
import { errorMessage, formatThaiDate, parseDateStr, toDateStr, todayStr } from '../utils'

/** วันที่ย้อนหลังไป n เดือนจากวันนี้ */
function monthsAgo(n) {
  const d = parseDateStr(todayStr())
  d.setMonth(d.getMonth() - n)
  return toDateStr(d)
}

/**
 * ลบรูปภาพของรายงานเก่าเพื่อประหยัดพื้นที่ฐานข้อมูล (แผนฟรีเก็บได้ 1GB)
 * ตัวรายงาน รายการหน้าที่ และเหตุการณ์ยังอยู่ครบ
 */
export default function PhotoCleanup() {
  const [before, setBefore] = useState(() => monthsAgo(6))
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const check = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setFound(await listReportsWithPhotosBefore(before))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const photoTotal = (found ?? []).reduce((s, r) => s + (r.photoCount || 0), 0)

  const remove = async () => {
    if (!window.confirm(`ลบรูปภาพ ${photoTotal} รูป จากรายงาน ${found.length} รายการ ก่อนวันที่ ${formatThaiDate(before, false)}? ลบแล้วกู้คืนไม่ได้`)) return
    setBusy(true)
    setError('')
    try {
      await deleteOldPhotos(found.map((r) => r.id))
      setMessage(`ลบรูปภาพ ${photoTotal} รูปเรียบร้อยแล้ว`)
      setFound(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <h2>ลบรูปภาพเก่าเพื่อประหยัดพื้นที่</h2>
      <p className="muted small">
        รูปภาพเก็บในฐานข้อมูลซึ่งแผนฟรีเก็บได้ประมาณ 1GB (ประมาณ 1 ปีการศึกษา ถ้าครูแนบรูปทุกวัน)
        แนะนำให้ดาวน์โหลด/พิมพ์รายงานที่ต้องการเก็บไว้ก่อน แล้วลบรูปของรายงานเก่า ตัวรายงานยังอยู่ครบ
      </p>
      <div className="filters">
        <label className="field">
          <span>รายงานก่อนวันที่</span>
          <input
            type="date"
            value={before}
            max={todayStr()}
            onChange={(e) => {
              setBefore(e.target.value)
              setFound(null)
              setMessage('')
            }}
          />
        </label>
        <button className="btn btn-light" onClick={check} disabled={busy || !before}>ตรวจสอบ</button>
        {found?.length > 0 && (
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            {busy ? 'กำลังลบ...' : `ลบรูป ${photoTotal} รูป`}
          </button>
        )}
      </div>
      {found && found.length === 0 && <p className="muted">ไม่มีรูปภาพในรายงานก่อนวันที่นี้</p>}
      {found?.length > 0 && (
        <p>
          พบรูปภาพ <strong>{photoTotal}</strong> รูป ในรายงาน {found.length} รายการ
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="highlight">{message}</p>}
    </section>
  )
}
