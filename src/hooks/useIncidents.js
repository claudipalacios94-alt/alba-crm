// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useIncidents
// Top 5 incidents priorizados.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { computeLeadState } from "../domain/lead.js";

function diasDesde(fecha) {
  if (!fecha) return 99;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

function normalizarLead(lead) {
  return { ...lead, dias: lead.dias ?? diasDesde(lead.last_contact_at) };
}

function scoreIncident(lead, incident) {
  let score = 0;
  if (incident.tipo === "urgencia_sin_atender") score += 100;
  if (incident.tipo === "negociacion_parada")   score += 70;
  if (incident.tipo === "interes_frio")         score += 50;
  if (lead.dias <= 3)       score += 20;
  else if (lead.dias <= 7)  score += 10;
  else if (lead.dias > 14)  score -= 20;
  score += (lead.prob || 0) * 0.3;
  return score;
}

function pickTopIncidents(leads, max = 5) {
  const candidatos = [];
  leads.forEach(lead => {
    const { incident } = computeLeadState(lead);
    if (!incident) return;
    candidatos.push({ lead, incident, score: scoreIncident(lead, incident) });
  });
  return candidatos.sort((a, b) => b.score - a.score).slice(0, max);
}

export function useIncidents(leads = []) {
  const lastHash = useRef(null);

  useEffect(() => {
    if (!leads.length) return;
    const hash = leads.map(l => l.id + ":" + l.last_contact_at + ":" + l.nota + ":" + l.etapa).join("|");
    if (lastHash.current === hash) return;
    lastHash.current = hash;

    const hoy = new Date().toISOString().split("T")[0];
    const activos = leads
      .filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido")
      .map(normalizarLead);

    // Cerrar tareas de leads sin incident
    activos.forEach(async (lead) => {
      const { incident } = computeLeadState(lead);
      if (!incident) {
        await supabase.from("tareas").update({ completada: true })
          .eq("lead_id", lead.id).eq("completada", false).not("tipo", "is", null);
      }
    });

    // Crear top 5
    const top = pickTopIncidents(activos, 5);
    top.forEach(async ({ lead, incident }) => {
      const { data: existing } = await supabase.from("tareas").select("id")
        .eq("lead_id", lead.id).eq("tipo", incident.tipo).gte("fecha", hoy).limit(1);
      if (existing && existing.length > 0) return;
      await supabase.from("tareas").insert({
        lead_id: lead.id, tipo: incident.tipo,
        titulo: incident.label + " — " + lead.nombre,
        prioridad: "alta", fecha: hoy, completada: false, ag: lead.ag || null,
      });
    });
  }, [leads]);
}
