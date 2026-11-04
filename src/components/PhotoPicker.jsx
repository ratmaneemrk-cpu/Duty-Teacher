import { useState } from 'react'
import { MAX_PHOTOS } from '../constants'
import { compressImage, errorMessage } from '../utils'

/**
 * เลือก/ลบรูปภาพประกอบรายงาน (ย่อขนาดในเบราว์เซอร์ก่อนเก็บ)
 * photos: [{ id?, data }] — รูปที่มี id คือรูปเดิมในฐานข้อมูล
 */
export default function PhotoPicker({ photos, onChange, onError, disabled }) {
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState('')

  const addPhotos = async (e) => {
    const all = [...e.target.files]
    const room = MAX_PHOTOS - photos.length
    const files = all.slice(0, room)
    e.target.value = ''
    setNotice(all.length > room ? `เพิ่มได้อีก ${room} รูป ระบบใช้ ${room} รูปแรกที่เลือก` : '')
    setProcessing(true)
    const added = []
    try {
      // ย่อทีละรูป เพื่อไม่ให้มือถือหน่วยความจำเต็มเมื่อเลือกรูปใหญ่หลายรูปพร้อมกัน
      for (const f of files) added.push({ data: await compressImage(f) })
    } catch (err) {
      onError(errorMessage(err))
    } finally {
      if (added.length) onChange([...photos, ...added])
      setProcessing(false)
    }
  }

  return (
    <div className="field">
      <span>รูปภาพประกอบ (ไม่เกิน {MAX_PHOTOS} รูป)</span>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div key={p.id ?? `new-${i}`} className="photo">
            <img src={p.data} alt={`รูปที่ ${i + 1}`} />
            {!disabled && (
              <button
                type="button"
                className="photo-remove"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                aria-label="ลบรูป"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {processing && <div className="photo photo-add">กำลังย่อรูป...</div>}
        {!disabled && !processing && photos.length < MAX_PHOTOS && (
          <label className="photo photo-add">
            <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
            + เพิ่มรูป
          </label>
        )}
      </div>
      {notice && <p className="muted small">{notice}</p>}
    </div>
  )
}
