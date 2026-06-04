// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / LEAD
// Lógica de negocio pura. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

import { B } from "../data/styles.js";
import { parsearNotas, tipoNotaReciente } from "./nota.js";

export { matchLeadProps } from "./matching.js";

export function scoreLead(lead) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido")
    return { label: "⬜", c: "#4A8A5A", bg: "rgba(74,138,90,0.12)" };
  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);
  if (tipo === "urgencia" || tipo === "cierre")
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)" };
  if (tipo === "objecion")
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };
  if (lead.dias < 3)
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)" };
  if (lead.dias <= 7)
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };
  return     { label: "🔴 Frío",   c: B.muted,bg: "rgba(122,150,184,0.11)" };
}

function computeCalor(lead) {
  let score = 40;
  const _d = typeof lead.dias === "number" ? lead.dias : null;
  if (_d !== null) {
    if (_d === 0)       score += 30;
    else if (_d <= 2)   score += 20;
    else if (_d <= 5)   score += 10;
    else if (_d > 14)   score -= 20;
    else if (_d > 7)    score -= 10;
  }
  if (lead.etapa === "Negociación") score += 30;
  else if (lead.etapa === "Visita") score += 20;
  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);
  if (tipo === "urgencia") score += 25;
  if (tipo === "cierre")   score += 20;
  if (tipo === "interes")  score += 15;
  if (tipo === "objecion") score -= 10;
  return Math.min(100, Math.max(0, score));
}

function computeViabilidad(lead) {
  let score = 40;
  if (lead.credito === "si") score += 25;
  if (lead.q_fecha_limite) {
    if (/semana|mes|agosto|julio|junio|mayo|pronto|r[aá]pido|urgent|vence/i.test(lead.q_fecha_limite))
      score += 15;
    else score += 5;
  }
  if (lead.q_tiene_para_vender) {
    if (/^(no|nada|ninguno|sin nada|no tengo)/i.test(lead.q_tiene_para_vender))
      score += 15;
    else score -= 15;
  }
  if (lead.op === "Compra") score += 10;
  return Math.min(100, Math.max(0, score));
}

function computeMatchability(lead, matchCount) {
  let score = 30;
  if (matchCount >= 3)      score += 40;
  else if (matchCount >= 1) score += 25;
  else                      score -= 20;
  const zonas = (lead.zona || "").split(/[,/]|\s+y\s+/).filter(z => z.trim().length > 2);
  if (zonas.length > 1) score += 10;
  const requisitos = [
    lead.cochera === "si", lead.patio === "si",
    lead.balcon  === "si", !!lead.m2min,
  ].filter(Boolean).length;
  score -= requisitos * 5;
  return Math.min(100, Math.max(0, score));
}

function computeFriccion(lead) {
  let score = 0;
  if (lead.q_tiene_para_vender &&
      !/^(no|nada|ninguno|sin nada|no tengo)/i.test(lead.q_tiene_para_vender))
    score += 25;
  if (lead.q_visitas_previas &&
      /a[ñn]o|años|mucho tiempo|largo|bastante/i.test(lead.q_visitas_previas))
    score += 20;
  const notas      = parsearNotas(lead.nota);
  const objeciones = notas.filter(n => n.tipo === "objecion").length;
  if (objeciones >= 2) score += 20;
  else if (objeciones === 1) score += 10;
  if (typeof lead.dias === "number" && lead.dias > 14) score += 10;
  return Math.min(100, Math.max(0, score));
}

function computeConfianza(lead) {
  const QKEYS = ["q_visitas_previas","q_freno","q_tiene_para_vender","q_fecha_limite"];
  const respondidas = QKEYS.filter(k => lead[k]).length;
  const notas = parsearNotas(lead.nota);
  const recientes = notas.filter(n => {
    if (!n.createdAt) return false;
    return (Date.now() - new Date(n.createdAt)) / 86400000 <= 7;
  }).length;
  let nivel = respondidas <= 1 ? 0 : respondidas <= 3 ? 1 : 2;
  if (recientes > 0)      nivel = Math.min(2, nivel + 1);
  if (notas.length === 0) nivel = Math.max(0, nivel - 1);
  return ["baja","media","alta"][nivel];
}

