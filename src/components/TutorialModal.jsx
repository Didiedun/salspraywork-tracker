import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, LayoutDashboard, PlusCircle, ArrowRightLeft, Printer, ExternalLink, Settings } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const STEPS = [
  { icon: LayoutDashboard, color: 'bg-blue-50 text-blue-600',   titleKey: 'tut_s1_title', descKey: 'tut_s1_desc' },
  { icon: PlusCircle,      color: 'bg-green-50 text-green-600', titleKey: 'tut_s2_title', descKey: 'tut_s2_desc' },
  { icon: ArrowRightLeft,  color: 'bg-amber-50 text-amber-600', titleKey: 'tut_s3_title', descKey: 'tut_s3_desc' },
  { icon: Printer,         color: 'bg-purple-50 text-purple-600', titleKey: 'tut_s4_title', descKey: 'tut_s4_desc' },
  { icon: ExternalLink,    color: 'bg-teal-50 text-teal-600',   titleKey: 'tut_s5_title', descKey: 'tut_s5_desc' },
  { icon: Settings,        color: 'bg-rose-50 text-rose-600',   titleKey: 'tut_s6_title', descKey: 'tut_s6_desc' },
]

export function TutorialModal({ onClose }) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const s    = STEPS[step]
  const Icon = s.icon
  const isLast = step === STEPS.length - 1

  return createPortal(
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-hairline flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
          <p className="font-semibold text-ink text-sm">{t('tut_title')} · {step + 1}/{STEPS.length}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="px-6 py-8 text-center">
          <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center mx-auto mb-5`}>
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-ink text-xl mb-3">{t(s.titleKey)}</h2>
          <p className="text-charcoal text-sm leading-relaxed">{t(s.descKey)}</p>
        </div>

        <div className="flex justify-center gap-2 pb-2">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`transition-all rounded-full ${i === step ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-hairline hover:bg-ash'}`} />
          ))}
        </div>

        <div className="flex gap-3 px-5 py-5">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            className="flex-1 flex items-center justify-center gap-1.5 border border-hairline text-charcoal font-semibold rounded-full py-2.5 text-sm disabled:opacity-30 hover:bg-canvas transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t('tut_prev')}
          </button>
          {isLast
            ? <button onClick={onClose}
                className="flex-1 bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-2.5 text-sm transition-colors">
                {t('tut_done')}
              </button>
            : <button onClick={() => setStep(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-2.5 text-sm transition-colors">
                {t('tut_next')} <ChevronRight className="w-4 h-4" />
              </button>
          }
        </div>
      </div>
    </div>,
    document.body
  )
}
