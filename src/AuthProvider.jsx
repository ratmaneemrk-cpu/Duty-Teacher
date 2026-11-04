import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { AuthContext } from './auth-context'
import { ADMIN_EMAIL } from './constants'
import { errorMessage } from './utils'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // ชื่อและชื่อผู้ใช้งานของคนที่กำลังเข้าระบบ ใช้สร้างโปรไฟล์หลังเข้าระบบสำเร็จ
  const newUser = useRef({ name: '', username: '' })

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
          if (u.isAnonymous) {
            // ครูที่เข้าด้วยชื่อ ได้สิทธิ์ครูทันทีโดยไม่ต้องรออนุมัติ
            const { name, username } = newUser.current
            newUser.current = { name: '', username: '' }
            if (!name) {
              await signOut(auth)
              return
            }
            await setDoc(ref, {
              displayName: name,
              username,
              email: '',
              photoURL: '',
              role: 'teacher',
              createdAt: serverTimestamp(),
            })
          } else if (u.email === ADMIN_EMAIL) {
            // บัญชีรหัสผู้ดูแลระบบ ได้สิทธิ์ผู้ดูแลทันที
            await setDoc(ref, {
              displayName: newUser.current.name || 'ผู้ดูแลระบบ',
              username: 'admin',
              email: u.email,
              photoURL: '',
              role: 'admin',
              createdAt: serverTimestamp(),
            })
          } else {
            await setDoc(ref, {
              displayName: u.displayName || u.email,
              email: u.email,
              photoURL: u.photoURL || '',
              role: 'pending',
              createdAt: serverTimestamp(),
            })
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
      isAdmin: profile?.role === 'admin',
      isStaff: profile?.role === 'teacher' || profile?.role === 'admin',
      // ครูเข้าด้วยชื่อผู้ใช้งาน (เช่น t016) ไม่ต้องใช้อีเมล
      loginAsPerson: (person) => {
        newUser.current = { name: person.name, username: person.username }
        return signInAnonymously(auth)
      },
      isAdminCode: user?.email === ADMIN_EMAIL,
      // ผู้ดูแลเข้าด้วยชื่อผู้ใช้งาน admin และรหัสผ่าน (อีเมลภายในระบบ ผู้ใช้ไม่ต้องรู้)
      loginWithAdminCode: (code, name) => {
        newUser.current = { name, username: 'admin' }
        return signInWithEmailAndPassword(auth, ADMIN_EMAIL, code)
      },
      changeAdminCode: async (currentCode, newCode) => {
        await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(ADMIN_EMAIL, currentCode))
        await updatePassword(auth.currentUser, newCode)
      },
      logout: () => signOut(auth),
    }),
    [user, profile, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
