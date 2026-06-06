import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useInventory } from '../hooks/useInventory'
import { Plus, Search, Pencil, Trash2, X, Save, AlertTriangle, Package } from 'lucide-react'

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
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-card rounded-lg border border-hairline w-full max-w-md max-h-[90vh] flex flex-col">
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
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm border-2 border-primary hover:border-primary-deep disabled:border-stone">
              <Save className="w-4 h-4" />
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function InventoryPage() {
  const { workshop } = useApp()
  const { t } = useLang()
  const { items, loading, addItem, updateItem, deleteItem } = useInventory(workshop?.id)

  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState(null)
  const [filter, setFilter]   = useState('all')

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
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
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
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
          <p className="font-semibold text-charcoal">
            {items.length === 0 ? t('inv_empty') : t('inv_no_match')}
          </p>
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
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold font-display ${isLow ? 'text-amber-600' : 'text-ink'}`}>
                    {item.quantity} <span className="text-xs font-normal text-mute">{item.unit}</span>
                  </p>
                  {item.unit_cost && (
                    <p className="text-ash text-xs">RM {Number(item.unit_cost).toFixed(2)}/{item.unit}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
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
    </div>
  )
}
