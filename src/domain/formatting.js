// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / FORMATTING
// Funciones puras de formateo. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

/**
 * Formatea precio en USD.
 * @param {number|string|null} precio
 * @returns {string} "USD 150,000" | "A consultar"
 */
export function formatPrecioUSD(precio) {
  const n = Number(precio);
  if (!precio || isNaN(n) || n === 0) return "A consultar";
  return "USD " + n.toLocaleString("es-AR");
}

/**
 * Formatea precio en ARS mensual (alquileres).
 * @param {number|string|null} precio
 * @returns {string} "ARS 250,000/mes" | "A consultar"
 */
export function formatPrecioARS(precio) {
  const n = Number(precio);
  if (!precio || isNaN(n) || n === 0) return "A consultar";
  return "ARS " + n.toLocaleString("es-AR") + "/mes";
}

/**
 * Calcula porcentaje de retaso y devuelve datos para mostrar badge.
 * @param {number|string} precioActual
 * @param {number|string} precioOriginal
 * @returns {{ esRetasado: boolean, pct: number, label: string }}
 */
export function calcRetaso(precioActual, precioOriginal) {
  const actual   = Number(precioActual);
  const original = Number(precioOriginal);
  if (!actual || !original || actual >= original) {
    return { esRetasado: false, pct: 0, label: "" };
  }
  const pct = Math.round((1 - actual / original) * 100);
  return { esRetasado: true, pct, label: `-${pct}%` };
}

/**
 * Calcula precio por m².
 * @param {number|string} precio
 * @param {number|string} m2
 * @returns {string} "USD 2,500/m²" | ""
 */
export function formatPrecioPorM2(precio, m2) {
  const p = Number(precio);
  const m = Number(m2);
  if (!p || !m) return "";
  return "USD " + Math.round(p / m).toLocaleString("es-AR") + "/m²";
}

/**
 * Calcula superficie legible.
 * @param {number|string} m2tot
 * @param {number|string} m2cub
 * @returns {string} "80m² · 65m² cub" | "80m²" | ""
 */
export function formatSuperficie(m2tot, m2cub) {
  const tot = Number(m2tot);
  const cub = Number(m2cub);
  if (!tot) return "";
  return cub ? `${tot}m² · ${cub}m² cub` : `${tot}m²`;
}

/**
 * Normaliza precio original al guardar (solo actualiza si sube).
 * Regla: si precio baja → precio_original se conserva (marca retaso).
 *        si precio sube → precio_original se actualiza al nuevo valor.
 * @param {number} nuevoPrecio
 * @param {number} precioOriginalActual
 * @returns {number} el precio_original que debe guardarse
 */
export function calcPrecioOriginalAlGuardar(nuevoPrecio, precioOriginalActual) {
  const nuevo    = Number(nuevoPrecio);
  const original = Number(precioOriginalActual) || nuevo;
  return nuevo > original ? nuevo : original;
}

/**
 * Formatea días en cartera de forma legible.
 * @param {number} dias
 * @returns {string} "3d" | "2 sem" | "1 mes" | "4 meses"
 */
export function formatDiasEnCartera(dias) {
  const d = Number(dias);
  if (!d || d < 0) return "";
  if (d < 7)  return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)} sem`;
  const meses = Math.floor(d / 30);
  return meses === 1 ? "1 mes" : `${meses} meses`;
}

/**
 * Formatea dirección para mostrar en card.
 * Agrega emoji 📍 si tiene coordenadas.
 * @param {string} dir
 * @param {number|null} lat
 * @returns {string}
 */
export function formatDireccion(dir, lat = null) {
  if (!dir) return "";
  return lat ? `${dir} 📍` : dir;
}

/**
 * Formatea fecha ISO a formato legible en español (Argentina).
 * @param {string|Date} fecha
 * @returns {string} "12 may 2026" | ""
 */
export function formatFecha(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Formatea fecha relativa: "hace 3 días", "hace 1 semana", etc.
 * @param {string|Date} fecha
 * @returns {string}
 */
export function formatFechaRelativa(fecha) {
  if (!fecha) return "";
  const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7)  return `hace ${diff} días`;
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem`;
  const meses = Math.floor(diff / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

/**
 * Formatea teléfono argentino para link de WhatsApp.
 * Elimina espacios, guiones y paréntesis. Agrega 54 si no tiene código de país.
 * @param {string} tel
 * @returns {string} "5492235001234" | ""
 */
export function formatTelWA(tel) {
  if (!tel) return "";
  const limpio = tel.replace(/\D/g, "");
  if (limpio.startsWith("54")) return limpio;
  if (limpio.startsWith("0")) return "54" + limpio.slice(1);
  if (limpio.startsWith("9")) return "54" + limpio;
  return "54" + limpio;
}

/**
 * Genera URL de WhatsApp.
 * @param {string} tel
 * @param {string} [msg]
 * @returns {string|null}
 */
export function urlWhatsApp(tel, msg = "") {
  const num = formatTelWA(tel);
  if (!num) return null;
  return msg
    ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/${num}`;
}