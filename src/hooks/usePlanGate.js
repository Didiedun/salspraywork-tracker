import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useNotify } from '../context/NotifyContext'

// Explains a plan limit and offers the way out (Settings → subscription) instead of a
// dead-end alert. Usage: const planGate = usePlanGate(); planGate('plan_limit_jobs')
export function usePlanGate() {
  const { confirm } = useNotify()
  const { t } = useLang()
  const navigate = useNavigate()
  return async (messageKey, titleKey = 'plan_limit_title') => {
    const upgrade = await confirm({
      title: t(titleKey),
      message: t(messageKey),
      confirmLabel: t('plan_banner_cta'),
      cancelLabel: t('ui_close'),
    })
    if (upgrade) navigate('/settings#langganan')
  }
}
