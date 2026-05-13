import React from "react";
import CRMLeads from "../components/CRMLeads.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function CRMLeadsPage() {
  const { leads, updateLead, deleteLead, properties, captaciones, supabase } = useAppContext();
  return (
    <CRMLeads
      leads={leads}
      updateLead={updateLead}
      deleteLead={deleteLead}
      properties={properties}
      captaciones={captaciones}
      supabase={supabase}
    />
  );
}
