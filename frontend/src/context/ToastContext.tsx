import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastVariant = 'success' | 'error'

export type ToastInput = {
  message: string
  variant?: ToastVariant
}

type ToastItem = ToastInput & {
  id: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback(
    ({ message, variant = 'success' }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const item: ToastItem = { id, message, variant }
      setToasts((prev) => [...prev, item])
      const timer = setTimeout(() => remove(id), AUTO_DISMISS_MS)
      timers.current.set(id, timer)
    },
    [remove]
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-md w-full rounded-xl px-4 py-3 text-sm font-light shadow-lg ring-1 ring-black/5 animate-[toast-in_0.35s_ease-out] ${
              t.variant === 'success'
                ? 'bg-black text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-lg px-1.5 py-0.5 text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
