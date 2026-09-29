import { useEffect, useRef } from 'react'

// UI-only focus/scroll management. A stack lets the service picker sit above
// the job form without either dialog stealing keyboard focus from the other.
const dialogs = []
let previousOverflow = ''

export function useDialogFocus(onClose) {
  const root = useRef(null)
  const opener = useRef(document.activeElement)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])

  useEffect(() => {
    const node = root.current
    if (!node) return
    if (!dialogs.length) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    dialogs.push(node)
    const controls = () => [...node.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.getClientRects().length > 0)
    if (!node.contains(document.activeElement)) (controls()[0] || node).focus()
    const onKey = event => {
      if (dialogs.at(-1) !== node) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        close.current()
      }
      if (event.key === 'Tab') {
        const items = controls()
        const first = items[0] || node
        const last = items.at(-1) || node
        if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
          event.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const wasTop = dialogs.at(-1) === node
      const index = dialogs.indexOf(node)
      if (index !== -1) dialogs.splice(index, 1)
      if (!dialogs.length) document.body.style.overflow = previousOverflow
      if (wasTop && opener.current?.isConnected) opener.current.focus()
    }
  }, [])
  return root
}
