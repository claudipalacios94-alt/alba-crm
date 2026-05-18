// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / RENTAL
// Lógica pura de alquileres. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

/** Estados posibles de un alquiler */
export const ESTADOS_ALQUILER = ["Alquilado", "Disponible", "Reservado", "En renovación"];

/** Tipos de alquiler */
export const TIPOS_ALQUILER = ["Permanente", "Temporario", "Comercial"];

/**
 * Valida los datos mínimos de un alquiler antes de guardar.
 * @param {object} data
 * @returns {{ ok: boolean, errores: string[] }}
 */
export function validarAlquiler(data) {
  const errores = [];
  if (!data.nombre)  errores.push("El nombre/identificador es obligatorio");
  if (!data.zona)    errores.push("La zona es obligatoria");
  if (!data.tipo)    errores.push("El tipo de propiedad es obligatorio");
  if (!data.tipoAlq) errores.push("El tipo de alquiler es obligatorio");
  if (data.precioARS && isNaN(Number(data.precioARS)))
    errores.push("El precio debe ser un número");
  return { ok: errores.length === 0, errores };
}

/**
 * Normaliza datos crudos de un alquiler para guardar en Supabase.
 * @param {object} raw
 * @returns {object}
 */
export function normalizarAlquiler(raw) {
  return {
    nombre:    raw.nombre?.trim()    || null,
    tipo:      raw.tipo              || null,
    zona:      raw.zona?.trim()      || null,
    tipoAlq:   raw.tipoAlq          || "Permanente",
    estado:    raw.estado           || "Disponible",
    precioARS: raw.precioARS ? Number(raw.precioARS) : null,
    info:      raw.info?.trim()      || null,
    ag:        raw.ag               || null,
    m2tot:     raw.m2tot ? Number(raw.m2tot) : null,
    ambientes: raw.ambientes ? Number(raw.ambientes) : null,
  };
}

/**
 * Calcula rentabilidad bruta anual de una propiedad.
 * Fórmula: (alquilerMensualUSD * 12 / valorPropiedad) * 100
 * @param {number} alquilerMensualUSD
 * @param {number} valorPropiedadUSD
 * @returns {{ pct: number, label: string, nivel: 'bajo'|'medio'|'bueno'|'excelente' }}
 */
export function calcRentabilidad(alquilerMensualUSD, valorPropiedadUSD) {
  if (!alquilerMensualUSD || !valorPropiedadUSD) {
    return { pct: 0, label: "—", nivel: "bajo" };
  }
  const pct = (alquilerMensualUSD * 12 / valorPropiedadUSD) * 100;
  const label = pct.toFixed(1) + "% anual";

  let nivel;
  if (pct >= 6)      nivel = "excelente";
  else if (pct >= 4) nivel = "bueno";
  else if (pct >= 2) nivel = "medio";
  else               nivel = "bajo";

  return { pct, label, nivel };
}

/**
 * Color semáforo según nivel de rentabilidad.
 * @param {'bajo'|'medio'|'bueno'|'excelente'} nivel
 * @returns {string} hex color
 */
export function colorRentabilidad(nivel) {
  const mapa = {
    excelente: "#2E9E6A",
    bueno:     "#3EAA72",
    medio:     "#E07B2A",
    bajo:      "#D94F3D",
  };
  return mapa[nivel] ?? "#4A6A90";
}

/**
 * Calcula cuántos meses faltan para el vencimiento de contrato.
 * @param {string|Date} fechaVencimiento
 * @returns {{ meses: number, label: string, alerta: boolean }}
 */
export function calcVencimientoContrato(fechaVencimiento) {
  if (!fechaVencimiento) return { meses: 0, label: "Sin fecha", alerta: false };
  const diff = new Date(fechaVencimiento).getTime() - Date.now();
  const meses = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  if (meses < 0)  return { meses, label: "Vencido",           alerta: true };
  if (meses === 0) return { meses, label: "Vence este mes",   alerta: true };
  if (meses <= 2)  return { meses, label: `Vence en ${meses} mes${meses > 1 ? "es" : ""}`, alerta: true };
  return { meses, label: `${meses} meses`, alerta: false };
}

/**
 * Determina el color del badge de estado de alquiler.
 * @param {string} estado
 * @returns {string} hex
 */
export function colorEstadoAlquiler(estado) {
  const mapa = {
    "Alquilado":      "#2E9E6A",
    "Disponible":     "#3A8BC4",
    "Reservado":      "#E8A830",
    "En renovación":  "#9B6DC8",
  };
  return mapa[estado] ?? "#4A6A90";
}

/**
 * Filtra alquileres por estado y query de texto libre.
 * @param {object[]} rentals
 * @param {{ estado?: string, q?: string }} filtros
 * @returns {object[]}
 */
export function filtrarAlquileres(rentals, { estado = "Todos", q = "" } = {}) {
  return rentals.filter(a => {
    if (estado !== "Todos" && a.estado !== estado) return false;
    if (q) {
      const haystack = [a.nombre, a.zona, a.tipo, a.tipoAlq, a.info]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}
