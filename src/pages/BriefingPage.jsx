import React from "react";
import Briefing from "../components/Briefing.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function BriefingPage() {
  const { leads, properties, rentals, captaciones, supabase, agregarConsumo } = useAppContext();
  return (
    <Briefing
      leads={leads}
      properties={properties}
      rentals={rentals}
      captaciones={captaciones}
      supabase={supabase}
      onConsumo={agregarConsumo}
    />
  );
}
