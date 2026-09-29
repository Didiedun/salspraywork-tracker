import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useLang } from '../context/LanguageContext'

// Full-screen photo viewer. Escape, the close button or a tap outside the photo closes it.
export function Lightbox({ src, alt = '', onClose }) {
  const { t } = useLang()
  const ref = useDialogFocus(onClose)
  return createPortal(
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={alt || t('card_photos_lbl')}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/85 p-4" onClick={onClose}>
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg" onClick={e => e.stopPropagation()} />
      <button type="button" onClick={onClose} aria-label={t('ui_close')}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink">
        <X className="h-5 w-5" />
      </button>
    </div>,
    document.body,
  )
}
