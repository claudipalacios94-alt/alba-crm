import React, { useState, useEffect } from "react";
import Mapa from "../components/Mapa.jsx";
import { useLeadStore }     from "../store/useLeadStore.js";
import { usePropertyStore } from "../store/usePropertyStore.js";
import { supabase }         from "../hooks/useSupabase.js";

export default function MapaPage() {
  const properties     = usePropertyStore((s) => s.properties);
  const leads          = useLeadStore((s) => s.leads);
  const updateProperty = usePropertyStore((s) => s.updateProperty);
  const [flyers, setFlyers] = useState([]);

  useEffect(() => {
    supabase.from("flyers").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFlyers(data || []));
  }, []);

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