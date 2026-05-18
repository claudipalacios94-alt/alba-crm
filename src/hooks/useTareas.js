// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useTareas
// Centraliza queries de tareas. Antes vivían en CalendarioSemanal.
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

/**
 * Devuelve tareas filtradas por rango de fechas.
 * @param {string} desde — ISO date "YYYY-MM-DD"
 * @param {string} hasta — ISO date "YYYY-MM-DD"
 */
export function useTareas(desde, hasta) {
  const [tareas,  setTareas]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!desde || !hasta) return;
    setLoading(true);
    supabase
      .from("tareas")
      .select("*")
      .eq("completada", false)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .then(({ data }) => {
        setTareas(data || []);
        setLoading(false);
      });
  }, [desde, hasta]);

  return { tareas, loading };
}
