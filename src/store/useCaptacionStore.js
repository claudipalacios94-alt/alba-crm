import { create } from 'zustand'
import { supabase } from '../hooks/supabaseClient'

export const useCaptacionStore = create((set, get) => ({
  captaciones: [],
  loading: false,
  error: null,

  loadCaptaciones: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('captaciones')
      .select('*')
      .order('id', { ascending: false })
    set({ captaciones: data || [], error, loading: false })
  },

  addCaptacion: async (cap) => {
    const { data, error } = await supabase.from('captaciones').insert([cap]).select().single()
    if (!error && data) set((s) => ({ captaciones: [data, ...s.captaciones] }))
    return { data, error }
  },

  updateCaptacion: async (id, changes) => {
    const { data, error } = await supabase.from('captaciones').update(changes).eq('id', id).select().single()
    if (!error && data) set((s) => ({ captaciones: s.captaciones.map((c) => (c.id === id ? data : c)) }))
    return { data, error }
  },

  deleteCaptacion: async (id) => {
    const { error } = await supabase.from('captaciones').delete().eq('id', id)
    if (!error) set((s) => ({ captaciones: s.captaciones.filter((c) => c.id !== id) }))
    return { error }
  },

  subscribe: () => {
    let timeout
    const channel = supabase
      .channel('captaciones-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'captaciones' }, () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => get().loadCaptaciones(), 500)
      })
      .subscribe()
    return () => {
      clearTimeout(timeout)
      channel.unsubscribe()
    }
  },
}))