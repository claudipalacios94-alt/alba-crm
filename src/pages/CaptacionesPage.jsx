import React from "react";
import Captaciones from "../components/Captaciones.jsx";
import { supabase } from "../hooks/useSupabase.js";

export default function CaptacionesPage() {
  return <Captaciones supabase={supabase} />;
}