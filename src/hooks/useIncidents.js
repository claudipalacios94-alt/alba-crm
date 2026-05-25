// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useIncidents
// Detecta incidents y sincroniza tareas automáticas.
// No recrea tareas completadas en las últimas 24h.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { computeLeadState } from "../domain/lead.js";

export function useIncidents(leads = []) {
  const ran = useRef(false);

  useEffect(() => {
    if (!leads.length) return;
    if (ran.current) return;
    ran.current = true;

    const activos = leads.filter(
      l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"
    );

    activos.forEach(async (lead) => {
      const { incident } = computeLeadState(lead);

      if (incident) {
        // Verificar si ya existe tarea pendiente O completada hoy
        const hoy = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("tareas")
          .select("id, completada")
          .eq("lead_id", lead.id)
          .eq("tipo", incident.tipo)
          .gte("fecha", hoy)
          .limit(1);

        if (existing && existing.length > 0) return;

        await supabase.from("tareas").insert({
          lead_id:    lead.id,
          tipo:       incident.tipo,
          titulo:     incident.label + " — " + lead.nombre,
          prioridad:  "alta",
          fecha:      hoy,
          completada: false,
          ag:         lead.ag || null,
        });

      } else {
        // Incident resuelto → cerrar tareas automáticas pendientes
        await supabase
          .from("tareas")
          .update({ completada: true })
          .eq("lead_id", lead.id)
          .eq("completada", false)
          .not("tipo", "is", null);
      }
    });
  }, [leads]);
}
