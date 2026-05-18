// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / PROPERTY
// Lógica pura de propiedades. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

import { calcRetaso } from "./formatting.js";

/** Tipos válidos de propiedad (venta) */
export const TIPOS_PROP = ["Departamento", "Casa", "PH", "Dúplex", "Local", "Terreno"];

/** Estados de conservación */
export const ESTADOS_PROP = ["Excelente", "Buen Estado", "Para Reciclar", "A Refaccionar"];

/** Categorías de cartera */
export const CATEGORIAS_PROP = [
  { key: "destacada", label: "Destacada",     color: "#E8A830" },
  { key: "hon3",      label: "Honorarios 3%", color: "#2E9E6A" },
  { key: "hon6",      label: "Honorarios 6%", color: "#3EAA72" },
  { key: "colega",    label: "Colega",        color: "#9B6DC8" },
  { key: "normal",    label: "Sin categoría", color: "#4A6A90" },
];

/**
 * Devuelve la info de categoría de una propiedad.
 * @param {string} key
 * @returns {{ key: string, label: string, color: string }}
 */
export function getCategoriaInfo(key) {
  return CATEGORIAS_PROP.find(c => c.key === key) ?? CATEGORIAS_PROP[4];
}

/**
 * Determina el color del badge de estado de conservación.
 * @param {string} estado
 * @returns {string} color hex
 */
export function colorEstado(estado) {
  const mapa = {
    "Excelente":      "#2E9E6A",
    "Buen Estado":    "#3A8BC4",
    "Para Reciclar":  "#E07B2A",
    "A Refaccionar":  "#D94F3D",
  };
  return mapa[estado] ?? "#4A6A90";
}

/**
 * Valida los datos mínimos de una propiedad antes de guardar.
 * @param {object} data
 * @returns {{ ok: boolean, errores: string[] }}
 */
export function validarPropiedad(data) {
  const errores = [];
  if (!data.tipo)   errores.push("El tipo es obligatorio");
  if (!data.zona)   errores.push("La zona es obligatoria");
  if (!data.dir)    errores.push("La dirección es obligatoria");
  if (data.precio && isNaN(Number(data.precio)))
    errores.push("El precio debe ser un número");
  if (data.m2tot && isNaN(Number(data.m2tot)))
    errores.push("La superficie total debe ser un número");
  if (data.m2cub && isNaN(Number(data.m2cub)))
    errores.push("La superficie cubierta debe ser un número");
  if (data.m2cub && data.m2tot && Number(data.m2cub) > Number(data.m2tot))
    errores.push("La superficie cubierta no puede superar la total");
  return { ok: errores.length === 0, errores };
}

/**
 * Normaliza los campos numéricos de una propiedad para guardar en Supabase.
 * Convierte strings vacíos a null.
 * @param {object} raw — datos crudos del formulario
 * @param {object} [propExistente] — propiedad actual (para calcular precio_original)
 * @returns {object} datos normalizados listos para upsert
 */
export function normalizarPropiedad(raw, propExistente = null) {
  const precio = raw.precio ? Number(raw.precio) : null;
  const precioOrigActual = propExistente?.precio_original ?? propExistente?.precio ?? precio;

  let precio_original = precioOrigActual;
  if (precio && precioOrigActual) {
    precio_original = precio > Number(precioOrigActual)
      ? precio
      : Number(precioOrigActual);
  }

  return {
    tipo:            raw.tipo            || null,
    zona:            raw.zona?.trim()    || null,
    dir:             raw.dir?.trim()     || null,
    precio,
    precio_original: precio_original     || null,
    m2tot:           raw.m2tot ? Number(raw.m2tot) : null,
    m2cub:           raw.m2cub ? Number(raw.m2cub) : null,
    caracts:         raw.caracts?.trim() || null,
    info:            raw.info?.trim()    || null,
    descripcion:     raw.descripcion?.trim() || null,
    fotos:           raw.fotos?.trim()   || null,
    estado:          raw.estado          || "Buen Estado",
    ag:              raw.ag              || null,
  };
}

/**
 * Determina si una propiedad está retasada.
 * @param {object} prop
 * @returns {boolean}
 */
export function esRetasada(prop) {
  return calcRetaso(prop.precio, prop.precio_original).esRetasado;
}

/**
 * Agrupa propiedades por categoría para el render de secciones.
 * @param {object[]} properties — ya filtradas por búsqueda/tipo
 * @returns {{ retasadas, destacadas, hon3, hon6, colegas, resto }}
 */
export function agruparPropiedadesPorCategoria(properties) {
  const retasadas  = properties.filter(esRetasada);
  const noRetasada = properties.filter(p => !esRetasada(p));
  return {
    retasadas,
    destacadas: noRetasada.filter(p => p.categoria === "destacada"),
    hon3:       noRetasada.filter(p => p.categoria === "hon3"),
    hon6:       noRetasada.filter(p => p.categoria === "hon6"),
    colegas:    noRetasada.filter(p => p.categoria === "colega"),
    resto:      noRetasada.filter(p => !p.categoria || p.categoria === "normal"),
  };
}

/**
 * Filtra propiedades por tipo y query de texto libre.
 * @param {object[]} properties
 * @param {{ tipo?: string, q?: string }} filtros
 * @returns {object[]}
 */
export function filtrarPropiedades(properties, { tipo = "Todos", q = "" } = {}) {
  return properties.filter(p => {
    if (tipo !== "Todos" && p.tipo !== tipo) return false;
    if (q) {
      const haystack = [p.dir, p.zona, p.tipo, p.caracts, p.descripcion]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

/**
 * Extrae la lista de tipos únicos de un array de propiedades.
 * @param {object[]} properties
 * @returns {string[]} ["Todos", "Departamento", ...]
 */
export function getTiposUnicos(properties) {
  const tipos = [...new Set(properties.map(p => p.tipo).filter(Boolean))];
  return ["Todos", ...tipos];
}

/**
 * Determina el color del badge de "stock crítico" (sc).
 * Lógica espejada de PropCard en Propiedades.jsx.
 * @param {string} sc — campo sc de la propiedad
 * @param {{ hot: string, warm: string, ok: string }} colores
 * @returns {string}
 */
export function colorStockCritico(sc, colores) {
  if (!sc) return colores.ok;
  if (sc.includes("Urgente")) return colores.hot;
  if (sc.includes("tenci"))   return colores.warm; // "Atención"
  return colores.ok;
}