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
    const ref = p.id ? doc(db, 'reports', reportId, 'photos', p.id) : doc(photosCol(reportId))
    batch.set(ref, { data: p.data, order })
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
