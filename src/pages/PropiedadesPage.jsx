import React from "react";
import Propiedades from "../components/Propiedades.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function PropiedadesPage() {
  const { properties, rentals, leads, supabase, updateProperty, deleteProperty } = useAppContext();
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
