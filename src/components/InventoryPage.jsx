import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useInventory } from '../hooks/useInventory'
import { useCatalog } from '../hooks/useCatalog'
import {
  Plus, Search, Pencil, Trash2, X, Save, PackagePlus,
  AlertTriangle, Package, ChevronDown, ChevronRight, Layers,
} from 'lucide-react'

/* ─── Catalog modal (add/edit category, item, variant) ─────────────────── */

const CREATE_NEW = '__create_new__'

/* ─── Inline stock link editor on variant rows ──────────────────────────── */

function VariantStockRow({ variant, catId, itemId, stockItems, onUpdate }) {
  const { t } = useLang()
  const [editing, setEditing]     = useState(false)
  const [stockItemId, setStockId] = useState(variant.inventory_item_id || '')
  const [qty, setQty]             = useState(String(variant.qty_per_service ?? 1))
  const [saving, setSaving]       = useState(false)

  const inv = variant.inventory_item

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(catId, itemId, variant.id, {
        name:              variant.name,
        cost_price:        variant.cost_price,
        sell_price:        variant.sell_price,
        inventory_item_id: stockItemId || null,
        qty_per_service:   parseFloat(qty) || 1,
      })
      setEditing(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-xs mt-0.5 text-left hover:opacity-75 transition-opacity block">
        {inv ? (
          <span className="text-primary flex items-center gap-1 flex-wrap">
            📦 {inv.name} × {variant.qty_per_service} {inv.unit}
            <span className={`font-semibold ${inv.quantity <= 0 ? 'text-red-500' : inv.quantity <= (inv.reorder_level || 0) ? 'text-amber-600' : 'text-badge-success'}`}>
              ({inv.quantity} {t('cat_in_stock')})
            </span>
          </span>
        ) : (
          <span className="text-ash flex items-center gap-1">
            <Package className="w-3 h-3" /> {t('cat_link_stock')}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <select value={stockItemId} onChange={e => setStockId(e.target.value)}
        className="flex-1 min-w-0 bg-canvas border border-hairline rounded-lg px-3 py-1.5 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
        <option value="">— {t('cat_pick_stock_ph')} —</option>
        {stockItems.map(i => (
          <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>
        ))}
      </select>
      <input type="text" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}
        placeholder="1"
        className="w-14 bg-canvas border border-hairline rounded-lg px-2 py-1.5 text-xs text-ink text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      <button onClick={save} disabled={saving}
        className="w-7 h-7 bg-primary disabled:bg-stone text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors">
        {saving ? '…' : '✓'}
      </button>
      <button onClick={() => { setEditing(false); setStockId(variant.inventory_item_id || ''); setQty(String(variant.qty_per_service ?? 1)) }}
        className="w-7 h-7 border border-hairline rounded-full flex items-center justify-center text-xs text-charcoal hover:bg-canvas flex-shrink-0 transition-colors">
        ✕
      </button>
    </div>
  )
}

function CatalogModal({ modal, onClose, onSave, stockItems = [], addStockItem }) {
  const { t } = useLang()
  const isVariant  = modal.type === 'variant'
  const isItemAdd  = modal.type === 'item' && modal.mode === 'add'
  const showPrices = isVariant || isItemAdd
  const showStock  = isVariant || isItemAdd

  const [name,       setName]       = useState(modal.data?.name || '')
  const [cost,       setCost]       = useState(modal.data ? String(modal.data.cost_price ?? '') : '')
  const [sell,       setSell]       = useState(modal.data ? String(modal.data.sell_price ?? '') : '')
  const [linkStock,  setLinkStock]  = useState(isItemAdd ? true : !!(modal.data?.inventory_item_id))
  const [stockItemId,setStockItemId]= useState(isItemAdd ? CREATE_NEW : (modal.data?.inventory_item_id || ''))
  const [qtyPerSvc,  setQtyPerSvc]  = useState(modal.data ? String(modal.data.qty_per_service ?? '1') : '1')
  const [newStockUnit, setNewStockUnit] = useState('pcs')
  const [newStockQty,  setNewStockQty]  = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const isCreatingNew = linkStock && stockItemId === CREATE_NEW

  const titles = {
    'cat-add': t('cat_add_category'), 'cat-edit': t('cat_edit_category'),
    'item-add': t('cat_add_item'),    'item-edit': t('cat_edit_item'),
    'variant-add': t('cat_add_variant'), 'variant-edit': t('cat_edit_variant'),
  }

  const handleSave = async () => {
    if (!name.trim()) { setErr(t('cat_name_req')); return }
    if (showPrices && !sell) { setErr(t('cat_sell_req')); return }
    setSaving(true); setErr('')
    try {
      let resolvedStockId = linkStock ? stockItemId || null : null
      if (isCreatingNew && addStockItem) {
        const newItem = await addStockItem({
          name: name.trim(),
          unit: newStockUnit,
          quantity: parseFloat(newStockQty) || 0,
          unit_cost: cost ? parseFloat(cost) : null,
          reorder_level: 0,
          sku: null,
        })
        resolvedStockId = newItem.id
      }
      const base = showPrices ? { name, cost_price: cost, sell_price: sell } : { name }
      const stockFields = showStock
        ? { inventory_item_id: resolvedStockId, qty_per_service: qtyPerSvc }
        : {}
      await onSave({ ...base, ...stockFields })
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inp = 'w-full bg-canvas border border-hairline rounded-full px-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm'
  const lbl = 'text-xs font-semibold text-charcoal mb-1.5 block'
  const selCls = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-6">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-sm max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-hairline flex-shrink-0">
          <div>
            <h3 className="font-display font-bold text-ink">{titles[`${modal.type}-${modal.mode}`]}</h3>
            {isItemAdd && <p className="text-xs text-mute mt-0.5">{t('cat_item_add_hint')}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className={lbl}>{t('cat_name_lbl')} *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !showPrices) handleSave() }}
              placeholder={modal.type === 'cat' ? t('cat_cat_ph') : modal.type === 'item' ? t('cat_item_ph') : t('cat_variant_ph')}
              className={inp} />
          </div>

          {/* Prices */}
          {showPrices && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>{t('cat_cost_lbl')} (RM)</label>
                <input type="text" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className={inp} />
              </div>
              <div>
                <label className={lbl}>{t('cat_sell_lbl')} (RM) *</label>
                <input type="text" inputMode="decimal" value={sell} onChange={e => setSell(e.target.value)} placeholder="0.00" className={inp} />
              </div>
            </div>
          )}

          {/* Stock link */}
          {showStock && (
            <div className="border-t border-hairline pt-3 space-y-3">
              <button type="button" onClick={() => setLinkStock(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-charcoal hover:text-ink transition-colors">
                <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${linkStock ? 'bg-primary' : 'bg-stone'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${linkStock ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
                </div>
                {t('cat_link_stock')}
              </button>

              {linkStock && (
                <>
                  <div>
                    <label className={lbl}>{t('cat_stock_item')}</label>
                    <select value={stockItemId} onChange={e => setStockItemId(e.target.value)} className={selCls}>
                      <option value="">— {t('cat_pick_stock_ph')} —</option>
                      {stockItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>
                      ))}
                      <option value={CREATE_NEW}>+ {t('cat_create_new')}</option>
                    </select>
                  </div>

                  {isCreatingNew && (
                    <div className="bg-surface-bone border border-hairline rounded-lg px-3 py-2.5 space-y-2">
                      <p className="text-xs text-mute">{t('cat_creating_stock_for')} <span className="font-semibold text-charcoal">"{name || '...'}"</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={lbl}>{t('inv_unit')}</label>
                          <select value={newStockUnit} onChange={e => setNewStockUnit(e.target.value)} className={selCls}>
                            {['pcs', 'tin', 'liter', 'kg', 'meter', 'set', 'kotak'].map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>{t('cat_new_qty_lbl')}</label>
                          <input type="text" inputMode="decimal" value={newStockQty}
                            onChange={e => setNewStockQty(e.target.value)} placeholder="0" className={inp} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={lbl}>{t('cat_qty_per_svc')}</label>
                    <input type="text" inputMode="decimal" value={qtyPerSvc} onChange={e => setQtyPerSvc(e.target.value)} placeholder="1" className={inp} />
                  </div>
                </>
              )}
            </div>
          )}

          {err && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</p>}
        </div>

        <div className="p-4 border-t border-hairline flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Catalog Tab ───────────────────────────────────────────────────────── */

function CatalogTab({ workshopId }) {
  const { t } = useLang()
  const {
    categories, loading,
    addCategory, updateCategory, deleteCategory,
    addItem, updateItem, deleteItem,
    addVariant, updateVariant, deleteVariant,
  } = useCatalog(workshopId)
  const { items: stockItems, addItem: addStockItem } = useInventory(workshopId)

  const [openCats,  setOpenCats]  = useState(new Set())
  const [openItems, setOpenItems] = useState(new Set())
  const [modal, setModal] = useState(null)

  const toggleCat  = (id) => setOpenCats(prev  => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleItem = (id) => setOpenItems(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const fmt = (n) => `RM ${Number(n).toFixed(2)}`

  if (loading) return <div className="text-center py-16 text-mute text-sm">{t('loading')}</div>

  return (
    <div className="space-y-3">
      <button onClick={() => setModal({ type: 'cat', mode: 'add' })}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-deep transition-colors">
        <Plus className="w-4 h-4" /> {t('cat_add_category')}
      </button>

      {categories.length === 0 ? (
        <div className="text-center py-16 text-ash">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-charcoal">{t('cat_empty')}</p>
          <p className="text-xs mt-1 text-mute">{t('cat_empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-surface-card rounded-lg border border-hairline overflow-hidden">

              {/* Category row */}
              <div className="flex items-center gap-1 px-3 py-3">
                <button onClick={() => toggleCat(cat.id)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                  {openCats.has(cat.id)
                    ? <ChevronDown className="w-4 h-4 text-mute flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-mute flex-shrink-0" />
                  }
                  <span className="font-semibold text-ink truncate">{cat.name}</span>
                  <span className="text-xs text-ash flex-shrink-0">({(cat.service_items || []).length} item)</span>
                </button>
                <button onClick={() => setModal({ type: 'cat', mode: 'edit', data: cat })}
                  className="w-7 h-7 flex items-center justify-center text-mute hover:text-ink hover:bg-canvas rounded-full transition-colors flex-shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={async () => {
                  if (!window.confirm(`${t('delete')} "${cat.name}"?`)) return
                  try { await deleteCategory(cat.id) } catch (e) { alert(e.message) }
                }} className="w-7 h-7 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Items (expanded) */}
              {openCats.has(cat.id) && (
                <div className="border-t border-hairline">
                  {(cat.service_items || []).map(item => (
                    <div key={item.id} className="border-b border-hairline last:border-b-0">

                      {/* Item row */}
                      <div className="flex items-center gap-1 px-3 py-2.5 pl-7">
                        <button onClick={() => toggleItem(item.id)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                          {openItems.has(item.id)
                            ? <ChevronDown className="w-3.5 h-3.5 text-mute flex-shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-mute flex-shrink-0" />
                          }
                          <span className="font-medium text-charcoal text-sm truncate">{item.name}</span>
                          <span className="text-xs text-ash flex-shrink-0">({(item.service_variants || []).length} varian)</span>
                        </button>
                        <button onClick={() => setModal({ type: 'item', mode: 'edit', data: item, catId: cat.id })}
                          className="w-7 h-7 flex items-center justify-center text-mute hover:text-ink hover:bg-canvas rounded-full transition-colors flex-shrink-0">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={async () => {
                          if (!window.confirm(`${t('delete')} "${item.name}"?`)) return
                          try { await deleteItem(cat.id, item.id) } catch (e) { alert(e.message) }
                        }} className="w-7 h-7 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Variants (expanded) */}
                      {openItems.has(item.id) && (
                        <div className="pl-10 pr-3 pb-3 pt-1 space-y-1.5">
                          {(item.service_variants || []).map(v => (
                            <div key={v.id} className="flex items-center gap-2 bg-canvas rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-ink">{v.name}</span>
                                  <span className="text-xs text-mute">
                                    {t('cat_cost_lbl')}: {fmt(v.cost_price)} ·{' '}
                                    <span className="text-badge-success font-semibold">{t('cat_sell_lbl')}: {fmt(v.sell_price)}</span>
                                  </span>
                                </div>
                                <VariantStockRow
                                  variant={v}
                                  catId={cat.id}
                                  itemId={item.id}
                                  stockItems={stockItems}
                                  onUpdate={updateVariant}
                                />
                              </div>
                              <button onClick={() => setModal({ type: 'variant', mode: 'edit', data: v, itemId: item.id, catId: cat.id })}
                                className="w-6 h-6 flex items-center justify-center text-mute hover:text-ink hover:bg-surface-bone rounded-full transition-colors flex-shrink-0">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={async () => {
                                if (!window.confirm(`${t('delete')} "${v.name}"?`)) return
                                try { await deleteVariant(cat.id, item.id, v.id) } catch (e) { alert(e.message) }
                              }} className="w-6 h-6 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => setModal({ type: 'variant', mode: 'add', itemId: item.id, catId: cat.id })}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary-deep font-semibold mt-1 transition-colors">
                            <Plus className="w-3 h-3" /> {t('cat_add_variant')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add item */}
                  <div className="px-4 py-2.5 pl-9">
                    <button onClick={() => setModal({ type: 'item', mode: 'add', catId: cat.id })}
                      className="flex items-center gap-1 text-xs text-mute hover:text-charcoal font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" /> {t('cat_add_item')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CatalogModal
          modal={modal}
          stockItems={stockItems}
          addStockItem={addStockItem}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            const { type, mode } = modal
            if (type === 'cat') {
              if (mode === 'add') await addCategory(data.name)
              else await updateCategory(modal.data.id, data.name)
            } else if (type === 'item') {
              if (mode === 'add') {
                const item = await addItem(modal.catId, data.name)
                if (data.sell_price && item?.id) {
                  await addVariant(modal.catId, item.id, {
                    name: 'Standard',
                    cost_price: data.cost_price || 0,
                    sell_price: data.sell_price,
                    inventory_item_id: data.inventory_item_id || null,
                    qty_per_service: data.qty_per_service || 1,
                  })
                }
              } else await updateItem(modal.catId, modal.data.id, data.name)
            } else if (type === 'variant') {
              if (mode === 'add') await addVariant(modal.catId, modal.itemId, data)
              else await updateVariant(modal.catId, modal.itemId, modal.data.id, data)
            }
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

/* ─── Stock Tab (original inventory) ───────────────────────────────────── */

const EMPTY_ITEM = { name: '', sku: '', unit: 'pcs', quantity: '', unit_cost: '', reorder_level: '' }

function ItemForm({ initial, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState(initial ? {
    ...EMPTY_ITEM, ...initial,
    quantity:      initial.quantity      ?? '',
    unit_cost:     initial.unit_cost     ?? '',
    reorder_level: initial.reorder_level ?? '',
  } : EMPTY_ITEM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('inv_name_req')); return }
    setSaving(true); setError('')
    try {
      await onSave({
        name:          form.name.trim(),
        sku:           form.sku.trim() || null,
        unit:          form.unit || 'pcs',
        quantity:      form.quantity !== '' ? parseFloat(form.quantity) : 0,
        unit_cost:     form.unit_cost !== '' ? parseFloat(form.unit_cost) : null,
        reorder_level: form.reorder_level !== '' ? parseFloat(form.reorder_level) : 0,
      })
      onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const labelCls = 'text-charcoal text-xs font-semibold mb-1.5 block'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-md max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-hairline flex-shrink-0">
          <h2 className="font-display font-bold text-ink">{initial ? t('inv_edit') : t('inv_new')}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-ash" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className={labelCls}>{t('inv_name_lbl')}</label>
              <input value={form.name} onChange={set('name')} placeholder={t('inv_name_ph')} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('inv_sku')}</label>
                <input value={form.sku} onChange={set('sku')} placeholder={t('inv_sku_ph')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('inv_unit')}</label>
                <select value={form.unit} onChange={set('unit')}
                  className="w-full bg-canvas border border-hairline rounded-lg px-5 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {['pcs', 'tin', 'liter', 'kg', 'meter', 'set', 'kotak'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('inv_qty')}</label>
                <input type="text" inputMode="decimal" value={form.quantity} onChange={set('quantity')} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('inv_reorder')}</label>
                <input type="text" inputMode="decimal" value={form.reorder_level} onChange={set('reorder_level')} placeholder="0" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('inv_cost')}</label>
              <input type="text" inputMode="decimal" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" className={inputCls} />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
          </div>
          <div className="p-4 border-t border-hairline flex-shrink-0">
            <button type="submit" disabled={saving}
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
              <Save className="w-4 h-4" />
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RestockForm({ item, onSave, onClose }) {
  const { t } = useLang()
  const [qty,      setQty]      = useState('')
  const [cost,     setCost]     = useState(item.unit_cost ? String(item.unit_cost) : '')
  const [supplier, setSupplier] = useState('')
  const [saving,   setSaving]   = useState(false)

  const handle = async () => {
    const add = parseFloat(qty)
    if (!add || add <= 0) return
    setSaving(true)
    try {
      const updates = { quantity: (Number(item.quantity) || 0) + add }
      if (cost) updates.unit_cost = parseFloat(cost)
      await onSave(item.id, updates)
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const inp = 'w-full bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-sm flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-hairline">
          <div>
            <h3 className="font-display font-bold text-ink">{t('inv_restock')}</h3>
            <p className="text-xs text-mute mt-0.5">{item.name} — {t('inv_qty')}: {item.quantity} {item.unit}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('inv_restock_qty')} ({item.unit}) *</label>
            <input autoFocus type="text" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="0" className={inp} />
            {qty && parseFloat(qty) > 0 && (
              <p className="text-xs text-badge-success mt-1.5 px-1">
                {item.quantity} → {(Number(item.quantity) || 0) + (parseFloat(qty) || 0)} {item.unit}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('inv_cost')} (RM) — {t('inv_restock_optional')}</label>
            <input type="text" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)}
              placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('inv_restock_supplier')} — {t('inv_restock_optional')}</label>
            <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder={t('inv_restock_supplier_ph')} className={inp} />
          </div>
        </div>
        <div className="p-4 border-t border-hairline">
          <button onClick={handle} disabled={saving || !qty || parseFloat(qty) <= 0}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
            <PackagePlus className="w-4 h-4" />
            {saving ? t('saving') : t('inv_restock_save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function StockTab({ workshopId }) {
  const { t } = useLang()
  const { items, loading, addItem, updateItem, deleteItem } = useInventory(workshopId)
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState(null)
  const [restocking, setRestocking] = useState(null)
  const [filter,     setFilter]     = useState('all')

  const filtered = items.filter(i => {
    if (filter === 'low' && (i.quantity > i.reorder_level)) return false
    if (search) return i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.sku || '').toLowerCase().includes(search.toLowerCase())
    return true
  })

  const lowStock   = items.filter(i => i.reorder_level > 0 && i.quantity <= i.reorder_level)
  const totalValue = items.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_cost || 0)), 0)

  const handleSave = async (data) => {
    if (editing === 'new') await addItem(data)
    else await updateItem(editing.id, data)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`${t('delete')} "${item.name}"?`)) return
    await deleteItem(item.id)
  }

  const handleQtyChange = async (item, delta) => {
    const newQty = Math.max(0, (Number(item.quantity) || 0) + delta)
    await updateItem(item.id, { quantity: newQty })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card rounded-md border border-hairline p-4">
          <p className="text-2xl font-bold font-display text-primary">{items.length}</p>
          <p className="text-charcoal text-xs mt-0.5 font-medium">{t('inv_types')}</p>
        </div>
        <div className={`rounded-md border p-4 ${lowStock.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-surface-card border-hairline'}`}>
          <p className={`text-2xl font-bold font-display ${lowStock.length > 0 ? 'text-amber-600' : 'text-charcoal'}`}>{lowStock.length}</p>
          <p className={`text-xs mt-0.5 font-medium ${lowStock.length > 0 ? 'text-amber-700' : 'text-charcoal'}`}>{t('inv_low')}</p>
        </div>
        <div className="bg-surface-card rounded-md border border-hairline p-4 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold font-display text-ink">
            RM {totalValue.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-charcoal text-xs mt-0.5 font-medium">{t('inv_value')}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('inv_search_ph')}
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-surface-card border border-hairline rounded-lg px-5 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <option value="all">{t('inv_filter_all')}</option>
          <option value="low">{t('inv_filter_low')}</option>
        </select>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-deep text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors">
          <Plus className="w-4 h-4" /> {t('inv_add')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-mute text-sm">{t('inv_loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ash">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-charcoal">{items.length === 0 ? t('inv_empty') : t('inv_no_match')}</p>
          {items.length === 0 && (
            <button onClick={() => setEditing('new')} className="mt-3 text-primary text-sm font-semibold hover:underline">
              {t('inv_add_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface-card rounded-lg border border-hairline overflow-hidden">
          {filtered.map((item, i) => {
            const isLow = item.reorder_level > 0 && item.quantity <= item.reorder_level
            return (
              <div key={item.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < filtered.length - 1 ? 'border-b border-hairline' : ''} ${isLow ? 'bg-amber-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-ink font-semibold text-sm">{item.name}</p>
                    {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </div>
                  {item.sku && <p className="text-ash text-xs mt-0.5">{item.sku}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleQtyChange(item, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-hairline hover:bg-surface-bone text-charcoal font-bold text-base leading-none transition-colors">−</button>
                  <div className="text-center min-w-[3rem]">
                    <p className={`font-bold font-display text-sm leading-tight ${isLow ? 'text-amber-600' : 'text-ink'}`}>
                      {item.quantity} <span className="text-xs font-normal text-mute">{item.unit}</span>
                    </p>
                    {item.unit_cost && (
                      <p className="text-ash text-xs leading-tight">RM {Number(item.unit_cost).toFixed(2)}</p>
                    )}
                  </div>
                  <button onClick={() => handleQtyChange(item, +1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-hairline hover:bg-surface-bone text-charcoal font-bold text-base leading-none transition-colors">+</button>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => setRestocking(item)}
                    title={t('inv_restock')}
                    className="w-8 h-8 flex items-center justify-center text-mute hover:text-badge-success hover:bg-emerald-50 rounded-full transition-colors">
                    <PackagePlus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditing(item)}
                    className="w-8 h-8 flex items-center justify-center text-mute hover:text-ink hover:bg-canvas rounded-full transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="w-8 h-8 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <ItemForm
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {restocking && (
        <RestockForm
          item={restocking}
          onSave={updateItem}
          onClose={() => setRestocking(null)}
        />
      )}
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export function InventoryPage() {
  const { workshop } = useApp()
  const { t } = useLang()
  const [tab, setTab] = useState('catalog')

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 w-fit">
        {[['catalog', t('cat_tab_catalog')], ['stock', t('cat_tab_stock')]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === val ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-charcoal'
            }`}>{label}</button>
        ))}
      </div>

      {tab === 'catalog'
        ? <CatalogTab workshopId={workshop?.id} />
        : <StockTab  workshopId={workshop?.id} />
      }
    </div>
  )
}
