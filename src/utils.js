const pad = (n) => String(n).padStart(2, '0')

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr() {
  return toDateStr(new Date())
}

export function thisMonthStr() {
  return todayStr().slice(0, 7)
}

export function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatThaiDate(str, withWeekday = true) {
  if (!str) return ''
  return parseDateStr(str).toLocaleDateString('th-TH', {
    weekday: withWeekday ? 'long' : undefined,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatThaiMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

export function formatTimestamp(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

/** วันแรกและวันสุดท้ายของเดือน ในรูปแบบ YYYY-MM-DD */
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${ym}-01`, `${ym}-${pad(last)}`]
}

export function daysInMonth(ym) {
  const [start, end] = monthRange(ym)
  const days = []
  for (let d = parseDateStr(start); toDateStr(d) <= end; d.setDate(d.getDate() + 1)) {
    days.push(toDateStr(d))
  }
  return days
}

/** ย่อรูปเป็น JPEG (data URL) เพื่อเก็บใน Firestore ได้ (จำกัด 1MB ต่อเอกสาร) */
export function compressImage(file, maxSize = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'))
    }
    img.src = url
  })
}

/** ดาวน์โหลดตารางเป็น CSV (ใส่ BOM ให้ Excel อ่านภาษาไทยได้) */
export function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// คำนำหน้าชื่อที่ไม่ใช้ในการเทียบชื่อ (นางสาว ต้องมาก่อน นาง)
const TITLE = /^(ว่าที่\s*(ร\.?\s*ต\.?|ร้อยตรี)\s*(หญิง)?|นางสาว|น\.\s*ส\.|นาง|นาย|ครู|คุณ)\s*/

/**
 * เทียบชื่อครูโดยไม่สนคำนำหน้าและช่องว่าง (ครูเข้าใช้งานด้วยชื่อ จึงใช้ชื่อจับคู่กับตารางเวร)
 * เช่น "นายกมล ไสโยธา" ตรงกับ "กมล  ไสโยธา"
 */
export function sameName(a, b) {
  const norm = (s) => {
    let n = (s ?? '').trim()
    for (let prev; prev !== n; ) {
      prev = n
      n = n.replace(TITLE, '')
    }
    return n.replace(/\s+/g, '')
  }
  return Boolean(norm(a)) && norm(a) === norm(b)
}

export function errorMessage(err) {
  if (!err) return ''
  if (err.code === 'permission-denied') return 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
  if (err.code === 'unavailable') return 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
  return err.message || String(err)
}
