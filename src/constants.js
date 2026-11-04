export const SCHOOL_NAME = 'โรงเรียนโคกสีวิทยาสรรค์'

export const SHIFTS = [
  { id: 'morning', label: 'ช่วงเช้า (07:00–08:30 น.)' },
  { id: 'noon', label: 'ช่วงกลางวัน (11:30–13:00 น.)' },
  { id: 'evening', label: 'ช่วงเย็น (15:30–17:00 น.)' },
  { id: 'allday', label: 'ตลอดวัน' },
]

// หน้าที่ครูเวรประจำวัน (ใช้คิดร้อยละการปฏิบัติหน้าที่ในหน้าสรุป)
export const CHECKLIST = [
  { id: 'gate', label: 'รับ/ส่งนักเรียนประตูหน้าโรงเรียน' },
  { id: 'canteen', label: 'ดูแลตรวจความเรียบร้อยโรงอาหาร ซุ้มที่พัก' },
  { id: 'cleaning', label: 'ตรวจความสะอาดทั่วไป อาคารเรียน สวนป่า สนามกีฬา' },
  { id: 'flag', label: 'อบรมนักเรียนหน้าเสาธง (เช้า-เย็น)' },
  { id: 'toilets', label: 'ตรวจความสะอาดห้องน้ำ ชาย-หญิง' },
]

// ข้อสุดท้าย พิมพ์รายละเอียดเองในฟิลด์ otherDuty ของรายงาน (ไม่นับในร้อยละ เพราะไม่ได้มอบหมายทุกวัน)
export const OTHER_DUTY = { id: 'other', label: 'อื่นๆ ที่ได้รับมอบหมาย' }

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
