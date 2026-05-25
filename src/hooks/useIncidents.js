// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useIncidents
// Detecta incidents en leads activos y crea tareas automáticas.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { computeLeadState } from "../domain/lead.js";

export function useIncidents(leads = []) {
  const procesados = useRef(new Set());

  useEffect(() => {
    if (!leads.length) return;

    const activos = leads.filter(
      l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"
    );

    activos.forEach(async (lead) => {
      const key = `${lead.id}`;
      if (procesados.current.has(key)) return;
      procesados.current.add(key);

      const { incident } = computeLeadState(lead);
      if (!incident) return;

      const { data: existing } = await supabase
        .from("tareas")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("tipo", incident.tipo)
        .eq("completada", false)
        .limit(1);

      if (existing && existing.length > 0) return;

      const hoy = new Date().toISOString().split("T")[0];
      await supabase.from("tareas").insert({
        lead_id:    lead.id,
        tipo:       incident.tipo,
        titulo:     incident.label + " — " + lead.nombre,
        prioridad:  "alta",
        fecha:      hoy,
        completada: false,
        ag:         lead.ag || null,
      });
    });
  }, [leads]);
}
