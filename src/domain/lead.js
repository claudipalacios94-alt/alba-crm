// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / LEAD
// Lógica de negocio pura. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

import { B } from "../data/constants.js";

export { matchLeadProps } from "./matching.js";

export function scoreLead(lead) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido")
    return { label: "⬜", c: "#4A8A5A", bg: "rgba(74,138,90,0.12)" };
  if (lead.dias < 3)
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)"  };
  if (lead.dias <= 7)
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };
  return   { label: "🔴 Frío",     c: B.muted,bg: "rgba(122,150,184,0.11)" };
}

export function genMsgWhatsApp(lead, prop) {
  const precio = prop.precio ? `USD ${Number(prop.precio).toLocaleString()}` : "a consultar";
  const m2 = prop.m2tot ? ` · ${prop.m2tot}m²` : "";
  return `Hola ${lead.nombre}! Tenemos una opción que creo que te puede interesar:\n\n` +
    `🏠 ${prop.tipo} en ${prop.zona}\n` +
    `📍 ${prop.dir || prop.zona}\n` +
    `💰 ${precio}${m2}\n` +
    (prop.caracts ? `✅ ${prop.caracts}\n` : "") +
    `\n¿Te parece si coordinamos para verla? 🙂`;
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