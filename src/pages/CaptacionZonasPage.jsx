import React from "react";
import CaptacionZonas from "../components/CaptacionZonas.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function CaptacionZonasPage() {
  const { supabase } = useAppContext();
  return <CaptacionZonas supabase={supabase} />;
}
