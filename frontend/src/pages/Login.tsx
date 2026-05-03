import { LockPasswordIcon, Mail02Icon } from 'hugeicons-react'
import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function Login() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, loading, login, signup } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-sm text-gray-600">
        Checking session…
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const getErrorMessage = (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message
      return typeof msg === 'string' ? msg : 'Something went wrong'
    }
    return 'Something went wrong'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    try {
      setSubmitting(true)
      if (authMode === 'signin') {
        await login(email.trim(), password)
        showToast({ message: 'Logged in successfully!', variant: 'success' })
      } else {
        await signup(email.trim(), password)
        showToast({ message: 'User successfully registered!', variant: 'success' })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast({ message: getErrorMessage(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen w-full">
      <div className="relative flex w-1/2 flex-col items-center justify-center">
        <div className="absolute left-10 top-10 font-bold text-3xl">LBMS</div>
        <div>
          <h1 className="text-center text-4xl font-semibold">
            {authMode === 'signin' ? 'Welcome Back' : 'Create account'}
          </h1>
          <p className="text-center text-[13px] text-gray-600">
            {authMode === 'signin'
              ? 'Welcome back, please enter your details.'
              : 'Sign up with your email and password.'}
          </p>
        </div>
        <div className="mt-5">
          <div className="relative w-[350px] rounded-2xl bg-gray-100 p-2">
            <div
              className={`absolute left-2 top-2 h-[calc(100%-16px)] w-[calc(50%-8px)] rounded-2xl bg-white shadow-sm transition-transform duration-300 ease-out ${
                authMode === 'signin' ? 'translate-x-0' : 'translate-x-full'
              }`}
            />
            <div className="relative z-10 grid grid-cols-2 gap-2 text-md">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`w-full rounded-2xl px-9 py-3 transition-colors duration-300 ${
                  authMode === 'signin' ? 'text-black' : 'text-gray-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`w-full rounded-2xl px-9 py-3 transition-colors duration-300 ${
                  authMode === 'signup' ? 'text-black' : 'text-gray-600'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="flex w-[350px] items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2">
              <Mail02Icon />
              <input
                type="email"
                autoComplete="email"
                placeholder="example@lbms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-transparent py-1 outline-none"
              />
            </div>
            <div className="flex w-[350px] items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2">
              <LockPasswordIcon />
              <input
                type="password"
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="*******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="flex-1 bg-transparent py-1 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl border-none bg-black px-9 py-3 text-white disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
      <div className="w-1/2 overflow-hidden">
        <img
          src="/library gif.gif"
          alt=""
          className="h-full w-full rounded-l-5xl object-cover"
        />
      </div>
    </div>
  )
}

export default Login
