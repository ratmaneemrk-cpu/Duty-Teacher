import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { acknowledgeReport, deleteReport, getReport, getReportPhotos } from '../data'
import { CHECKLIST, SCHOOL_NAME, shiftLabel } from '../constants'
import { errorMessage, formatThaiDate, formatTimestamp } from '../utils'
import StatusBadge from '../components/StatusBadge'

export default function ReportDetail() {
  const { id } = useParams()
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [photos, setPhotos] = useState([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const r = await getReport(id)
        if (!active) return
        if (!r) throw new Error('ไม่พบรายงาน')
        setReport(r)
        setComment(r.adminComment ?? '')
        const pics = await getReportPhotos(id)
        if (active) setPhotos(pics)
      } catch (err) {
        if (active) setError(errorMessage(err))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <p>กำลังโหลด...</p>
  if (!report) return <p className="error">{error || 'ไม่พบรายงาน'}</p>

  const isOwner = report.uid === user.uid
  const editable = isOwner && report.status === 'submitted'

  const handleAcknowledge = async () => {
    setBusy(true)
    setError('')
    try {
      await acknowledgeReport(id, comment.trim(), profile.displayName)
      setReport(await getReport(id))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('ต้องการลบรายงานนี้ใช่หรือไม่?')) return
    setBusy(true)
    try {
      await deleteReport(id)
      navigate(isOwner ? '/my-reports' : '/admin/reports')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="actions no-print">
        <button className="btn btn-light" onClick={() => navigate(-1)}>← ย้อนกลับ</button>
        <span className="spacer" />
        <button className="btn btn-light" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>
        {editable && <Link className="btn btn-light" to={`/reports/${id}/edit`}>แก้ไข</Link>}
        {(editable || isAdmin) && (
          <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>ลบ</button>
        )}
      </div>

      <article className="card report">
        <header className="report-head">
          <h1>แบบรายงานการปฏิบัติหน้าที่เวรประจำวัน</h1>
          <p>{SCHOOL_NAME}</p>
        </header>

        <dl className="meta">
          <div><dt>วันที่</dt><dd>{formatThaiDate(report.date)}</dd></div>
          <div><dt>ช่วงเวลา</dt><dd>{shiftLabel(report.shift)}</dd></div>
          <div><dt>ครูเวร</dt><dd>{report.teacherName}</dd></div>
          <div><dt>สถานะ</dt><dd><StatusBadge status={report.status} /></dd></div>
        </dl>

        <h2>รายการปฏิบัติหน้าที่</h2>
        <ul className="checklist-view">
          {CHECKLIST.map((c) => (
            <li key={c.id} className={report.checklist?.[c.id] ? 'done' : 'not-done'}>
              {report.checklist?.[c.id] ? '☑' : '☐'} {c.label}
            </li>
          ))}
        </ul>

        <dl className="meta">
          <div><dt>นักเรียนมาสาย</dt><dd>{report.studentsLate ?? 0} คน</dd></div>
          <div><dt>นักเรียนขาดเรียน</dt><dd>{report.studentsAbsent ?? 0} คน</dd></div>
        </dl>

        <h2>เหตุการณ์ที่พบ</h2>
        <p className="pre">{report.incidents || '-'}</p>
        <h2>การดำเนินการแก้ไข</h2>
        <p className="pre">{report.actions || '-'}</p>
        <h2>ข้อเสนอแนะ</h2>
        <p className="pre">{report.suggestions || '-'}</p>

        {photos.length > 0 && (
          <>
            <h2>รูปภาพประกอบ</h2>
            <div className="photo-grid">
              {photos.map((p, i) => (
                <div key={p.id} className="photo">
                  <img src={p.data} alt={`รูปที่ ${i + 1}`} />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="signatures">
          <div>
            <div className="sign-line" />
            <p>({report.teacherName})</p>
            <p>ครูเวรประจำวัน</p>
          </div>
          <div>
            <div className="sign-line" />
            <p>({report.acknowledgedBy || '..............................'})</p>
            <p>ผู้บริหาร / ผู้รับรายงาน</p>
          </div>
        </div>

        <p className="muted small">ส่งเมื่อ {formatTimestamp(report.createdAt)}</p>

        {report.status === 'acknowledged' && (
          <div className="ack">
            <strong>ความเห็นผู้บริหาร:</strong> {report.adminComment || '-'}
            <div className="muted small">
              รับทราบโดย {report.acknowledgedBy} เมื่อ {formatTimestamp(report.acknowledgedAt)}
            </div>
          </div>
        )}
      </article>

      {isAdmin && (
        <section className="card no-print stack">
          <h2>ความเห็น / รับทราบรายงาน</h2>
          <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="ความเห็นของผู้บริหาร" />
          <div className="actions">
            <button className="btn btn-primary" onClick={handleAcknowledge} disabled={busy}>
              {report.status === 'acknowledged' ? 'บันทึกความเห็น' : 'รับทราบรายงาน'}
            </button>
          </div>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
