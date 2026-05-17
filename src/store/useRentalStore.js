// ══════════════════════════════════════════════════════════════
// ALBA CRM — useRentalStore (Zustand)
// Reemplaza useRentals.js — misma API, store global
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { supabase } from '../hooks/supabaseClient.js'
import { ALQUILERES_DEMO } from '../data/constants.js'

export const useRentalStore = create((set, get) => ({
  rentals: [],
  loading: true,
  error:   null,

  loadRentals: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ rentals: data?.length ? data : ALQUILERES_DEMO, loading: false })
    } catch (err) {
      console.error('useRentalStore error:', err)
      set({ error: err.message, rentals: ALQUILERES_DEMO, loading: false })
    }
  },

  addRental: async (rental) => {
    const { data, error } = await supabase.from('rentals').insert([{
      nombre:     rental.nombre    || '',
      tipo:       rental.tipo      || '',
      zona:       rental.zona      || '',
      precio_mes: rental.precioARS || null,
      estado:     rental.estado    || 'Disponible',
      tipoAlq:    rental.tipoAlq   || 'Anual',
      info:       rental.info      || '',
    }]).select().single()
    if (error) { console.error('addRental error:', error); throw error }
    set((s) => ({ rentals: [data, ...s.rentals] }))
    return data
  },

  updateRental: async (id, updates) => {
    set((s) => ({ rentals: s.rentals.map((r) => r.id === id ? { ...r, ...updates } : r) }))
    const { error } = await supabase.from('rentals').update(updates).eq('id', id)
    if (error) { await get().loadRentals(); throw error }
  },

  deleteRental: async (id) => {
    const { error } = await supabase.from('rentals').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ rentals: s.rentals.filter((r) => r.id !== id) }))
  },

  subscribe: () => {
    let timeout
    const channel = supabase
      .channel('rentals-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => get().loadRentals(), 500)
      })
      .subscribe()
    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  },
}))