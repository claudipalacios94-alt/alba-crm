// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useCaptacionZonaSemana
// Query de zona activa de la semana. Antes vivía en ResumenCaptacionZonas.
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

function getLunes() {
  const hoy = new Date();
  const l = new Date(hoy);
  l.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return l.toISOString().slice(0, 10);
}

export function useCaptacionZonaSemana() {
  const [semana,  setSemana]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("captacion_zonas")
      .select("*")
      .eq("semana_inicio", getLunes())
      .limit(1)
      .then(({ data }) => {
        setSemana(data?.[0] || null);
        setLoading(false);
      });
  }, []);

  return { semana, loading };
}
