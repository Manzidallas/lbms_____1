import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  signup: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: AuthUser }>('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshMe()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ user: AuthUser }>('/api/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ user: AuthUser }>('/api/auth/signup', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshMe,
    }),
    [user, loading, login, signup, logout, refreshMe]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
