import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useLang } from './LanguageContext'

// In-app replacements for window.alert / window.confirm. Native dialogs look foreign,
// block the page, and can be suppressed entirely in in-app browsers (e.g. links opened
// from WhatsApp), which silently skipped confirmations.
//   const { toast, confirm } = useNotify()
//   toast.error(message) · toast.success(message)
//   if (await confirm({ title, message, confirmLabel, tone: 'danger' })) { ... }

const NotifyContext = createContext(null)
let nextId = 1

function ConfirmDialog({ request, onResolve }) {
  const { t } = useLang()
  const ref = useDialogFocus(() => onResolve(false))
  const danger = request.tone === 'danger'
  const Icon = request.icon || (danger ? AlertTriangle : Info)
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={e => { if (e.target === e.currentTarget) onResolve(false) }}>
      <div ref={ref} tabIndex={-1} role="alertdialog" aria-modal="true"
        aria-labelledby="notify-confirm-title" aria-describedby={request.message ? 'notify-confirm-message' : undefined}
        className="w-full max-w-sm rounded-2xl bg-surface-card p-5 shadow-xl animate-slideUp">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-700' : 'bg-primary/10 text-primary'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-1">
            <h2 id="notify-confirm-title" className="font-display text-lg font-bold leading-tight text-ink">{request.title}</h2>
            {request.message && <p id="notify-confirm-message" className="mt-1.5 text-sm leading-relaxed text-charcoal">{request.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => onResolve(false)} className="ui-secondary flex-1">
            {request.cancelLabel || t('cancel')}
          </button>
          <button type="button" onClick={() => onResolve(true)} className={`${danger ? 'ui-danger' : 'ui-primary'} flex-1`}>
            {request.confirmLabel || t('yes')}
          </button>
        </div>
      </div>
    </div>
  )
}

const TOAST_STYLE = {
  success: { Icon: CheckCircle2, icon: 'text-emerald-300' },
  error:   { Icon: AlertTriangle, icon: 'text-red-300' },
  info:    { Icon: Info,          icon: 'text-on-dark/70' },
}

function Toast({ item, onDismiss }) {
  const { t } = useLang()
  const { Icon, icon } = TOAST_STYLE[item.tone] || TOAST_STYLE.info
  useEffect(() => {
    if (!item.duration) return
    const timer = setTimeout(() => onDismiss(item.id), item.duration)
    return () => clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])
  return (
    <div role={item.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-surface-dark py-3 pl-4 pr-2 text-sm text-on-dark shadow-xl animate-slideUp">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${icon}`} aria-hidden="true" />
      <p className="flex-1 leading-snug">{item.message}</p>
      <button type="button" onClick={() => onDismiss(item.id)} aria-label={t('ui_close')}
        className="-my-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-on-dark/70 transition-colors hover:bg-white/10 hover:text-on-dark">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [request, setRequest] = useState(null)
  const resolver = useRef(null)

  const dismiss = useCallback(id => setToasts(list => list.filter(item => item.id !== id)), [])

  const toast = useMemo(() => {
    const push = (message, options = {}) => {
      const tone = options.tone || 'info'
      const item = { id: nextId++, message, tone, duration: options.duration ?? (tone === 'error' ? 7000 : 4000) }
      setToasts(list => [...list.slice(-2), item])
      return item.id
    }
    push.success = (message, options) => push(message, { ...options, tone: 'success' })
    push.error   = (message, options) => push(message, { ...options, tone: 'error' })
    push.info    = (message, options) => push(message, { ...options, tone: 'info' })
    return push
  }, [])

  const confirm = useCallback(options => new Promise(resolve => {
    resolver.current?.(false)
    resolver.current = resolve
    setRequest(options)
  }), [])

  const resolve = useCallback(value => {
    resolver.current?.(value)
    resolver.current = null
    setRequest(null)
  }, [])

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <NotifyContext.Provider value={value}>
      {children}
      {request && createPortal(<ConfirmDialog request={request} onResolve={resolve} />, document.body)}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[4.75rem] z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:top-auto">
          {toasts.map(item => <Toast key={item.id} item={item} onDismiss={dismiss} />)}
        </div>,
        document.body,
      )}
    </NotifyContext.Provider>
  )
}

export const useNotify = () => useContext(NotifyContext)
