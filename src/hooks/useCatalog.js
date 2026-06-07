import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VARIANT_SELECT = '*, inventory_item:inventory_item_id(id, name, quantity, unit, reorder_level)'

export function useCatalog(workshopId) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workshopId) { setLoading(false); return }
    const { data } = await supabase
      .from('service_categories')
      .select(`*, service_items(*, service_variants(${VARIANT_SELECT}))`)
      .eq('workshop_id', workshopId)
      .order('sort_order')
    const sorted = (data || []).map(c => ({
      ...c,
      service_items: (c.service_items || []).sort((a, b) => a.sort_order - b.sort_order),
    }))
    setCategories(sorted)
    setLoading(false)
  }, [workshopId])

  useEffect(() => { load() }, [load])

  const addCategory = async (name) => {
    const { data, error } = await supabase
      .from('service_categories')
      .insert([{ name: name.trim(), workshop_id: workshopId, sort_order: categories.length }])
      .select().single()
    if (error) throw error
    setCategories(prev => [...prev, { ...data, service_items: [] }])
  }

  const updateCategory = async (id, name) => {
    const { error } = await supabase
      .from('service_categories').update({ name: name.trim() }).eq('id', id)
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() } : c))
  }

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('service_categories').delete().eq('id', id)
    if (error) throw error
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const addItem = async (categoryId, name) => {
    const cat = categories.find(c => c.id === categoryId)
    const { data, error } = await supabase
      .from('service_items')
      .insert([{ name: name.trim(), category_id: categoryId, workshop_id: workshopId, sort_order: (cat?.service_items || []).length }])
      .select().single()
    if (error) throw error
    const newItem = { ...data, service_variants: [] }
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: [...(c.service_items || []), newItem] }
      : c))
    return newItem
  }

  const updateItem = async (categoryId, itemId, name) => {
    const { error } = await supabase
      .from('service_items').update({ name: name.trim() }).eq('id', itemId)
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: c.service_items.map(i => i.id === itemId ? { ...i, name: name.trim() } : i) }
      : c))
  }

  const deleteItem = async (categoryId, itemId) => {
    const { error } = await supabase.from('service_items').delete().eq('id', itemId)
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: c.service_items.filter(i => i.id !== itemId) }
      : c))
  }

  const addVariant = async (categoryId, itemId, { name, cost_price, sell_price, inventory_item_id, qty_per_service }) => {
    const { data, error } = await supabase
      .from('service_variants')
      .insert([{
        name: name.trim(), item_id: itemId,
        cost_price: parseFloat(cost_price) || 0,
        sell_price: parseFloat(sell_price) || 0,
        inventory_item_id: inventory_item_id || null,
        qty_per_service: parseFloat(qty_per_service) || 1,
      }])
      .select(VARIANT_SELECT).single()
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: c.service_items.map(i => i.id === itemId
          ? { ...i, service_variants: [...(i.service_variants || []), data] }
          : i) }
      : c))
  }

  const updateVariant = async (categoryId, itemId, variantId, { name, cost_price, sell_price, inventory_item_id, qty_per_service }) => {
    const clean = {
      name: name.trim(),
      cost_price: parseFloat(cost_price) || 0,
      sell_price: parseFloat(sell_price) || 0,
      inventory_item_id: inventory_item_id || null,
      qty_per_service: parseFloat(qty_per_service) || 1,
    }
    const { data, error } = await supabase
      .from('service_variants').update(clean).eq('id', variantId)
      .select(VARIANT_SELECT).single()
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: c.service_items.map(i => i.id === itemId
          ? { ...i, service_variants: i.service_variants.map(v => v.id === variantId ? data : v) }
          : i) }
      : c))
  }

  const deleteVariant = async (categoryId, itemId, variantId) => {
    const { error } = await supabase.from('service_variants').delete().eq('id', variantId)
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === categoryId
      ? { ...c, service_items: c.service_items.map(i => i.id === itemId
          ? { ...i, service_variants: i.service_variants.filter(v => v.id !== variantId) }
          : i) }
      : c))
  }

  return {
    categories, loading, load,
    addCategory, updateCategory, deleteCategory,
    addItem, updateItem, deleteItem,
    addVariant, updateVariant, deleteVariant,
  }
}
