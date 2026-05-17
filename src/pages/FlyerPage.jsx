import React, { useState, useEffect } from "react";
import Flyer from "../components/Flyer.jsx";
import { usePropertyStore } from "../store/usePropertyStore.js";
import { supabase }         from "../hooks/useSupabase.js";

export default function FlyerPage() {
  const properties = usePropertyStore((s) => s.properties);
  const [flyers, setFlyers] = useState([]);

  useEffect(() => {
    supabase.from("flyers").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFlyers(data || []));
  }, []);

  return (
    <Flyer
      properties={properties}
      supabase={supabase}
      flyers={flyers}
      setFlyers={setFlyers}
    />
  );
}