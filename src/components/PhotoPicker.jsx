import { MAX_PHOTOS } from '../constants'
import { compressImage, errorMessage } from '../utils'

/**
 * เลือก/ลบรูปภาพประกอบรายงาน (ย่อขนาดในเบราว์เซอร์ก่อนเก็บ)
 * photos: [{ id?, data }] — รูปที่มี id คือรูปเดิมในฐานข้อมูล
 */
export default function PhotoPicker({ photos, onChange, onError, disabled }) {
  const addPhotos = async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    try {
      const datas = await Promise.all(files.map((f) => compressImage(f)))
      onChange([...photos, ...datas.map((data) => ({ data }))])
    } catch (err) {
      onError(errorMessage(err))
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
        {!disabled && photos.length < MAX_PHOTOS && (
          <label className="photo photo-add">
            <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
            + เพิ่มรูป
          </label>
        )}
      </div>
    </div>
  )
}
