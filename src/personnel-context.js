import { createContext, useContext } from 'react'

export const PersonnelContext = createContext(null)

export function usePersonnel() {
  return useContext(PersonnelContext)
}
