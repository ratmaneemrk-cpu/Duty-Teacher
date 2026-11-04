import { parseDateStr, sameName } from './utils'

// คณะครูเวรประจำวัน ตามคำสั่งโรงเรียน (ไฟล์ ตารางครูเวรประจำวัน.pdf)
// คีย์คือวันในสัปดาห์ตาม Date.getDay(): 1 = จันทร์ ... 5 = ศุกร์ คนแรกของแต่ละวันคือหัวหน้าครูเวร
export const DEFAULT_WEEKLY = {
  1: [
    'ว่าที่ ร.ต.หญิง เพชรรัตน์ ประสานเชื้อ',
    'นางสาวสุริยาพร วงศ์ราษี',
    'นางกนกทิพย์ ยาทองไชย',
    'นางลิลลดา วรชินา',
    'นายชานนท์ ดวงจันทร์',
  ],
  2: [
    'นายสุรสิทธิ์ ไกยฝ่าย',
    'นายเชิดศักดิ์ ธิศรี',
    'นายกมล ไสโยธา',
    'นายนิติวัฒน์ บุญรักษา',
    'นายวัชรพงษ์ คำมุข',
    'นายวุฒิพร สำรวมจิต',
  ],
  3: [
    'นางสาวอัมพา ชุมศรี',
    'นายพงษ์ศักดิ์ ลำพอง',
    'นายเสกข์ สกุลโพน',
    'นายภารากร ใจหาญ',
    'นางสาวกันติยา ไชยปัญหา',
  ],
  4: [
    'นางประเสริฐ จันชมภู',
    'นางสาวธนพร สร้อยสูงเนิน',
    'นางสาวขนิษฐา สุวรรณโคตร',
    'ว่าที่ ร.ต.หญิง นุสรา นิสิทธิชัย',
    'นายประชาวิทย์ เดชท้าน',
  ],
  5: [
    'นางนิโลบล คำลือชัย',
    'นายอภิสิทธิ์ วงศ์ราษี',
    'นางสาวอารียา บุญทานันท์',
    'นายยศธนา โลกลินไลน์',
    'นางสาวดาลัด ชาติแพงตา',
    'นางสาวรัตมณี มีรัตน์คำ',
  ],
}

// ชื่อผู้ใช้งานของบุคลากร (โฟลเดอร์ ชื่อผู้ใช้) ชื่อที่ตรงกับตารางเวรจะใช้ตามตารางเวร
const ADMINISTRATION = 'ฝ่ายบริหาร/วิชาการ'
const TEACHER = 'ครูผู้สอน'
const USERNAMES = [
  ['t999', 'ผอ.สราวุธ วิเชียรลม', ADMINISTRATION],
  ['t099', 'นางนงลักษณ์ ชาญนรา', ADMINISTRATION],
  ['t002', 'นางประเสริฐ จันชมภู', TEACHER],
  ['t003', 'นายสุรสิทธิ์ ไกยฝ่าย', TEACHER],
  ['t004', 'นายเชิดศักดิ์ ธิศรี', TEACHER],
  ['t005', 'นางสาวอัมพา ชุมศรี', TEACHER],
  ['t006', 'นายพงษ์ศักดิ์ ลำพอง', TEACHER],
  ['t007', 'ว่าที่ ร.ต.หญิง เพชรรัตน์ ประสานเชื้อ', TEACHER],
  ['t008', 'นางนิโลบล คำลือชัย', TEACHER],
  ['t009', 'นางสาวธนพร สร้อยสูงเนิน', TEACHER],
  ['t010', 'นายเสกข์ สกุลโพน', TEACHER],
  ['t011', 'นางสาวขนิษฐา สุวรรณโคตร', TEACHER],
  ['t012', 'นายอภิสิทธิ์ วงศ์ราษี', TEACHER],
  ['t013', 'นางสาวสุริยาพร วงศ์ราษี', TEACHER],
  ['t014', 'นายกมล ไสโยธา', TEACHER],
  ['t015', 'นายนิติวัฒน์ บุญรักษา', TEACHER],
  ['t016', 'นายภารากร ใจหาญ', TEACHER],
  ['t017', 'นางกนกทิพย์ ยาทองไชย', TEACHER],
  ['t018', 'นางลิลลดา วรชินา', TEACHER],
  ['t019', 'ว่าที่ ร.ต.หญิง นุสรา นิสิทธิชัย', TEACHER],
  ['t020', 'นายวัชรพงษ์ คำมุข', TEACHER],
  ['t021', 'นายประชาวิทย์ เดชท้าน', TEACHER],
  ['t022', 'นางสาวอารียา บุญทานันท์', TEACHER],
  ['t023', 'นายชานนท์ ดวงจันทร์', TEACHER],
  ['t024', 'นางสาวกันติยา ไชยปัญหา', TEACHER],
  ['t025', 'นางสาวดาลัด ชาติแพงตา', TEACHER],
  ['t026', 'นายวุฒิพร สำรวมจิต', TEACHER],
  ['t027', 'นายวิศรุษห์ เจริญชัย', TEACHER],
  ['t028', 'นางสาวรัตมณี มีรัตน์คำ', TEACHER],
  ['t029', 'นายยศธนา โลกลินไลน์', TEACHER],
]

