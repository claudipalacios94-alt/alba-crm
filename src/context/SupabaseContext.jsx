// ══════════════════════════════════════════════════════════════
// ALBA CRM — SupabaseContext
// Solo auth. Datos → stores Zustand.
// ══════════════════════════════════════════════════════════════
import React, { createContext, useContext, useEffect } from 'react'
import { supabase, signOut } from '../hooks/useSupabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLeadStore }      from '../store/useLeadStore.js'
import { usePropertyStore }  from '../store/usePropertyStore.js'
import { useCaptacionStore } from '../store/useCaptacionStore.js'
import { useRentalStore } from '../store/useRentalStore.js'

const SupabaseContext = createContext(null)

export function SupabaseProvider({ children }) {
  const { user, agent, loading: authLoading } = useAuth()

  const loadLeads      = useLeadStore((s) => s.loadLeads)
  const loadProperties = usePropertyStore((s) => s.loadProperties)
  const loadRentals    = useRentalStore((s) => s.loadRentals)
  const loadCaptaciones = useCaptacionStore((s) => s.loadCaptaciones)
  const subscribeLead      = useLeadStore((s) => s.subscribe)
  const subscribeProperty  = usePropertyStore((s) => s.subscribe)
  const subscribeRental    = useRentalStore((s) => s.subscribe)
  const subscribeCaptacion = useCaptacionStore((s) => s.subscribe)

  // Carga inicial y subscripciones realtime cuando hay usuario
  useEffect(() => {
    if (!user) return
    loadLeads()
    loadProperties()
    loadRentals()
    loadCaptaciones()

    const unsubLead      = subscribeLead()
    const unsubProperty  = subscribeProperty()
    const unsubRental    = subscribeRental()
    const unsubCaptacion = subscribeCaptacion()

    return () => {
      unsubLead()
      unsubProperty()
      unsubRental()
      unsubCaptacion()
    }
  }, [user])

  // sinAsignar para sidebar badge
  const leads = useLeadStore((s) => s.leads)
  const sinAsignar = leads.filter(
    (l) => !l.ag && l.etapa !== 'Cerrado' && l.etapa !== 'Perdido'
  ).length

  const value = {
    user,
    agent,
    authLoading,
    signOut,
    supabase,
    sinAsignar,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useAppContext must be inside SupabaseProvider')
  return ctx
}