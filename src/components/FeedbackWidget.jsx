import { useEffect, useState } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useLang } from '../context/LanguageContext'

const REPORT_EMAIL = 'arif.didie@gmail.com'
const OPEN_EVENT = 'dd:open-feedback'

// Opens the report dialog from anywhere (menus, the worker app).
export const openFeedback = () => window.dispatchEvent(new Event(OPEN_EVENT))

function FeedbackDialog({ onClose }) {
  const { t } = useLang()
  const ref = useDialogFocus(onClose)
  const [name, setName]       = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent]       = useState(false)

  useEffect(() => {
    if (!sent) return
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [sent, onClose])

  const handleSend = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    const subject = encodeURIComponent('Bug Report — Digital Depot')
    const body    = encodeURIComponent(
      `Nama: ${name.trim() || 'Tanpa nama'}\nURL: ${window.location.href}\n\nMasalah:\n${message.trim()}`
    )
    window.open(`mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`)
    setSent(true)
  }

  const field = 'w-full bg-canvas border border-hairline px-4 py-2.5 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-hairline bg-surface-card shadow-xl animate-slideUp">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 id="feedback-title" className="font-display text-base font-bold text-ink">{t('fb_title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('ui_close')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-mute transition-colors hover:bg-canvas hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-4 py-8 text-center" role="status">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-badge-success" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">{t('fb_thanks')}</p>
            <p className="mt-1 text-xs text-mute">{t('fb_thanks_sub')}</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3 p-4">
            <p className="text-xs leading-relaxed text-charcoal">{t('fb_intro')}</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name"
              aria-label={t('fb_name_ph')} placeholder={t('fb_name_ph')} className={`${field} rounded-full`} />
            <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)} rows={4} required
              aria-label={t('fb_msg_ph')} placeholder={t('fb_msg_ph')} className={`${field} resize-none rounded-xl`} />
            <button type="submit" disabled={!message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:bg-stone">
              <Send className="h-3.5 w-3.5" /> {t('fb_send')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// In the app the dialog is opened from the menu; `launcher` adds the floating
// button used on the public landing page.
export function FeedbackWidget({ launcher = false }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  return (
    <>
      {launcher && (
        <button type="button" onClick={() => setOpen(true)} aria-label={t('fb_title')} title={t('fb_title')}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-deep">
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      )}
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  )
}
