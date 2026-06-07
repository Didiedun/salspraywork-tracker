import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useInventory(workshopId) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!workshopId) { setLoading(false); return }
    const { data } = await supabase
      .from('inventory').select('*').eq('workshop_id', workshopId).order('name')
    setItems(data || [])
    setLoading(false)
  }, [workshopId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = async (item) => {
    const { data, error } = await supabase
      .from('inventory').insert([{ ...item, workshop_id: workshopId }]).select().single()
    if (error) throw error
    setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const updateItem = async (id, updates) => {
    const { data, error } = await supabase
      .from('inventory').update(updates).eq('id', id).select().single()
    if (error) throw error
    setItems(prev => prev.map(i => i.id === id ? data : i))
    return data
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) throw error
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const deductStock = async (itemId, qty) => {
    const { data: current } = await supabase.from('inventory').select('quantity').eq('id', itemId).single()
    if (!current) return
    const newQty = Math.max(0, (current.quantity || 0) - qty)
    const { error } = await supabase.from('inventory').update({ quantity: newQty }).eq('id', itemId)
    if (error) throw error
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i))
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem, deductStock }
}
