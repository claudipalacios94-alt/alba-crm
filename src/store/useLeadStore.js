// ══════════════════════════════════════════════════════════════
// ALBA CRM — useLeadStore (Zustand)
// Reemplaza useLeads.js — misma API, store global
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { supabase } from '../hooks/supabaseClient.js'
import { LEADS_DEMO } from '../data/constants.js'

function calcDias(l) {
  const ref = l.last_contact_at || l.created_at
  if (!ref) return l.dias || 0
  return Math.max(0, Math.floor(
    (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)
  ))
}

function normalizeLead(l) {
  return {
    ...l,
    dias:            calcDias(l),
    proxAccion:      l.proxaccion       || l.proxAccion      || '',
    proxaccionTipo:  l.proxaccion_tipo  || null,
    proxaccionFecha: l.proxaccion_fecha || null,
    notaImp:         l.nota_imp         || l.notaImp         || '',
    agCapto:         l.ag_capto         || l.agCapto         || '',
  }
}

export const useLeadStore = create((set, get) => ({
  leads:    [],
  loading:  true,
  error:    null,
  lastSync: null,

  loadLeads: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({
        leads:    data?.length ? data.map(normalizeLead) : LEADS_DEMO,
        lastSync: new Date(),
        loading:  false,
      })
    } catch (err) {
      console.error('useLeadStore error:', err)
      set({ error: err.message, leads: LEADS_DEMO, loading: false })
    }
  },

  addLead: async (lead) => {
    const { data, error } = await supabase.from('leads').insert([{
      nombre:           lead.nombre,
      ag:               lead.ag             || '',
      etapa:            lead.etapa          || 'Nuevo Contacto',
      op:               lead.op             || '',
      presup:           lead.presup         ? Number(lead.presup) : null,
      tipo:             lead.tipo           || '',
      zona:             lead.zona           || '',
      tel:              lead.tel            || '',
      origen:           lead.origen         || '',
      nota:             lead.nota           || '',
      proxaccion:       lead.proxAccion     || '',
      proxaccion_tipo:  lead.proxaccionTipo  || null,
      proxaccion_fecha: lead.proxaccionFecha || null,
      prob:             lead.prob           ? Number(lead.prob) : null,
      nota_imp:         lead.notaImp        || '',
      dias:             0,
    }]).select().single()
    if (error) { console.error('addLead error:', error); throw error }
    set((s) => ({ leads: [normalizeLead(data), ...s.leads], lastSync: new Date() }))
    return data
  },

  updateLead: async (id, updates) => {
    set((s) => ({ leads: s.leads.map((l) => l.id === id ? { ...l, ...updates } : l) }))
    const { error } = await supabase.from('leads').update(updates).eq('id', id)
    if (error) { await get().loadLeads(); throw error }
    set({ lastSync: new Date() })
  },

  deleteLead: async (id) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }))
  },

  addInteraction: async (interaction) => {
    const { data, error } = await supabase.from('interactions').insert([{
      lead_id:     interaction.leadId,
      lead_nom:    interaction.leadNom,
      tipo:        interaction.tipo,
      nota:        interaction.nota,
      prox_accion: interaction.proxAccion || '',
      ag:          interaction.ag         || '',
    }]).select().single()
    if (error) { console.error('addInteraction error:', error); throw error }
    set({ lastSync: new Date() })
    return data
  },

  getInteractions: async (leadId) => {
    const query = supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (leadId) query.eq('lead_id', leadId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  saveSearchResult: async (leadId, resultado) => {
    const { data, error } = await supabase.from('search_results').insert([{
      lead_id:  leadId,
      resultado,
      portales: ['ZonaProp', 'Argenprop', 'MercadoLibre'],
    }]).select().single()
    if (error) { console.error('saveSearchResult error:', error); throw error }
    return data
  },

  getSearchResult: async (leadId) => {
    const { data } = await supabase
      .from('search_results')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    return data || null
  },

  subscribe: () => {
    let timeout
    const channel = supabase
      .channel('leads-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === payload.new.id ? { ...l, ...normalizeLead(payload.new) } : l
          ),
        }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => get().loadLeads(), 500)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        set((s) => ({ leads: s.leads.filter((l) => l.id !== payload.old.id) }))
      })
      .subscribe()
    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  },
}))