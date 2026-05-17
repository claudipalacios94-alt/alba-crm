import React from "react";
import Briefing from "../components/Briefing.jsx";
import { useLeadStore }      from "../store/useLeadStore.js";
import { usePropertyStore }  from "../store/usePropertyStore.js";
import { useRentalStore }    from "../store/useRentalStore.js";
import { useCaptacionStore } from "../store/useCaptacionStore.js";
import { useAIStore }        from "../store/useAIStore.js";
import { supabase }          from "../hooks/useSupabase.js";

export default function BriefingPage() {
  const leads       = useLeadStore((s) => s.leads);
  const properties  = usePropertyStore((s) => s.properties);
  const rentals     = useRentalStore((s) => s.rentals);
  const captaciones = useCaptacionStore((s) => s.captaciones);
  const agregarConsumo = useAIStore((s) => s.agregarConsumo);

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