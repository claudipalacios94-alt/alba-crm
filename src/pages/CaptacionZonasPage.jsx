import React from "react";
import CaptacionZonas from "../components/CaptacionZonas.jsx";
import { supabase } from "../hooks/useSupabase.js";

export default function CaptacionZonasPage() {
  return <CaptacionZonas supabase={supabase} />;
}