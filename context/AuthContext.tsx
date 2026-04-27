'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Tech } from '@/types'

interface AuthState {
  tech: Tech | null
  centre: string | null
  login: (tech: Tech, centre: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthState>({
  tech: null,
  centre: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tech, setTech] = useState<Tech | null>(null)
  const [centre, setCentre] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('dw_auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        setTech(parsed.tech)
        setCentre(parsed.centre)
      }
    } catch {}
    setIsLoading(false)
  }, [])

  function login(t: Tech, c: string) {
    setTech(t)
    setCentre(c)
    sessionStorage.setItem('dw_auth', JSON.stringify({ tech: t, centre: c }))
  }

  function logout() {
    setTech(null)
    setCentre(null)
    sessionStorage.removeItem('dw_auth')
  }

  return (
    <AuthContext.Provider value={{ tech, centre, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
