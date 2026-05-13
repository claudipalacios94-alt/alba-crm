import React from "react";
import Captaciones from "../components/Captaciones.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function CaptacionesPage() {
  const { supabase } = useAppContext();
  return <Captaciones supabase={supabase} />;
}
