import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_STAGES } from '../constants'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [workshop, setWorkshop] = useState(null)
  const [role, setRole]         = useState(null)
  const [member, setMember]     = useState(null)
  const [loading, setLoading]   = useState(true)

  const loadWorkshop = useCallback(async (userId) => {
    if (!userId) { setWorkshop(null); setRole(null); setMember(null); setLoading(false); return }
    const { data: owned } = await supabase
      .from('workshops').select('*').eq('owner_id', userId).maybeSingle()
    if (owned) { setWorkshop(owned); setRole('owner'); setMember(null); setLoading(false); return }
    const { data: memberData } = await supabase
      .from('workshop_members').select('*, workshops(*)')
      .eq('user_id', userId).maybeSingle()
    if (memberData?.workshops) {
      setWorkshop(memberData.workshops); setRole(memberData.role); setMember(memberData); setLoading(false); return
    }
    setWorkshop(null); setRole(null); setMember(null); setLoading(false)
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
    setWorkshop(null); setRole(null); setMember(null)
  }

  const leaveWorkshop = async () => {
    if (!user || !workshop) return
    const { error } = await supabase
      .from('workshop_members')
      .delete()
      .eq('user_id', user.id)
      .eq('workshop_id', workshop.id)
    if (error) throw error
    setWorkshop(null); setRole(null); setMember(null)
  }

  const updateMemberName = async (name) => {
    if (!member?.id) return
    const { error } = await supabase
      .from('workshop_members')
      .update({ name: name.trim() })
      .eq('id', member.id)
    if (error) throw error
    setMember(m => ({ ...m, name: name.trim() }))
  }

  const createWorkshop = async (name, slug) => {
    const { data, error } = await supabase
      .from('workshops').insert([{ name, slug, owner_id: user.id, stages: DEFAULT_STAGES }]).select().single()
    if (error) throw error
    setWorkshop(data); setRole('owner')
    return data
  }

  return (
    <AppContext.Provider value={{
      user, workshop, role, member, loading,
      signIn, signUp, signOut, leaveWorkshop,
      createWorkshop, updateMemberName,
      reloadWorkshop: () => loadWorkshop(user?.id),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
