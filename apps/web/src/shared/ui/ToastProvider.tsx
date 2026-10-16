import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { AppIcon } from './AppIcon'
import { Button } from './Button'

export type ToastTone = 'danger' | 'info' | 'success'

interface ToastMessage {
  id: string
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  dismiss(id: string): void
  show(message: string, tone?: ToastTone): void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    setMessages((current) => [...current.slice(-2), { id, message, tone }])
  }, [])

  const value = useMemo(() => ({ dismiss, show }), [dismiss, show])

  return (
    <ToastContext value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {messages.map((message) => (
          <div
            className={`toast toast--${message.tone}`}
            key={message.id}
            role={message.tone === 'danger' ? 'alert' : 'status'}
          >
            <AppIcon
              name={message.tone === 'success' ? 'check' : 'warning'}
            />
            <span>{message.message}</span>
            <Button
              aria-label="Fechar aviso"
              onClick={() => dismiss(message.id)}
              variant="ghost"
            >
              Fechar
            </Button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
