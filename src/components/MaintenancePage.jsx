import { Wrench } from 'lucide-react'

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display font-bold text-ink text-2xl mb-2">Sistem Dalam Penyelenggaraan</h1>
        <p className="text-charcoal text-sm mb-1">Kami sedang menaik taraf sistem untuk anda.</p>
        <p className="text-mute text-sm mb-8">Sila cuba semula dalam beberapa minit.</p>
        <div className="bg-surface-card border border-hairline rounded-xl px-5 py-4 text-left space-y-1">
          <p className="text-xs font-semibold text-charcoal">System Under Maintenance</p>
          <p className="text-xs text-mute">We are upgrading the system. Please check back shortly.</p>
        </div>
      </div>
    </div>
  )
}
