import React from "react";
import Mapa from "../components/Mapa.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function MapaPage() {
  const { properties, leads, updateProperty, supabase, flyers } = useAppContext();
  return (
    <Mapa
      properties={properties}
      leads={leads}
      updateProperty={updateProperty}
      supabase={supabase}
      flyers={flyers}
    />
  );
}
