// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / OPPORTUNITY
// Lógica de oportunidades de captación.
// Sin React, sin Supabase, sin IA.
// ══════════════════════════════════════════════════════════════

import { normZona, parsearVariantes } from "./matching.js";
import { parsearNotas, tipoNotaReciente } from "./nota.js";

export function computeLeadDemandWeight(lead) {
  let score = 30;
  if (lead.etapa === "Negociación") score += 35;
  else if (lead.etapa === "Visita") score += 25;
  else if (lead.etapa === "Calificado") score += 15;
  else if (lead.etapa === "Contacto") score += 5;
  const dias = typeof lead.dias === "number" ? lead.dias : null;
  if (dias !== null) {
    if (dias <= 2)      score += 20;
    else if (dias <= 5) score += 10;
    else if (dias > 14) score -= 15;
  }
  if (lead.credito === "si") score += 15;
  if (lead.q_fecha_limite &&
    /semana|mes|pronto|r[aá]pido|urgent|vence|julio|agosto|junio/i.test(lead.q_fecha_limite))
    score += 10;
  const tipo = tipoNotaReciente(parsearNotas(lead.nota));
  if (tipo === "urgencia" || tipo === "cierre") score += 15;
  else if (tipo === "interes")  score += 8;
  else if (tipo === "objecion") score -= 10;
  if (lead.q_tiene_para_vender &&
    !/^(no|nada|ninguno|sin nada|no tengo)/i.test(lead.q_tiene_para_vender))
    score -= 15;
  return Math.min(100, Math.max(0, score));
}

function tieneSeñalFuerte(lead) {
  const dias = typeof lead.dias === "number" ? lead.dias : null;
  const señales = [
    lead.credito === "si",
    lead.etapa === "Visita" || lead.etapa === "Negociación",
    ["urgencia", "cierre"].includes(tipoNotaReciente(parsearNotas(lead.nota))),
    dias !== null && dias <= 3,
  ].filter(Boolean).length;
  return señales >= 2;
}

function computeSupply(properties, captaciones, zonaNorm, tipoNorm) {
  const props = (properties || []).filter(p => {
    if (p.activa === false) return false;
    const pZona = normZona(p.zona);
    const pTipo = normZona((p.tipo || "").replace(/departamento/i, "depto"));
    return pZona === zonaNorm && (!tipoNorm || pTipo === tipoNorm);
  }).length;
  const caps = (captaciones || []).filter(c => {
    if (!c.zona) return false; // TODO: contar descartadas por zona vacía
    const cZona = normZona(c.zona);
    const cTipo = normZona((c.tipo || "").replace(/departamento/i, "depto"));
    return cZona === zonaNorm && (!tipoNorm || cTipo === tipoNorm);
  }).length;
  return props + caps * 0.5;
}

function scoreOpportunity(demandaTotal, supplyEfectiva, leadCount) {
  const gap  = Math.max(0, demandaTotal - supplyEfectiva * 20);
  const base = Math.min(100, gap / 2);
  const factor = leadCount >= 5 ? 1 : leadCount >= 3 ? 0.85 : 0.70;
  return Math.round(base * factor);
}

function computeConfidence(leadCount) {
  if (leadCount >= 5) return "alta";
  if (leadCount >= 3) return "media";
  return "baja";
}

function buildCard(zonaNorm, tipoNorm, leads, supply, score) {
  const zona = leads[0]?.zona?.split(/[,\/]/)[0]?.trim() || zonaNorm;
  const tipo = leads[0]?.tipo?.split(/[,\/]/)[0]?.trim() || tipoNorm || "Propiedad";
  const presups = leads.map(l => Number(l.presup)).filter(Boolean);
  const presupPromedio = presups.length
    ? Math.round(presups.reduce((a, b) => a + b, 0) / presups.length / 1000) * 1000
    : null;
  const ofertaEntera = Math.floor(supply);
  const sOferta = ofertaEntera !== 1 ? "s" : "";
  const sUtil   = ofertaEntera !== 1 ? "es" : "";
  const titulo  = `${tipo} en ${zona}`;
  const motivo  = presupPromedio
    ? `${leads.length} compradores activos hasta USD ${presupPromedio.toLocaleString("es-AR")} — solo ${ofertaEntera} oferta${sOferta} útil${sUtil}`
    : `${leads.length} compradores activos — solo ${ofertaEntera} oferta${sOferta} útil${sUtil}`;
  const riesgo =
    supply === 0   ? "Sin oferta activa — oportunidad exclusiva si captás" :
    supply < 1     ? "Oferta muy escasa — captación urgente" :
                     "Demanda supera oferta disponible";
  const accion     = `Captá ${tipo.toLowerCase()} en ${zona}`;
  const confidence = computeConfidence(leads.length);
  const id         = `${zonaNorm}__${tipoNorm}`;
  return { id, titulo, motivo, accion, riesgo, score, confidence };
}

export function getTopOpportunities(leads, properties, captaciones) {
  const activos = (leads || []).filter(
    l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.zona && l.tipo
  );
  const grupos = {};
  for (const lead of activos) {
    const zonas = parsearVariantes(lead.zona);
    const tipos = parsearVariantes((lead.tipo || "").replace(/departamento/i, "depto"));
    for (const z of zonas) {
      for (const t of tipos) {
        if (!z) continue;
        const key = `${z}||${t}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(lead);
      }
    }
  }
  const oportunidades = [];
  for (const [key, grupoLeads] of Object.entries(grupos)) {
    const [zonaNorm, tipoNorm] = key.split("||");
    if (grupoLeads.length < 2) continue;
    if (grupoLeads.length === 2 && !grupoLeads.every(tieneSeñalFuerte)) continue;
    console.debug("[OPP] grupo:", key, "leads:", grupoLeads.length);
    const demandaTotal = grupoLeads.reduce((sum, l) => sum + computeLeadDemandWeight(l), 0);
    const supply = computeSupply(properties, captaciones, zonaNorm, tipoNorm);
    const score  = scoreOpportunity(demandaTotal, supply, grupoLeads.length);
    if (score < 25) continue;
    oportunidades.push(buildCard(zonaNorm, tipoNorm, grupoLeads, supply, score));
  }
  return oportunidades.sort((a, b) => b.score - a.score).slice(0, 3);
}