/** รายชื่อบุคลากรเริ่มต้น สำหรับนำเข้าครั้งแรกในหน้าจัดการบุคลากร และใช้เข้าระบบก่อนนำเข้า */
export function defaultPersonnel() {
  return USERNAMES.map(([username, name, position], order) => {
    const [day, names] = Object.entries(DEFAULT_WEEKLY).find(([, list]) => list.some((n) => sameName(n, name))) ?? [0, []]
    const index = names.findIndex((n) => sameName(n, name))
    return { username, name, position, phone: '', dutyDay: Number(day), head: index === 0, order }
  })
}

/** หาบุคลากรจากชื่อผู้ใช้งาน (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
export function findByUsername(list, username) {
  const key = username.trim().toLowerCase()
  return key ? list.find((p) => (p.username ?? '').toLowerCase() === key) : undefined
}

/**
 * สร้างตารางเวรประจำสัปดาห์จากรายชื่อบุคลากร (collection personnel)
 * ถ้ายังไม่มีบุคลากรในระบบ ใช้ตารางตามคำสั่งโรงเรียน
 */
export function buildRoster(personnel) {
  if (!personnel?.length) {
    return { names: Object.values(DEFAULT_WEEKLY).flat(), weekly: DEFAULT_WEEKLY }
  }
  const weekly = {}
  personnel.forEach((p) => {
    if (!p.dutyDay) return
    ;(weekly[p.dutyDay] ??= []).push(p)
  })
  Object.keys(weekly).forEach((day) => {
    // หัวหน้าครูเวรขึ้นก่อน
    weekly[day] = weekly[day].sort((a, b) => Number(b.head) - Number(a.head)).map((p) => p.name)
  })
  return { names: personnel.map((p) => p.name), weekly, heads: new Set(personnel.filter((p) => p.head).map((p) => p.name)) }
}

/** ครูเวรตามตารางประจำสัปดาห์ของวันที่ (YYYY-MM-DD) — วันเสาร์/อาทิตย์ไม่มีเวร */
export function rosterTeachers(date, roster) {
  const names = roster.weekly[parseDateStr(date).getDay()] ?? []
  return names.map((name, i) => ({ uid: '', name, head: roster.heads ? roster.heads.has(name) : i === 0 }))
}

/**
 * ตารางเวรของแต่ละวัน: ถ้าผู้ดูแลจัดเวรเฉพาะวันไว้ (เอกสารใน schedules) ใช้อันนั้น
 * ไม่เช่นนั้นใช้ตารางประจำสัปดาห์
 */
export function scheduleFor(date, overrides, roster) {
  if (overrides[date]) return { ...overrides[date], override: true }
  return { date, teachers: rosterTeachers(date, roster), note: '', override: false }
}
