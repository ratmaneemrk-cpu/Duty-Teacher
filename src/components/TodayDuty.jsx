import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { getReportPhotos, saveReport } from '../data'
import { CHECKLIST, OTHER_DUTY } from '../constants'
import { errorMessage } from '../utils'
import DutyChecklist from './DutyChecklist'
import PhotoPicker from './PhotoPicker'
import StatusBadge from './StatusBadge'

/** ติ๊กหน้าที่ที่ปฏิบัติและบันทึกเหตุการณ์ของวันที่เป็นเวร (บันทึกเป็นรายงานเวรตลอดวัน) */
export default function TodayDuty({ date, report, onSaved }) {
  const { user, profile } = useAuth()
  const [checklist, setChecklist] = useState(() =>
    Object.fromEntries([...CHECKLIST, OTHER_DUTY].map((c) => [c.id, Boolean(report?.checklist?.[c.id])])),
  )
  const [otherDuty, setOtherDuty] = useState(report?.otherDuty ?? '')
  const [incidents, setIncidents] = useState(report?.incidents ?? '')
  const [photos, setPhotos] = useState([])
  const [existingPhotoIds, setExistingPhotoIds] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const locked = report?.status === 'acknowledged'
  const done = CHECKLIST.filter((c) => checklist[c.id]).length

  // โหลดรูปเดิมของรายงานวันนี้
  useEffect(() => {
    if (!report?.photoCount) return
    let active = true
    getReportPhotos(report.id)
      .then((pics) => {
        if (!active) return
        setPhotos(pics.map((p) => ({ id: p.id, data: p.data })))
        setExistingPhotoIds(pics.map((p) => p.id))
      })
      .catch((err) => active && setError(errorMessage(err)))
    return () => {
      active = false
    }
  }, [report?.id, report?.photoCount])

  const changePhotos = (next) => {
    setMessage('')
    setPhotos(next)
  }

  const toggle = (id) => {
    setMessage('')
    setChecklist((c) => ({ ...c, [id]: !c[id] }))
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const fields = { checklist, otherDuty: otherDuty.trim(), incidents: incidents.trim() || 'ปกติ' }
      const id = await saveReport({
        id: report?.id,
        fields: report
          ? fields
          : {
              studentsAbsent: 0,
              actions: '',
              suggestions: '',
              ...fields,
              date,
              shift: 'allday',
              uid: user.uid,
              teacherName: profile.displayName,
              teacherUsername: profile.username ?? '',
            },
        photos,
        existingPhotoIds,
      })
      setMessage('บันทึกเรียบร้อยแล้ว')
      onSaved(id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack duty-today" onSubmit={save}>
      <div className="hero">
        <h2>บันทึกการปฏิบัติหน้าที่เวรวันนี้</h2>
        {report && <StatusBadge status={report.status} />}
      </div>
      <fieldset className="field" disabled={locked}>
        <legend>
          หน้าที่ที่ปฏิบัติ ({done}/{CHECKLIST.length})
        </legend>
        <DutyChecklist
          checklist={checklist}
          otherDuty={otherDuty}
          onToggle={toggle}
          onOtherChange={(value) => {
            setMessage('')
            setOtherDuty(value)
            // พิมพ์งานที่ได้รับมอบหมายแล้ว ติ๊กข้อนี้ให้อัตโนมัติ
            if (value.trim()) setChecklist((c) => ({ ...c, [OTHER_DUTY.id]: true }))
          }}
        />
      </fieldset>
      <label className="field">
        <span>บันทึกเหตุการณ์</span>
        <textarea
          rows="4"
          value={incidents}
          onChange={(e) => {
            setMessage('')
            setIncidents(e.target.value)
          }}
          placeholder="เหตุการณ์ที่พบระหว่างปฏิบัติหน้าที่ ถ้าไม่มีให้เว้นว่าง (บันทึกเป็น &quot;ปกติ&quot;)"
          disabled={locked}
        />
      </label>
      <PhotoPicker photos={photos} onChange={changePhotos} onError={setError} disabled={locked} />
      {locked && <p className="muted small">ผู้บริหารรับทราบรายงานนี้แล้ว จึงแก้ไขไม่ได้</p>}
      {error && <p className="error">{error}</p>}
      {message && <p className="highlight">{message}</p>}
      <div className="actions">
        {report && (
          <Link className="btn btn-light" to={report.status === 'submitted' ? `/reports/${report.id}/edit` : `/reports/${report.id}`}>
            {report.status === 'submitted' ? 'เพิ่มรายละเอียด' : 'ดูรายงาน'}
          </Link>
        )}
        {!locked && (
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        )}
      </div>
    </form>
  )
}
