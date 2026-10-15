import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { getReport, getReportPhotos, saveReport } from '../data'
import { CHECKLIST, MAX_PHOTOS, SHIFTS } from '../constants'
import { compressImage, errorMessage, todayStr } from '../utils'

const emptyForm = () => ({
  date: todayStr(),
  shift: SHIFTS[0].id,
  checklist: Object.fromEntries(CHECKLIST.map((c) => [c.id, false])),
  studentsLate: 0,
  studentsAbsent: 0,
  incidents: '',
  actions: '',
  suggestions: '',
})

export default function ReportForm() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [photos, setPhotos] = useState([])
  const [existingPhotoIds, setExistingPhotoIds] = useState([])
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!id) {
      setForm(emptyForm())
      setPhotos([])
      setExistingPhotoIds([])
      return
    }
    let active = true
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const [report, pics] = await Promise.all([getReport(id), getReportPhotos(id)])
        if (!active) return
        if (!report) throw new Error('ไม่พบรายงาน')
        if (report.uid !== user.uid || report.status !== 'submitted') {
          throw new Error('ไม่สามารถแก้ไขรายงานนี้ได้')
        }
        setForm({ ...emptyForm(), ...report, checklist: { ...emptyForm().checklist, ...report.checklist } })
        setPhotos(pics.map((p) => ({ id: p.id, data: p.data })))
        setExistingPhotoIds(pics.map((p) => p.id))
      } catch (err) {
        if (active) setLoadError(errorMessage(err))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id, user.uid])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setNumber = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: Math.max(0, parseInt(e.target.value, 10) || 0) }))
  const toggle = (key) => () =>
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))

  const addPhotos = async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    try {
      const datas = await Promise.all(files.map((f) => compressImage(f)))
      setPhotos((p) => [...p, ...datas.map((data) => ({ data }))])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removePhoto = (index) => setPhotos((p) => p.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fields = {
        date: form.date,
        shift: form.shift,
        checklist: form.checklist,
        studentsLate: form.studentsLate,
        studentsAbsent: form.studentsAbsent,
        incidents: form.incidents.trim(),
        actions: form.actions.trim(),
        suggestions: form.suggestions.trim(),
        uid: user.uid,
        teacherName: profile.displayName,
        teacherEmail: profile.email,
      }
      const reportId = await saveReport({ id, fields, photos, existingPhotoIds })
      navigate(`/reports/${reportId}`)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  if (loading) return <p>กำลังโหลด...</p>
  if (loadError) return <p className="error">{loadError}</p>

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <h1>{id ? 'แก้ไขรายงานเวร' : 'บันทึกรายงานการปฏิบัติหน้าที่เวรประจำวัน'}</h1>

      <div className="grid-2">
        <label className="field">
          <span>วันที่</span>
          <input type="date" value={form.date} onChange={set('date')} required />
        </label>
        <label className="field">
          <span>ช่วงเวลา</span>
          <select value={form.shift} onChange={set('shift')}>
            {SHIFTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="field">
        <legend>รายการปฏิบัติหน้าที่</legend>
        <div className="checklist">
          {CHECKLIST.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={form.checklist[c.id]} onChange={toggle(c.id)} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid-2">
        <label className="field">
          <span>จำนวนนักเรียนมาสาย (คน)</span>
          <input type="number" min="0" inputMode="numeric" value={form.studentsLate} onChange={setNumber('studentsLate')} />
        </label>
        <label className="field">
          <span>จำนวนนักเรียนขาดเรียน (คน)</span>
          <input type="number" min="0" inputMode="numeric" value={form.studentsAbsent} onChange={setNumber('studentsAbsent')} />
        </label>
      </div>

      <label className="field">
        <span>เหตุการณ์ที่พบ / เหตุการณ์ผิดปกติ</span>
        <textarea rows="4" value={form.incidents} onChange={set('incidents')} placeholder="ถ้าไม่มีให้ระบุว่า &quot;ปกติ&quot;" required />
      </label>
      <label className="field">
        <span>การดำเนินการแก้ไข</span>
        <textarea rows="3" value={form.actions} onChange={set('actions')} />
      </label>
      <label className="field">
        <span>ข้อเสนอแนะ</span>
        <textarea rows="3" value={form.suggestions} onChange={set('suggestions')} />
      </label>

      <div className="field">
        <span>รูปภาพประกอบ (ไม่เกิน {MAX_PHOTOS} รูป)</span>
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div key={p.id ?? `new-${i}`} className="photo">
              <img src={p.data} alt={`รูปที่ ${i + 1}`} />
              <button type="button" className="photo-remove" onClick={() => removePhoto(i)} aria-label="ลบรูป">
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="photo photo-add">
              <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
              + เพิ่มรูป
            </label>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="btn btn-light" onClick={() => navigate(-1)} disabled={saving}>
          ยกเลิก
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
        </button>
      </div>
    </form>
  )
}
