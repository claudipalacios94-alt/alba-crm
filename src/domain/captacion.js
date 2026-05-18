// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / CAPTACION
// Lógica pura de captaciones. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

import { normZona } from "./matching.js";

/** Tipos de captación */
export const TIPOS_CAPTACION = ["propia", "honorarios", "colega"];

/** Tipos de operación */
export const TIPOS_OP_CAPTACION = ["Venta", "Alquiler", "Alquiler temporario"];

/**
 * Valida los campos mínimos de una captación antes de guardar.
 * @param {object} data
 * @returns {{ ok: boolean, errores: string[] }}
 */
export function validarCaptacion(data) {
  const errores = [];
  if (!data.tipo)      errores.push("El tipo de propiedad es obligatorio");
  if (!data.zona)      errores.push("La zona es obligatoria");
  if (!data.operacion) errores.push("El tipo de operación es obligatorio");
  if (!data.tel && !data.url)
    errores.push("Se requiere al menos teléfono o URL del portal");
  if (data.precio && isNaN(Number(data.precio)))
    errores.push("El precio debe ser un número");
  if (!TIPOS_CAPTACION.includes(data.tipo_captacion))
    errores.push("Tipo de captación inválido (propia / honorarios / colega)");
  return { ok: errores.length === 0, errores };
}

/**
 * Normaliza datos crudos de una captación para guardar.
 * @param {object} raw
 * @returns {object}
 */
export function normalizarCaptacion(raw) {
  return {
    tipo:           raw.tipo              || null,
    zona:           raw.zona?.trim()      || null,
    direccion:      raw.direccion?.trim() || null,
    precio:         raw.precio ? Number(raw.precio) : null,
    ambientes:      raw.ambientes ? Number(raw.ambientes) : null,
    cochera:        raw.cochera === "si"  || raw.cochera === true,
    operacion:      raw.operacion         || "Venta",
    tipo_captacion: raw.tipo_captacion    || "propia",
    tel:            raw.tel?.trim()       || null,
    url:            raw.url?.trim()       || null,
    caracts:        raw.caracts?.trim()   || null,
    contenido:      raw.contenido?.trim() || null,
    nota_interna:   raw.nota_interna?.trim() || null,
    ag:             raw.ag               || null,
    convertida:     raw.convertida        ?? false,
  };
}

/**
 * Determina el color del badge de tipo_captacion.
 * @param {string} tipo_captacion
 * @returns {string} hex
 */
export function colorTipoCaptacion(tipo_captacion) {
  const mapa = {
    propia:      "#3A8BC4",
    honorarios:  "#2E9E6A",
    colega:      "#9B6DC8",
  };
  return mapa[tipo_captacion] ?? "#4A6A90";
}

/**
 * Calcula el score de una zona de captación según leads activos.
 * Devuelve cuántos leads del CRM tienen esa zona como preferencia.
 *
 * @param {string} zona — zona de la captación
 * @param {object[]} leads — todos los leads activos
 * @returns {{ score: number, leadsInteresados: number, nivel: 'alta'|'media'|'baja' }}
 */
export function scoringZonaCaptacion(zona, leads) {
  if (!leads?.length || !zona) {
    return { score: 0, leadsInteresados: 0, nivel: "baja" };
  }

  const zonaNorm = normZona(zona);
  const activos = leads.filter(
    l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"
  );

  const leadsInteresados = activos.filter(lead => {
    const zonasLead = (lead.zona || "")
      .split(/[,\/]|\s+y\s+/)
      .map(z => normZona(z))
      .filter(Boolean);
    return zonasLead.some(z => zonaNorm.includes(z) || z.includes(zonaNorm));
  }).length;

  const total = activos.length || 1;
  const score = Math.round((leadsInteresados / total) * 100);

  let nivel;
  if (leadsInteresados >= 5 || score >= 20) nivel = "alta";
  else if (leadsInteresados >= 2)           nivel = "media";
  else                                      nivel = "baja";

  return { score, leadsInteresados, nivel };
}

/**
 * Color semáforo para nivel de demanda de zona.
 * @param {'alta'|'media'|'baja'} nivel
 * @returns {string} hex
 */
export function colorDemandaZona(nivel) {
  const mapa = { alta: "#2E9E6A", media: "#E07B2A", baja: "#D94F3D" };
  return mapa[nivel] ?? "#4A6A90";
}

/**
 * Filtra captaciones por zona, tipo y operación.
 * @param {object[]} captaciones
 * @param {{ zona?: string, tipo?: string, operacion?: string, q?: string, convertida?: boolean }} filtros
 * @returns {object[]}
 */
export function filtrarCaptaciones(captaciones, filtros = {}) {
  const { zona, tipo, operacion, q, convertida } = filtros;
  return captaciones.filter(c => {
    if (zona && normZona(c.zona) !== normZona(zona)) return false;
    if (tipo && c.tipo !== tipo) return false;
    if (operacion && c.operacion !== operacion) return false;
    if (convertida !== undefined && c.convertida !== convertida) return false;
    if (q) {
      const haystack = [c.direccion, c.zona, c.tipo, c.caracts, c.contenido, c.nota_interna]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

/**
 * Clasifica una captación según su potencial comercial.
 * Heurística basada en tipo_captacion y precio disponible.
 * @param {object} captacion
 * @returns {'alta'|'media'|'baja'}
 */
export function potencialCaptacion(captacion) {
  if (captacion.tipo_captacion === "propia" && captacion.precio) return "alta";
  if (captacion.tipo_captacion === "honorarios")                  return "alta";
  if (captacion.precio)                                           return "media";
  return "baja";
}