const TAG_DEFS = [
  { key:"caliente",      emoji:"🔥", label:"Caliente",        cond:(d)    => d.calor >= 65 },
  { key:"resoluble",     emoji:"⚡", label:"Resoluble",       cond:(d)    => d.viabilidad >= 65 && d.matchability >= 50 },
  { key:"alta_viab",     emoji:"💰", label:"Alta viabilidad", cond:(d)    => d.viabilidad >= 70 },
  { key:"alta_friccion", emoji:"⚠️", label:"Alta fricción",  cond:(d)    => d.friccion >= 50 },
  { key:"match_dificil", emoji:"🏠", label:"Match difícil",   cond:(d)    => d.matchability < 30 },
  { key:"frio",          emoji:"❄️", label:"Frío",            cond:(d)    => d.calor < 25 },
  { key:"vender",        emoji:"🔄", label:"Necesita vender", cond:(_,l)  => l.q_tiene_para_vender && !/^(no|nada|ninguno)/i.test(l.q_tiene_para_vender) },
  { key:"lento",         emoji:"🐌", label:"Decisión lenta",  cond:(_,l)  => l.q_visitas_previas && /a[ñn]o|años|mucho/i.test(l.q_visitas_previas) },
];

function generateTags(dimensiones, lead) {
  return TAG_DEFS.filter(t => t.cond(dimensiones, lead)).slice(0, 3);
}

function generateMotivos(dimensiones, confianza, lead) {
  const m = [];
  if (dimensiones.calor >= 70)
    m.push(lead.etapa === "Negociación" ? "en negociación activa"
      : lead.dias <= 2 ? "contacto reciente" : "nota de urgencia o cierre");
  else if (dimensiones.calor < 30)
    m.push(lead.dias + "d sin contacto");
  if (dimensiones.viabilidad >= 70)   m.push("alta viabilidad de cierre");
  if (dimensiones.matchability >= 65) m.push("hay matches compatibles");
  else if (dimensiones.matchability < 30) m.push("difícil encontrar propiedad");
  if (dimensiones.friccion >= 50) {
    if (lead.q_tiene_para_vender && !/^(no|nada|ninguno)/i.test(lead.q_tiene_para_vender))
      m.push("necesita vender primero");
    else if (lead.q_visitas_previas && /a[ñn]o/i.test(lead.q_visitas_previas))
      m.push("busca hace mucho tiempo");
    else m.push("alta fricción operativa");
  }
  if (confianza === "baja") m.push("lead incompleto — score estimado");
  return m.slice(0, 4);
}

export function computeRanking(lead, matchCount = 0) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido")
    return { prioridad:0, confianza:"alta",
      dimensiones:{calor:0,viabilidad:0,matchability:0,friccion:0}, tags:[], motivos:[] };
  const calor        = computeCalor(lead);
  const viabilidad   = computeViabilidad(lead);
  const matchability = computeMatchability(lead, matchCount);
  const friccion     = computeFriccion(lead);
  const dimensiones  = { calor, viabilidad, matchability, friccion };
  const confianza    = computeConfianza(lead);
  const prioridad    = Math.min(100, Math.max(0, Math.round(
    calor * 0.35 + viabilidad * 0.30 + matchability * 0.25 - friccion * 0.20
  )));
  return { prioridad, confianza, dimensiones,
    tags:    generateTags(dimensiones, lead),
    motivos: generateMotivos(dimensiones, confianza, lead) };
}

export function getPriorityScore(lead, matchCount = 0) {
  return computeRanking(lead, matchCount).prioridad;
}

export function getQualificationScore(lead) {
  let score = 0;
  if (lead.q_visitas_previas)   score += 5;
  if (lead.q_freno)             score += 5;
  if (lead.q_tiene_para_vender) score += 5;
  if (lead.q_fecha_limite)      score += 5;
  if (lead.q_fecha_limite &&
      /semana|mes|agosto|julio|junio|mayo|pronto|r[aá]pido|urgent|vence/i.test(lead.q_fecha_limite))
    score += 15;
  if (lead.q_tiene_para_vender &&
      /^(no|nada|ninguno|sin nada|no tengo)/i.test(lead.q_tiene_para_vender))
    score += 5;
  return score;
}

export function genMsgWhatsApp(lead, prop) {
  const precio  = prop.precio ? "USD " + Number(prop.precio).toLocaleString() : "a consultar";
  const m2      = prop.m2tot  ? " - " + prop.m2tot + "m2" : "";
  const dir     = prop.dir    ? prop.dir    + "\n" : "";
  const caracts = prop.caracts? prop.caracts+ "\n" : "";
  const url     = prop._url   ? prop._url   + "\n" : "";
  return prop.tipo + " en " + prop.zona + "\n" + dir + precio + m2 + "\n" + caracts + url;
}

