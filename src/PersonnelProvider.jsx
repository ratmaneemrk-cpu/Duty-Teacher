import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { PersonnelContext } from './personnel-context'
import { buildRoster, defaultPersonnel } from './roster'
import { errorMessage } from './utils'

/** เรียงตามวันเวร (ไม่มีเวรไว้ท้าย) หัวหน้าครูเวรก่อน แล้วตามลำดับที่เพิ่ม */
function comparePersonnel(a, b) {
  return (
    (a.dutyDay || 9) - (b.dutyDay || 9) ||
    Number(b.head) - Number(a.head) ||
    (a.order ?? 0) - (b.order ?? 0) ||
    a.name.localeCompare(b.name, 'th')
  )
}

export default function PersonnelProvider({ children }) {
  // null = กำลังโหลด
  const [personnel, setPersonnel] = useState(null)
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'personnel'),
        (snap) => {
          setPersonnel(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(comparePersonnel))
          setError('')
        },
        (err) => {
          // อ่านไม่ได้ก็ยังใช้ตารางเวรเริ่มต้นได้
          setPersonnel([])
          setError(errorMessage(err))
        },
      ),
    [],
  )

  const value = useMemo(
    () => ({
      personnel,
      // รายชื่อที่ใช้เข้าระบบ: ถ้ายังไม่ได้นำเข้าบุคลากร ใช้รายชื่อเริ่มต้น
      directory: personnel?.length ? personnel : defaultPersonnel(),
      error,
      roster: buildRoster(personnel),
    }),
    [personnel, error],
  )

  return <PersonnelContext.Provider value={value}>{children}</PersonnelContext.Provider>
}
