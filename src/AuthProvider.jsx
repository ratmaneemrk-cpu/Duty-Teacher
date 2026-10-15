import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { AuthContext } from './auth-context'
import { errorMessage } from './utils'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          await setDoc(ref, {
            displayName: u.displayName || u.email,
            email: u.email,
            photoURL: u.photoURL || '',
            role: 'pending',
            createdAt: serverTimestamp(),
          })
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
      login: () => signInWithPopup(auth, googleProvider),
      logout: () => signOut(auth),
    }),
    [user, profile, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
