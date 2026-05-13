import React from "react";
import Flyer from "../components/Flyer.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function FlyerPage() {
  const { properties, supabase, flyers, setFlyers } = useAppContext();
  return (
    <Flyer
      properties={properties}
      supabase={supabase}
      flyers={flyers}
      setFlyers={setFlyers}
    />
  );
}
