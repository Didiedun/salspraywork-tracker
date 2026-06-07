import { useState } from 'react'
import { X, Search, ChevronDown, ChevronRight, Tag, Plus, Pencil } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useLang } from '../context/LanguageContext'

function StockBadge({ item }) {
  if (!item) return null
  const qty = item.quantity || 0
  const reorder = item.reorder_level || 0
  if (qty <= 0)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">{qty} {item.unit}</span>
  if (reorder > 0 && qty <= reorder)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{qty} {item.unit}</span>
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">{qty} {item.unit}</span>
}

export function CatalogPicker({ workshopId, onSelect, onClose }) {
  const { t } = useLang()
  const { categories, loading } = useCatalog(workshopId)
  const [search, setSearch] = useState('')
  const [openCats, setOpenCats] = useState(new Set())
  const [showManual, setShowManual] = useState(false)
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmt,  setManualAmt]  = useState('')

  const toggleCat = (id) => setOpenCats(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  const q = search.toLowerCase()
  const filtered = q
    ? categories.map(cat => ({
        ...cat,
        service_items: (cat.service_items || []).filter(item =>
          item.name.toLowerCase().includes(q) ||
          (item.service_variants || []).some(v => v.name.toLowerCase().includes(q))
        ),
      })).filter(cat => cat.service_items.length > 0)
    : categories

  const fmt = (n) => `RM ${Number(n).toFixed(2)}`

  const handleSelect = (description, amount, variant, categoryName) => {
    onSelect(description, amount, {
      inventory_item_id: variant.inventory_item_id || null,
      qty_per_service:   variant.qty_per_service   || 1,
      category_name:     categoryName              || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-hairline flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-ink">{t('cat_pick_title')}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-hairline flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
              placeholder={t('cat_pick_search')}
              className="w-full bg-canvas border border-hairline rounded-full pl-9 pr-4 py-2 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-mute text-sm">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-ash">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('cat_pick_empty')}</p>
            </div>
          ) : (
            filtered.map(cat => (
              <div key={cat.id}>
                <button onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-bone border-b border-hairline text-left hover:bg-surface-card transition-colors">
                  {(openCats.has(cat.id) || !!q)
                    ? <ChevronDown className="w-3.5 h-3.5 text-mute flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-mute flex-shrink-0" />
                  }
                  <span className="font-semibold text-charcoal text-sm">{cat.name}</span>
                  <span className="text-xs text-ash ml-auto">{(cat.service_items || []).length} item</span>
                </button>

                {(openCats.has(cat.id) || !!q) && (cat.service_items || []).map(item => {
                  const variants = item.service_variants || []
                  if (variants.length === 0) {
                    return (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 pl-9 border-b border-hairline opacity-40">
                        <span className="text-sm text-charcoal">{item.name}</span>
                        <span className="text-xs text-ash">{t('cat_no_price')}</span>
                      </div>
                    )
                  }
                  if (variants.length === 1) {
                    const v = variants[0]
                    const outOfStock = v.inventory_item && (v.inventory_item.quantity || 0) <= 0
                    return (
                      <button key={item.id}
                        onClick={() => !outOfStock && handleSelect(item.name, String(v.sell_price), v, cat.name)}
                        disabled={outOfStock}
                        className={`w-full flex items-center justify-between px-4 py-3 pl-9 border-b border-hairline text-left transition-colors ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-bone'}`}>
                        <div className="min-w-0">
                          <span className="text-sm text-ink">{item.name}</span>
                          {v.inventory_item && (
                            <div className="mt-0.5"><StockBadge item={v.inventory_item} /></div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-primary ml-2 flex-shrink-0">{fmt(v.sell_price)}</span>
                      </button>
                    )
                  }
                  return (
                    <div key={item.id} className="border-b border-hairline">
                      <div className="px-4 py-2 pl-9 bg-canvas/50">
                        <span className="text-sm font-semibold text-charcoal">{item.name}</span>
                      </div>
                      {variants.map(v => {
                        const outOfStock = v.inventory_item && (v.inventory_item.quantity || 0) <= 0
                        return (
                          <button key={v.id}
                            onClick={() => !outOfStock && handleSelect(`${item.name} (${v.name})`, String(v.sell_price), v, cat.name)}
                            disabled={outOfStock}
                            className={`w-full flex items-center justify-between px-4 py-2.5 pl-12 border-b border-hairline/50 last:border-b-0 text-left transition-colors ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-bone'}`}>
                            <div className="min-w-0">
                              <span className="text-sm text-charcoal">{v.name}</span>
                              {v.inventory_item && (
                                <div className="mt-0.5"><StockBadge item={v.inventory_item} /></div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-primary ml-2 flex-shrink-0">{fmt(v.sell_price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))
          )}

          {/* Manual / custom service entry */}
          {!loading && !q && (
            <div className="border-t-2 border-hairline">
              {!showManual ? (
                <button onClick={() => setShowManual(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-bone transition-colors">
                  <div className="w-8 h-8 rounded-full border border-dashed border-ash flex items-center justify-center flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5 text-ash" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{t('cat_pick_custom')}</p>
                    <p className="text-xs text-ash">{t('cat_pick_custom_sub')}</p>
                  </div>
                </button>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">{t('cat_pick_custom')}</p>
                    <button onClick={() => { setShowManual(false); setManualDesc(''); setManualAmt('') }}
                      className="text-xs text-mute hover:text-charcoal transition-colors">{t('cat_pick_cancel')}</button>
                  </div>
                  <input value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                    autoFocus
                    placeholder={t('form_svc_desc_ph')}
                    className="w-full bg-canvas border border-hairline rounded-full px-4 py-2.5 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute font-medium pointer-events-none">RM</span>
                      <input value={manualAmt} onChange={e => setManualAmt(e.target.value)}
                        placeholder="0.00" type="text" inputMode="decimal"
                        className="w-full bg-canvas border border-hairline rounded-full pl-11 pr-4 py-2.5 text-sm text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <button
                      onClick={() => {
                        if (!manualDesc.trim()) return
                        onSelect(manualDesc.trim(), manualAmt || '0', null)
                      }}
                      disabled={!manualDesc.trim()}
                      className="bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" /> {t('add')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
