import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { AuthContext } from './auth-context'
import { errorMessage } from './utils'

const NO_LOGIN = null

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // ข้อผิดพลาดตอนเข้าระบบ (เช่น รหัสผ่านผิด) แสดงในหน้าเข้าใช้งาน
  const [loginError, setLoginError] = useState('')
  // ข้อมูลของคนที่กำลังเข้าระบบ { name, username, role, code } ใช้สร้างโปรไฟล์หลัง signInAnonymously
  const pending = useRef(NO_LOGIN)

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
          const login = pending.current
          pending.current = NO_LOGIN
          if (!u.isAnonymous || !login) {
            await signOut(auth)
            return
          }
          // security rules ตรวจว่ามีรหัสผ่านนี้ในเอกสาร passwords ของชื่อผู้ใช้งานนี้
          try {
            await setDoc(ref, {
              displayName: login.name,
              username: login.username,
              role: login.role,
              loginCode: login.code,
              createdAt: serverTimestamp(),
            })
          } catch {
            await u.delete().catch(() => signOut(auth))
            setLoginError('รหัสผ่านไม่ถูกต้อง')
            return
          }
          // ไม่เก็บรหัสผ่านไว้ในโปรไฟล์
          await updateDoc(ref, { loginCode: deleteField() })
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
      // เข้าระบบด้วยชื่อผู้ใช้งานและรหัสผ่าน (ไม่ใช้อีเมล)
      login: ({ name, username, admin, code }) => {
        setLoginError('')
        pending.current = { name, username, role: admin ? 'admin' : 'teacher', code }
        return signInAnonymously(auth)
      },
      logout: () => signOut(auth),
    }),
    [user, profile, loading, error, loginError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
