import { useState } from 'react'
import { MessageSquarePlus, X, Send, ChevronDown } from 'lucide-react'

const REPORT_EMAIL = 'arif.didie@gmail.com'

export function FeedbackWidget() {
  const [open, setOpen]           = useState(false)
  const [name, setName]           = useState('')
  const [message, setMessage]     = useState('')
  const [sent, setSent]           = useState(false)

  const handleSend = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    const subject = encodeURIComponent('Bug Report — Digital Depot')
    const body    = encodeURIComponent(
      `Nama: ${name.trim() || 'Tanpa nama'}\nURL: ${window.location.href}\n\nMasalah:\n${message.trim()}`
    )
    window.open(`mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`)
    setSent(true)
    setTimeout(() => { setSent(false); setMessage(''); setName(''); setOpen(false) }, 2500)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface-card border border-hairline rounded-2xl shadow-xl w-72 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface-bone">
            <p className="font-semibold text-ink text-sm">Hantar Laporan</p>
            <button onClick={() => setOpen(false)} className="text-ash hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="px-4 py-6 text-center">
              <p className="text-badge-success font-semibold text-sm">Terima kasih!</p>
              <p className="text-mute text-xs mt-1">Laporan anda telah dihantar.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-4 space-y-3">
              <p className="text-charcoal text-xs leading-relaxed">
                Jumpa pepijat atau ada cadangan? Beritahu kami supaya kami boleh perbaiki sistem ini.
              </p>
              <div>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nama anda (pilihan)"
                  className="w-full bg-canvas border border-hairline rounded-full px-4 py-2 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Huraikan masalah atau cadangan anda..."
                  rows={3} required
                  className="w-full bg-canvas border border-hairline rounded-xl px-4 py-2 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                />
              </div>
              <button type="submit" disabled={!message.trim()}
                className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-2.5 flex items-center justify-center gap-2 transition-colors text-sm">
                <Send className="w-3.5 h-3.5" /> Hantar Laporan
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full bg-primary hover:bg-primary-deep text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Hantar laporan / bug report"
      >
        {open
          ? <ChevronDown className="w-5 h-5" />
          : <MessageSquarePlus className="w-5 h-5" />
        }
      </button>
    </div>
  )
}
