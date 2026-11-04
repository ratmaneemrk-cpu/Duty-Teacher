export const SCHOOL_NAME = 'โรงเรียนโคกสีวิทยาสรรค์'

// บัญชีผู้ดูแลระบบที่เข้าด้วยรหัส (Firebase Email/Password) ต้องตรงกับใน firestore.rules
export const ADMIN_EMAIL = 'admin@duty-teacher.web.app'

export const SHIFTS = [
  { id: 'morning', label: 'ช่วงเช้า (07:00–08:30 น.)' },
  { id: 'noon', label: 'ช่วงกลางวัน (11:30–13:00 น.)' },
  { id: 'evening', label: 'ช่วงเย็น (15:30–17:00 น.)' },
  { id: 'allday', label: 'ตลอดวัน' },
]

export const CHECKLIST = [
  { id: 'gate', label: 'ยืนรับนักเรียนบริเวณประตูโรงเรียน' },
  { id: 'flag', label: 'ควบคุมดูแลกิจกรรมหน้าเสาธง' },
  { id: 'canteen', label: 'ดูแลความเรียบร้อยโรงอาหาร' },
  { id: 'cleaning', label: 'ตรวจความสะอาดบริเวณโรงเรียน' },
  { id: 'buildings', label: 'ตรวจอาคารเรียน ปิดไฟ/พัดลม/ประตูหน้าต่าง' },
  { id: 'safety', label: 'ตรวจความปลอดภัยรอบบริเวณโรงเรียน' },
  { id: 'dismissal', label: 'ดูแลนักเรียนกลับบ้าน' },
]

export const ROLES = {
  pending: 'รออนุมัติ',
  teacher: 'ครู',
  admin: 'ผู้ดูแลระบบ',
}

export const WEEKDAYS = {
  0: 'ไม่มีเวร',
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัสบดี',
  5: 'ศุกร์',
}

export const STATUS = {
  submitted: 'ส่งแล้ว',
  acknowledged: 'รับทราบแล้ว',
}

export const MAX_PHOTOS = 4

export function shiftLabel(id) {
  return SHIFTS.find((s) => s.id === id)?.label ?? id
}
