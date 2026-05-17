// ══════════════════════════════════════════════════════════════
// ALBA CRM — usePropertyStore (Zustand)
// Reemplaza useProperties.js — misma API, store global
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { supabase } from '../hooks/supabaseClient.js'
import { PROPS_DEMO } from '../data/constants.js'

async function geocodeAddress(direccion) {
  if (!direccion) return { lat: null, lng: null }
  const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
  const inMDP = (lat, lng) => lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40
  try {
    const r1 = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(direccion) +
      '&components=locality:Mar+del+Plata|administrative_area:Buenos+Aires|country:AR&key=' + KEY
    )
    const d1 = await r1.json()
    if (d1.status === 'OK' && d1.results.length > 0) {
      const loc = d1.results[0].geometry.location
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng }
    }
    const r2 = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(direccion + ', Mar del Plata, Buenos Aires, Argentina') + '&key=' + KEY
    )
    const d2 = await r2.json()
    if (d2.status === 'OK' && d2.results.length > 0) {
      const loc = d2.results[0].geometry.location
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng }
    }
  } catch (e) { console.error('Geocoding error:', e) }
  return { lat: null, lng: null }
}

export const usePropertyStore = create((set, get) => ({
  properties: [],
  loading:    true,
  error:      null,

  loadProperties: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ properties: data?.length ? data : PROPS_DEMO, loading: false })
    } catch (err) {
      console.error('usePropertyStore error:', err)
      set({ error: err.message, properties: PROPS_DEMO, loading: false })
    }
  },

  addProperty: async (prop) => {
    let lat = prop.lat || null
    let lng = prop.lng || null
    if (!lat && prop.dir) {
      const coords = await geocodeAddress(prop.dir)
      lat = coords.lat
      lng = coords.lng
    }
    const { data, error } = await supabase.from('properties').insert([{
      tipo:    prop.tipo    || '',
      zona:    prop.zona    || '',
      dir:     prop.dir     || '',
      precio:  prop.precio  ? Number(prop.precio) : null,
      m2tot:   prop.m2tot   ? Number(prop.m2tot)  : null,
      m2cub:   prop.m2cub   ? Number(prop.m2cub)  : null,
      estado:  prop.estado  || 'Buen Estado',
      caracts: prop.caracts || '',
      dias:    0,
      sc:      '🟢 OK',
      info:    prop.info    || '',
      lat, lng,
      ag:      prop.ag      || '',
    }]).select().single()
    if (error) { console.error('addProperty error:', error); throw error }
    set((s) => ({ properties: [data, ...s.properties] }))
    return data
  },

  updateProperty: async (id, updates) => {
    set((s) => ({ properties: s.properties.map((p) => p.id === id ? { ...p, ...updates } : p) }))
    const { error } = await supabase.from('properties').update(updates).eq('id', id)
    if (error) { await get().loadProperties(); throw error }
  },

  deleteProperty: async (id) => {
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ properties: s.properties.filter((p) => p.id !== id) }))
  },

  subscribe: () => {
    let timeout
    const channel = supabase
      .channel('properties-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => get().loadProperties(), 500)
      })
      .subscribe()
    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  },
}))