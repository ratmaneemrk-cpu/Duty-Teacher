import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { deleteDoc, deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { AuthContext } from './auth-context'
import { errorMessage } from './utils'

const NO_USER = { name: '', username: '', adminCode: '' }

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // ข้อผิดพลาดตอนเข้าระบบ (เช่น รหัสผ่านผู้ดูแลผิด) แสดงในหน้าเข้าใช้งาน
  const [loginError, setLoginError] = useState('')
  // ข้อมูลของคนที่กำลังเข้าระบบ ใช้สร้างโปรไฟล์หลัง signInAnonymously สำเร็จ
  const newUser = useRef(NO_USER)

  useEffect(() => {
    let unsubProfile = () => {}
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubProfile()
      unsubProfile = () => {}
      setUser(u)
      setError('')
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const ref = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          const { name, username, adminCode } = newUser.current
          newUser.current = NO_USER
          if (!u.isAnonymous || !name) {
            await signOut(auth)
            return
          }
          if (adminCode) {
            // ผู้ดูแล: security rules ตรวจว่ารหัสผ่านตรงกับเอกสารใน adminSecrets
            try {
              await setDoc(ref, { displayName: name, username, role: 'admin', adminCode, createdAt: serverTimestamp() })
            } catch {
              await u.delete().catch(() => signOut(auth))
              setLoginError('รหัสผ่านไม่ถูกต้อง')
              return
            }
            // ไม่เก็บรหัสผ่านไว้ในโปรไฟล์
            await updateDoc(ref, { adminCode: deleteField() })
          } else {
            // ครูได้สิทธิ์ครูทันทีโดยไม่ต้องรออนุมัติ
            await setDoc(ref, { displayName: name, username, role: 'teacher', createdAt: serverTimestamp() })
          }
        }
        unsubProfile = onSnapshot(
          ref,
          (s) => {
            setProfile(s.exists() ? { id: s.id, ...s.data() } : null)
            setLoading(false)
          },
          (err) => {
            setError(errorMessage(err))
            setLoading(false)
          },
        )
      } catch (err) {
        setError(errorMessage(err))
        setLoading(false)
      }
    })
    return () => {
      unsubAuth()
      unsubProfile()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      loginError,
      isAdmin: profile?.role === 'admin',
      isStaff: profile?.role === 'teacher' || profile?.role === 'admin',
      // ครูเข้าด้วยชื่อผู้ใช้งาน (เช่น t016)
      loginAsPerson: (person) => {
        setLoginError('')
        newUser.current = { name: person.name, username: person.username, adminCode: '' }
        return signInAnonymously(auth)
      },
      // ผู้ดูแลเข้าด้วยชื่อผู้ใช้งาน admin และรหัสผ่าน ไม่ต้องใช้อีเมล
      loginWithAdminCode: (code, name) => {
        setLoginError('')
        newUser.current = { name, username: 'admin', adminCode: code }
        return signInAnonymously(auth)
      },
      // รหัสผ่านผู้ดูแลคือ id ของเอกสารใน adminSecrets (อ่านได้เฉพาะผู้ดูแล)
      changeAdminCode: async (currentCode, newCode) => {
        const current = await getDoc(doc(db, 'adminSecrets', currentCode))
        if (!current.exists()) throw new Error('รหัสปัจจุบันไม่ถูกต้อง')
        await setDoc(doc(db, 'adminSecrets', newCode), { createdAt: serverTimestamp() })
        await deleteDoc(current.ref)
      },
      logout: () => signOut(auth),
    }),
    [user, profile, loading, error, loginError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
