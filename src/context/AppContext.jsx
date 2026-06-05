import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [workshop, setWorkshop] = useState(null)
  const [role, setRole]         = useState(null)
  const [loading, setLoading]   = useState(true)

  const loadWorkshop = useCallback(async (userId) => {
    if (!userId) { setWorkshop(null); setRole(null); setLoading(false); return }
    const { data: owned } = await supabase
      .from('workshops').select('*').eq('owner_id', userId).maybeSingle()
    if (owned) { setWorkshop(owned); setRole('owner'); setLoading(false); return }
    const { data: member } = await supabase
      .from('workshop_members').select('*, workshops(*)')
      .eq('user_id', userId).maybeSingle()
    if (member?.workshops) {
      setWorkshop(member.workshops); setRole(member.role); setLoading(false); return
    }
    setWorkshop(null); setRole(null); setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      loadWorkshop(u?.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setWorkshop(null); setRole(null); setLoading(false) }
      else loadWorkshop(u.id)
    })
    return () => subscription.unsubscribe()
  }, [loadWorkshop])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = async () => {
    await supabase.auth.signOut()
    setWorkshop(null); setRole(null)
  }

  const createWorkshop = async (name, slug) => {
    const { data, error } = await supabase
      .from('workshops').insert([{ name, slug, owner_id: user.id }]).select().single()
    if (error) throw error
    setWorkshop(data); setRole('owner')
    return data
  }

  return (
    <AppContext.Provider value={{
      user, workshop, role, loading,
      signIn, signUp, signOut,
      createWorkshop,
      reloadWorkshop: () => loadWorkshop(user?.id),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
