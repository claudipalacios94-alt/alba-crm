import React from "react";
import Propiedades from "../components/Propiedades.jsx";
import { useLeadStore }     from "../store/useLeadStore.js";
import { usePropertyStore } from "../store/usePropertyStore.js";
import { useRentalStore }   from "../store/useRentalStore.js";
import { supabase }         from "../hooks/useSupabase.js";

export default function PropiedadesPage() {
  const properties     = usePropertyStore((s) => s.properties);
  const updateProperty = usePropertyStore((s) => s.updateProperty);
  const deleteProperty = usePropertyStore((s) => s.deleteProperty);
  const rentals        = useRentalStore((s) => s.rentals);
  const leads          = useLeadStore((s) => s.leads);

  return (
    <Propiedades
      properties={properties}
      rentals={rentals}
      leads={leads}
      supabase={supabase}
      updateProperty={updateProperty}
      deleteProperty={deleteProperty}
    />
  );
}