// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRMLeadsPage
// ══════════════════════════════════════════════════════════════
import React from 'react'
import CRMLeads from '../components/CRMLeads.jsx'
import { useLeadStore }      from '../store/useLeadStore.js'
import { usePropertyStore }  from '../store/usePropertyStore.js'
import { useCaptacionStore } from '../store/useCaptacionStore.js'
import { supabase } from '../hooks/useSupabase.js'

export default function CRMLeadsPage() {
  const leads       = useLeadStore((s) => s.leads)
  const updateLead  = useLeadStore((s) => s.updateLead)
  const deleteLead  = useLeadStore((s) => s.deleteLead)
  const properties  = usePropertyStore((s) => s.properties)
  const captaciones = useCaptacionStore((s) => s.captaciones)

  return (
    <CRMLeads
      leads={leads}
      updateLead={updateLead}
      deleteLead={deleteLead}
      properties={properties}
      captaciones={captaciones}
      supabase={supabase}
    />
  )
}