export function genMsgBusqueda(lead) {
  const stars = Math.round((lead.prob || 0) / 20);
  const encabezado = stars >= 5 ? "🔴 PEDIDO URGENTE — CIERRE RÁPIDO"
    : stars >= 4 ? "🟠 PEDIDO ACTIVO — MUY INTERESADO"
    : stars >= 3 ? "🟡 BÚSQUEDA EN CURSO" : "🔵 PEDIDO DE BÚSQUEDA";
  const partes = [lead.tipo || "Propiedad"];
  if (lead.ambientes) partes.push(lead.ambientes + " amb");
  if (lead.zona)      partes.push(lead.zona);
  const linea1 = partes.join(", ");
  const linea2 = lead.presup ? "USD " + Number(lead.presup).toLocaleString() : null;
  const detalles = [
    lead.credito==="si" && "✅ Crédito aprobado",
    lead.cochera==="si" && "🚗 Cochera",
    lead.cochera==="no" && "❌ Sin cochera",
    lead.balcon ==="si" && "🏙 Balcón",
    lead.patio  ==="si" && "🌿 Patio",
    lead.m2min          && "📐 Mín. " + lead.m2min + "m²",
    lead.op==="Inversor"&& "📈 Inversor",
  ].filter(Boolean);
  return [encabezado, linea2 ? linea1+" · "+linea2 : linea1,
    detalles.length ? detalles.join(" · ") : null,
    "Alba Inversiones · REG 3832"].filter(Boolean).join("\n").trim();
}

export function detectIncident(lead) {
  const notas    = parsearNotas(lead.nota);
  const tipoNota = tipoNotaReciente(notas);
  const _dias = typeof lead.dias === "number" ? lead.dias : null;
  if (tipoNota === "urgencia" && _dias !== null && _dias >= 1)
    return { tipo:"urgencia_sin_atender", label:"🔥 Urgencia sin atender" };
  if (tipoNota === "interes"  && _dias !== null && _dias >= 3)
    return { tipo:"interes_frio",         label:"❄️ Interés sin seguimiento" };
  if (lead.etapa === "Negociación" && _dias !== null && _dias >= 2)
    return { tipo:"negociacion_parada",   label:"⚠️ Negociación parada" };
  return null;
}

export function getRecommendedAction(lead) {
  const notas = parsearNotas(lead.nota);
  const tipo  = tipoNotaReciente(notas);
  const score = getPriorityScore(lead);
  if (tipo === "urgencia") return { accion:"Llamar ahora",    urgencia:"alta",  motivo:"Marcó urgencia en nota" };
  if (tipo === "cierre")   return { accion:"Preparar oferta", urgencia:"alta",  motivo:"Lista para cerrar" };
  if (tipo === "objecion") return { accion:"Follow up 48h",   urgencia:"media", motivo:"Tiene objeción — no presionar" };
  if (tipo === "interes" && lead.dias >= 2)
    return { accion:"Enviar match hoy", urgencia:"alta", motivo:"Interés activo + días sin contacto" };
  if (lead.etapa === "Negociación" && typeof lead.dias === "number" && lead.dias >= 1)
    return { accion:"Llamar ahora", urgencia:"alta", motivo:"Negociación activa sin contacto" };
  if (score > 80 && typeof lead.dias === "number" && lead.dias >= 2)
    return { accion:"Llamar ahora", urgencia:"alta", motivo:lead.dias+"d sin contacto, alta prioridad" };
  if (score > 70) return { accion:"Enviar match",    urgencia:"media", motivo:"Lead activo" };
  if (score > 50) return { accion:"Seguimiento",     urgencia:"media", motivo:"En pipeline activo" };
  return           { accion:"Baja prioridad",         urgencia:"baja",  motivo:"Sin actividad reciente" };
}

export function computeLeadState(lead) {
  const notas    = parsearNotas(lead.nota);
  const tipoNota = tipoNotaReciente(notas);
  const score    = getPriorityScore(lead);
  const { accion, urgencia, motivo } = getRecommendedAction(lead);
  const incident = detectIncident(lead);
  return { score, urgencia, accion, motivo, incident, tipoNota };
}
