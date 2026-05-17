import React from "react";
import Cuaderno from "../components/Cuaderno.jsx";
import { useLeadStore }      from "../store/useLeadStore.js";
import { usePropertyStore }  from "../store/usePropertyStore.js";
import { useRentalStore }    from "../store/useRentalStore.js";
import { useCaptacionStore } from "../store/useCaptacionStore.js";
import { useAIStore }        from "../store/useAIStore.js";
import { supabase }          from "../hooks/useSupabase.js";

export default function CuadernoPage() {
  const leads       = useLeadStore((s) => s.leads);
  const properties  = usePropertyStore((s) => s.properties);
  const rentals     = useRentalStore((s) => s.rentals);
  const captaciones = useCaptacionStore((s) => s.captaciones);
  const agregarConsumo = useAIStore((s) => s.agregarConsumo);

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