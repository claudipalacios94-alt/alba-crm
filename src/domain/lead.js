// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / LEAD
// Lógica de negocio pura. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

import { B } from "../data/constants.js";
import { parsearNotas, tipoNotaReciente } from "./nota.js";

export { matchLeadProps } from "./matching.js";

// Bonos/penalizaciones por tipo de nota sobre getPriorityScore
const NOTA_SCORE = {
  urgencia:    +25,
  cierre:      +20,
  interes:     +15,
  seguimiento:   0,
  objecion:    -10,
};

// scoreLead: ahora considera tipo de nota reciente además de días
export function scoreLead(lead) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido")
    return { label: "⬜", c: "#4A8A5A", bg: "rgba(74,138,90,0.12)" };

  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);

  // Tipo de nota tiene más peso que días sueltos
  if (tipo === "urgencia" || tipo === "cierre")
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)" };
  if (tipo === "objecion")
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };

  // Fallback: comportamiento original por días
  if (lead.dias < 3)
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)"  };
  if (lead.dias <= 7)
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };
  return   { label: "🔴 Frío",     c: B.muted,bg: "rgba(122,150,184,0.11)" };
}

export function genMsgWhatsApp(lead, prop) {
  const precio = prop.precio ? `USD ${Number(prop.precio).toLocaleString()}` : "a consultar";
  const m2 = prop.m2tot ? ` - ${prop.m2tot}m2` : "";
  const dir = prop.dir ? prop.dir + "\n" : "";
  const caracts = prop.caracts ? prop.caracts + "\n" : "";
  const url = prop._url ? prop._url + "\n" : "";
  return prop.tipo + " en " + prop.zona + "\n" +
    dir +
    precio + m2 + "\n" +
    caracts +
    url;
}

export function genMsgBusqueda(lead) {
  const stars = Math.round((lead.prob || 0) / 20);
  const encabezado = stars >= 5
    ? "🔴 PEDIDO URGENTE — CIERRE RÁPIDO"
    : stars >= 4 ? "🟠 PEDIDO ACTIVO — MUY INTERESADO"
    : stars >= 3 ? "🟡 BÚSQUEDA EN CURSO"
    : "🔵 PEDIDO DE BÚSQUEDA";

  const partes = [lead.tipo || "Propiedad"];
  if (lead.ambientes) partes.push(`${lead.ambientes} amb`);
  if (lead.zona) partes.push(lead.zona);
  const linea1 = partes.join(", ");
  const linea2 = lead.presup ? `USD ${Number(lead.presup).toLocaleString()}` : null;

  const detalles = [
    lead.credito === "si"  && "✅ Crédito aprobado",
    lead.cochera === "si"  && "🚗 Cochera",
    lead.cochera === "no"  && "❌ Sin cochera",
    lead.balcon  === "si"  && "🏙 Balcón",
    lead.patio   === "si"  && "🌿 Patio",
    lead.m2min             && `📐 Mín. ${lead.m2min}m²`,
    lead.op === "Inversor" && "📈 Inversor",
    stars >= 4             && "⚡ Prioridad alta",
  ].filter(Boolean);

  return [
    encabezado,
    linea2 ? `${linea1} · ${linea2}` : linea1,
    detalles.length > 0 ? detalles.join(" · ") : null,
    "Alba Inversiones · REG 3832",
  ].filter(l => l !== null).join("\n").trim();
}

export function getPriorityScore(lead) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido") return 0;

  let score = lead.prob || 0;

  // Días
  if (lead.dias <= 2) score += 20;
  else if (lead.dias <= 5) score += 5;
  else if (lead.dias > 7) score -= 20;

  // Etapa
  if (lead.etapa === "Negociacion") score += 15;
  if (lead.etapa === "Visita")      score += 10;

  // Tipo de nota reciente — nuevo
  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);
  if (tipo && NOTA_SCORE[tipo] !== undefined) score += NOTA_SCORE[tipo];

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function getRecommendedAction(lead) {
  const score = getPriorityScore(lead);
  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);

  // Tipo de nota tiene prioridad sobre reglas genéricas
  if (tipo === "urgencia")
    return { accion: "Llamar ahora", urgencia: "alta", motivo: "Marcó urgencia en nota" };
  if (tipo === "cierre")
    return { accion: "Preparar oferta", urgencia: "alta", motivo: "Lista para cerrar" };
  if (tipo === "objecion")
    return { accion: "Follow up 48h", urgencia: "media", motivo: "Tiene objeción — no presionar" };
  if (tipo === "interes" && lead.dias >= 2)
    return { accion: "Enviar match hoy", urgencia: "alta", motivo: "Interés activo + días sin contacto" };

  // Fallback: reglas originales
  if (lead.etapa === "Negociacion" && lead.dias >= 1)
    return { accion: "Llamar ahora", urgencia: "alta", motivo: "Negociacion activa sin contacto" };
  if (score > 80 && lead.dias >= 2)
    return { accion: "Llamar ahora", urgencia: "alta", motivo: lead.dias + "d sin contacto, alta probabilidad" };
  if (score > 70)
    return { accion: "Enviar match", urgencia: "media", motivo: "Lead caliente, mandar propiedad concreta" };
  if (score > 50)
    return { accion: "Seguimiento", urgencia: "media", motivo: "En pipeline activo" };
  return { accion: "Baja prioridad", urgencia: "baja", motivo: "Sin actividad reciente" };
}
