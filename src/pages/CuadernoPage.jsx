import React from "react";
import Cuaderno from "../components/Cuaderno.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function CuadernoPage() {
  const { leads, properties, rentals, captaciones, supabase, agregarConsumo } = useAppContext();
  return (
    <Cuaderno
      leads={leads}
      properties={properties}
      rentals={rentals}
      captaciones={captaciones}
      supabase={supabase}
      onConsumo={agregarConsumo}
    />
  );
}
