// ══════════════════════════════════════════════════════════════
// ALBA CRM — useSupabase (compatibility layer)
// Re-exporta desde hooks separados.
// Los componentes existentes no necesitan cambiar sus imports.
// ══════════════════════════════════════════════════════════════
export { supabase }                                    from "./supabaseClient.js";
export { signIn, signOut, useAuth }                    from "./useAuth.js";
export { useLeads }                                    from "./useLeads.js";
export { useProperties }                               from "./useProperties.js";
export { useRentals }                                  from "./useRentals.js";

// Hook combinado — mantiene la misma API que antes
// para que SupabaseContext no cambie su contrato externo
import { useLeads }      from "./useLeads.js";
import { useProperties } from "./useProperties.js";
import { useRentals }    from "./useRentals.js";

export function useSupabase() {
  const leadsData      = useLeads();
  const propertiesData = useProperties();
  const rentalsData    = useRentals();

  const loading  = leadsData.loading || propertiesData.loading || rentalsData.loading;
  const error    = leadsData.error   || propertiesData.error   || rentalsData.error;
  const lastSync = leadsData.lastSync;

  function reload() {
    leadsData.reload();
    propertiesData.reload();
    rentalsData.reload();
  }

  return {
    // Estado
    leads:      leadsData.leads,
    properties: propertiesData.properties,
    rentals:    rentalsData.rentals,
    loading, error, lastSync, reload,

    // Leads
    addLead:          leadsData.addLead,
    updateLead:       leadsData.updateLead,
    deleteLead:       leadsData.deleteLead,
    addInteraction:   leadsData.addInteraction,
    getInteractions:  leadsData.getInteractions,
    saveSearchResult: leadsData.saveSearchResult,
    getSearchResult:  leadsData.getSearchResult,

    // Properties
    addProperty:    propertiesData.addProperty,
    updateProperty: propertiesData.updateProperty,
    deleteProperty: propertiesData.deleteProperty,

    // Rentals
    addRental:    rentalsData.addRental,
    updateRental: rentalsData.updateRental,
    deleteRental: rentalsData.deleteRental,
  };
}
