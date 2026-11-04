import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const reportsCol = () => collection(db, 'reports')
const photosCol = (reportId) => collection(db, 'reports', reportId, 'photos')

export async function getReport(id) {
  const snap = await getDoc(doc(db, 'reports', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getReportPhotos(reportId) {
  const snap = await getDocs(query(photosCol(reportId), orderBy('order')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * บันทึกรายงาน (สร้างใหม่หรือแก้ไข) พร้อมรูปภาพ
 * photos: [{ id?, data }] — รูปที่มี id คือรูปเดิม, ไม่มี id คือรูปใหม่
 */
export async function saveReport({ id, fields, photos, existingPhotoIds = [] }) {
  const payload = { ...fields, photoCount: photos.length, updatedAt: serverTimestamp() }
  let reportId = id
  if (reportId) {
    await updateDoc(doc(db, 'reports', reportId), payload)
  } else {
    const ref = await addDoc(reportsCol(), {
      ...payload,
      status: 'submitted',
      createdAt: serverTimestamp(),
    })
    reportId = ref.id
  }

  // รูปภาพต้องเขียนหลังจากเอกสารรายงานมีอยู่แล้ว เพราะ security rules ตรวจเจ้าของจากรายงาน
  const keep = new Set(photos.filter((p) => p.id).map((p) => p.id))
  const batch = writeBatch(db)
  existingPhotoIds.filter((pid) => !keep.has(pid)).forEach((pid) => {
    batch.delete(doc(db, 'reports', reportId, 'photos', pid))
  })
  photos.forEach((p, order) => {
    // รูปเดิมไม่ต้องส่งข้อมูลรูปซ้ำ อัปเดตแค่ลำดับ
    if (p.id) batch.update(doc(db, 'reports', reportId, 'photos', p.id), { order })
    else batch.set(doc(photosCol(reportId)), { data: p.data, order })
  })
  await batch.commit()
  return reportId
}

export async function deleteReport(id) {
  const photos = await getDocs(photosCol(id))
  const batch = writeBatch(db)
  photos.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  await deleteDoc(doc(db, 'reports', id))
}

export async function acknowledgeReport(id, comment, adminName) {
  await updateDoc(doc(db, 'reports', id), {
    status: 'acknowledged',
    adminComment: comment,
    acknowledgedBy: adminName,
    acknowledgedAt: serverTimestamp(),
  })
}

export async function listMyReports(uid) {
  const snap = await getDocs(query(reportsCol(), where('uid', '==', uid), orderBy('date', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listReportsBetween(start, end) {
  const snap = await getDocs(
    query(reportsCol(), where('date', '>=', start), where('date', '<=', end), orderBy('date', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listSchedulesBetween(start, end) {
  const snap = await getDocs(
    query(collection(db, 'schedules'), where('date', '>=', start), where('date', '<=', end)),
  )
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))
}

/** รายงานก่อนวันที่ (YYYY-MM-DD) ที่ยังมีรูปภาพ */
export async function listReportsWithPhotosBefore(date) {
  const snap = await getDocs(query(reportsCol(), where('date', '<', date)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.photoCount > 0)
}

/** ลบรูปภาพของรายงาน (ตัวรายงานยังอยู่) */
export async function deleteOldPhotos(reportIds) {
  for (const id of reportIds) {
    const photos = await getDocs(photosCol(id))
    const batch = writeBatch(db)
    photos.docs.forEach((d) => batch.delete(d.ref))
    batch.update(doc(db, 'reports', id), { photoCount: 0, photosRemoved: true })
    await batch.commit()
  }
}

/*
 * รหัสผ่านเข้าระบบ: เอกสาร passwords/{ชื่อผู้ใช้งาน}__{รหัสผ่าน} = { username, admin }
 * อ่าน/เขียนได้เฉพาะผู้ดูแล security rules ตรวจว่ามีเอกสารนี้ตอนสร้างบัญชีเข้าใช้งาน
 */
const passwordsCol = () => collection(db, 'passwords')

export function passwordDocId(username, password) {
  return `${username}__${password}`
}

/** ตรวจรหัสผ่านใหม่ คืนข้อความผิดพลาด หรือ '' ถ้าใช้ได้ */
export function passwordProblem(password) {
  if (password.length < 4) return 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
  if (password.length > 50) return 'รหัสผ่านยาวเกิน 50 ตัวอักษร'
  if (/[/\s]/.test(password)) return 'รหัสผ่านห้ามมีช่องว่างหรือเครื่องหมาย /'
  return ''
}

/** ตั้งรหัสผ่านใหม่ของชื่อผู้ใช้งาน (ลบรหัสเดิมทั้งหมด) */
export async function setPassword(username, password, admin) {
  const old = await getDocs(query(passwordsCol(), where('username', '==', username)))
  const batch = writeBatch(db)
  old.docs.forEach((d) => batch.delete(d.ref))
  batch.set(doc(db, 'passwords', passwordDocId(username, password)), {
    username,
    admin: Boolean(admin),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

/** ลบรหัสผ่านทั้งหมดของชื่อผู้ใช้งาน */
export async function deletePasswords(username) {
  const old = await getDocs(query(passwordsCol(), where('username', '==', username)))
  const batch = writeBatch(db)
  old.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/**
 * ให้/ยกเลิกสิทธิ์ผู้ดูแลของบุคลากร: แก้ทั้งรายชื่อบุคลากร รหัสผ่าน และบัญชีที่เข้าใช้งานอยู่
 */
export async function setPersonAdmin(person, admin) {
  const [secrets, accounts] = await Promise.all([
    getDocs(query(passwordsCol(), where('username', '==', person.username))),
    getDocs(query(collection(db, 'users'), where('username', '==', person.username))),
  ])
  const batch = writeBatch(db)
  secrets.docs.forEach((d) => batch.update(d.ref, { admin }))
  if (secrets.empty) {
    batch.set(doc(db, 'passwords', passwordDocId(person.username, person.username)), {
      username: person.username,
      admin,
      updatedAt: serverTimestamp(),
    })
  }
  accounts.docs.forEach((d) => batch.update(d.ref, { role: admin ? 'admin' : 'teacher' }))
  batch.update(doc(db, 'personnel', person.id), { admin, updatedAt: serverTimestamp() })
  await batch.commit()
}
