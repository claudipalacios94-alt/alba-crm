// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / OFERTA
// Normalización y lógica de negocio del módulo Oferta.
// Sin React, sin Supabase, sin stores. Datos → items normalizados.
// ══════════════════════════════════════════════════════════════
import { matchPropLeads } from "./matching.js";

// ── Helpers internos ───────────────────────────────────────────

function parseCaracts(v) {
  if (!v) return [];
  const arr = Array.isArray(v) ? v.map(String) : String(v).split(/[,;]/).map(s => s.trim());
  return arr
    .filter(Boolean)
    .filter(s => !s.match(/^\d+[\s,]*(m[²2]?|metros?)$/i)); // evita duplicar m2tot
}

function mapOrigenCaptacion(tipo_captacion) {
  const t = (tipo_captacion || "").toLowerCase();
  if (t === "colega")     return "Colega";
  if (t === "honorarios") return "Honorarios";
  if (t === "propia")     return "Propia";
  return "Captación";
}

function diasDesde(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function safeMatchPropLeads(propLike, leads) {
  try { return matchPropLeads(propLike, leads).length; }
  catch { return 0; }
}

// Origen de una propiedad según su categoría (las captaciones usan tipo_captacion).
function origenProperty(categoria) {
  const c = (categoria || "").toLowerCase();
  if (c === "colega")               return "Colega";
  if (c === "hon3" || c === "hon6") return "Honorarios";
  return "Propia"; // destacada / normal / null / MDL importada
}

// Detecta "apto crédito" en cualquier campo de texto disponible.
function detectAptoCredito(...fields) {
  const txt = fields.filter(Boolean).join(" ").toLowerCase();
  return /apto\s*cr[eé]dito|apto\s*banco|cr[eé]dito\s*hipotecario/.test(txt);
}

// ── buildOfertaItems ───────────────────────────────────────────
export function buildOfertaItems(properties = [], captaciones = [], leads = []) {
  const items = [];

  // — Properties ------------------------------------------------
  for (const p of properties) {
    // Solo propiedades válidas — vendidas/reservadas/alquiladas (activa=false) fuera de Oferta
    if (p.activa === false) continue;
    const matches = safeMatchPropLeads(p, leads);
    const foto = p.fotos
      ? (p.fotos.split("\n").filter(Boolean)[0] || null)
      : null;
    const retasada    = !!(p.precio_original && p.precio && Number(p.precio_original) > Number(p.precio));
    const retasadaPct = retasada
      ? Math.round((1 - Number(p.precio) / Number(p.precio_original)) * 100)
      : null;
    items.push({
      id:         `prop-${p.id}`,
      source:     "property",
      origen:     origenProperty(p.categoria),
      tipo:       p.tipo      || "",
      zona:       p.zona      || "",
      direccion:  p.dir       || "",
      precio:     p.precio    ? Number(p.precio)  : null,
      ambientes:  null,
      m2tot:      p.m2tot     ? Number(p.m2tot)   : null,
      m2cub:      p.m2cub     ? Number(p.m2cub)   : null,
      caracts:    parseCaracts(p.caracts),
      estado:     "Activa", // inactivas ya filtradas arriba
      lat:        p.lat,
      lng:        p.lng,
      created_at: p.created_at,
      matches,
      // — Flags operativos —
      matchesCount: matches,
      tieneMatches: matches > 0,
      sinMatch:     matches === 0,
      foto,
      sinFoto:      !foto,
      sinLink:      !(p.web_url || p.url),
      sinFicha:     !p.precio || !p.tipo || !p.zona,
      retasada,
      retasadaPct,
      aptoCredito:  detectAptoCredito(p.caracts, p.info, p.descripcion, p.sc),
      web_url:    p.web_url || null,
      contacto:   null,
      raw:        p,
    });
  }

  // — Captaciones -----------------------------------------------
  for (const c of captaciones) {
    const propLike = { zona: c.zona, tipo: c.tipo, precio: c.precio, caracts: c.caracts };
    const matches  = safeMatchPropLeads(propLike, leads);
    const dias     = diasDesde(c.created_at);

    let estado = c.convertida ? "Convertida" : "Sin convertir";
    if (!c.convertida && dias !== null && dias >= 18 && dias <= 21) estado = "Vence pronto";

    const contacto = [c.nombre_propietario, c.inmobiliaria, c.telefono].find(Boolean) || null;

    items.push({
      id:         `cap-${c.id}`,
      source:     "captacion",
      origen:     mapOrigenCaptacion(c.tipo_captacion),
      tipo:       c.tipo      || "",
      zona:       c.zona      || "",
      direccion:  c.direccion || "",
      precio:     c.precio    ? Number(c.precio)   : null,
      ambientes:  c.ambientes ? Number(c.ambientes) : null,
      m2tot:      null,
      m2cub:      null,
      caracts:    parseCaracts(c.caracts),
      estado,
      lat:        c.lat,
      lng:        c.lng,
      created_at: c.created_at,
      matches,
      // — Flags operativos —
      matchesCount: matches,
      tieneMatches: matches > 0,
      sinMatch:     matches === 0 && estado !== "Convertida",
      sinLink:      !c.url,
      sinFicha:     !c.precio || !c.tipo || !c.zona,
      retasada:     false,
      retasadaPct:  null,
      aptoCredito:  detectAptoCredito(c.caracts),
      contacto,
      raw:        c,
    });
  }

  return items;
}

// ── getOfertaKPIs ──────────────────────────────────────────────
export function getOfertaKPIs(items = []) {
  // "Activa" = disponible para ofrecer (excluye Inactiva Y Convertida)
  const workable  = items.filter(i => i.estado !== "Inactiva" && i.estado !== "Convertida");
  const activas   = workable.length;
  const conMatch  = workable.filter(i => i.matches > 0).length;
  const sinMatch  = workable.filter(i => i.matches === 0).length;

  // Captaciones en inventario (todas, incluyendo convertidas como referencia)
  const captaciones = items.filter(i => i.source === "captacion" && i.estado !== "Inactiva").length;

  const vencenProto = items.filter(i => i.estado === "Vence pronto").length;

  // Zonas calientes: match total de la zona > 2× su cantidad de oferta
  const zonaMatch  = {};
  const zonaOferta = {};
  for (const i of workable.filter(i => i.zona)) {
    zonaOferta[i.zona] = (zonaOferta[i.zona] || 0) + 1;
    if (i.matches > 0) zonaMatch[i.zona] = (zonaMatch[i.zona] || 0) + i.matches;
  }
  const zonasCalientes = Object.keys(zonaMatch)
    .filter(z => zonaMatch[z] > (zonaOferta[z] || 0) * 2).length;

  return { activas, conMatch, sinMatch, captaciones, vencenProto, zonasCalientes };
}

// ── getTabCounts ───────────────────────────────────────────────
export function getTabCounts(items = []) {
  return {
    todo:        items.length,
    propiedades: items.filter(i => i.source === "property").length,
    captaciones: items.filter(i => i.source === "captacion").length,
    colegas:     items.filter(i => i.origen === "Colega").length,
    honorarios:  items.filter(i => i.origen === "Honorarios").length,
    alquileres:  0,
  };
}

// ── filterOfertaItems ──────────────────────────────────────────
export function filterOfertaItems(items = [], tab = "todo", filters = {}) {
  let result = [...items];

  if (tab === "propiedades") result = result.filter(i => i.source === "property");
  else if (tab === "captaciones") result = result.filter(i => i.source === "captacion");
  else if (tab === "colegas")     result = result.filter(i => i.origen === "Colega");
  else if (tab === "honorarios")  result = result.filter(i => i.origen === "Honorarios");
  else if (tab === "alquileres")  return [];

  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(i =>
      (i.direccion || "").toLowerCase().includes(q) ||
      (i.zona      || "").toLowerCase().includes(q) ||
      (i.tipo      || "").toLowerCase().includes(q)
    );
  }
  if (filters.zona)   result = result.filter(i => i.zona    === filters.zona);
  if (filters.tipo)   result = result.filter(i => i.tipo    === filters.tipo);
  if (filters.fuente) result = result.filter(i => i.origen  === filters.fuente);
  if (filters.match === "si") result = result.filter(i => i.matches > 0);
  if (filters.match === "no") result = result.filter(i => i.matches === 0);

  return result;
}

// ── sortOfertaItems ────────────────────────────────────────────
export function sortOfertaItems(items = [], orden = "recientes") {
  const s = [...items];
  if (orden === "matches")      return s.sort((a, b) => b.matches - a.matches);
  if (orden === "precio_asc")   return s.sort((a, b) => (a.precio || 0) - (b.precio || 0));
  if (orden === "precio_desc")  return s.sort((a, b) => (b.precio || 0) - (a.precio || 0));
  return s.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// ── Acciones / mensajes ────────────────────────────────────────

/**
 * Formatea un teléfono argentino para abrir en WhatsApp.
 * Agrega código de país 54 si no lo tiene.
 */
export function formatTelefonoWA(tel) {
  if (!tel) return null;
  let d = String(tel).replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = "54" + d;
  return d.length >= 10 ? d : null;
}

/**
 * Genera el mensaje de oferta para copiar al portapapeles / WhatsApp grupos.
 * Máx 5 líneas, sin null/undefined.
 */
export function generarMensajeOferta(item) {
  const lineas = [];
  const tipoZona = [item.tipo, item.zona].filter(Boolean).join(" · ");
  if (tipoZona)      lineas.push(`🏠 ${tipoZona}`);
  if (item.direccion) lineas.push(`📍 ${item.direccion}`);
  if (item.precio)    lineas.push(`💰 USD ${Number(item.precio).toLocaleString("es-AR")}`);
  const detalles = [
    item.ambientes ? `${item.ambientes} amb` : null,
    item.m2tot     ? `${item.m2tot} m²`      : null,
    ...(item.caracts || []).slice(0, 3),
  ].filter(Boolean).join(" · ");
  if (detalles) lineas.push(detalles);
  const url = item.web_url || item.raw?.web_url || item.raw?.url;
  if (url) lineas.push(url);
  return lineas.join("\n");
}

/**
 * Genera mensaje para contactar al dueño/colega de una captación.
 */
export function generarMensajeContacto(item) {
  const rawNombre = item.raw?.nombre_propietario || "";
  const nombre = rawNombre ? rawNombre.split(" ")[0] : "";
  const saludo = nombre ? `Hola ${nombre}, ¿cómo estás?` : "Hola, ¿cómo estás?";
  const ref    = item.direccion || item.zona || "la propiedad";
  const precio = item.precio ? ` de USD ${Number(item.precio).toLocaleString("es-AR")}` : "";
  return `${saludo} Te escribo por la propiedad de ${ref}${precio}. ¿Sigue disponible?`;
}

/**
 * Genera mensaje para enviar a un lead interesado en un item.
 */
export function generarMensajeLeadOferta(lead, item) {
  const nombre   = (lead.nombre || "").split(" ")[0];
  const saludo   = nombre ? `Hola ${nombre}, ¿cómo andás?` : "Hola, ¿cómo andás?";
  const tipoZona = [item.tipo, item.zona].filter(Boolean).join(" en ");
  const precio   = item.precio ? ` a USD ${Number(item.precio).toLocaleString("es-AR")}` : "";
  const detalles = [
    item.ambientes ? `${item.ambientes} amb` : null,
    item.m2tot     ? `${item.m2tot} m²`      : null,
  ].filter(Boolean).join(" · ");
  return [
    `${saludo} Tengo una propiedad que puede interesarte:`,
    `🏠 ${tipoZona}${precio}`,
    detalles ? detalles : null,
    item.direccion ? `📍 ${item.direccion}` : null,
    "¿Podemos hablar?",
  ].filter(Boolean).join("\n");
}

/**
 * Retorna los leads que matchean un item de Oferta.
 * Usa matchPropLeads internamente (no modificado).
 */
export function getMatchingLeads(item, leads) {
  if (!leads?.length) return [];
  // item ya tiene zona/tipo/precio normalizados — válidos para matchPropLeads
  try { return matchPropLeads(item, leads); }
  catch { return []; }
}

// ── getOfertaActionItems ───────────────────────────────────────
/**
 * Genera los items de "Para trabajar hoy".
 *
 * Prioridad (orden de negocio real):
 *   1. Más matches (cuantos más, primero — son ventas más probables)
 *   2. Captaciones que vencen pronto (se pierden si no se trabajan)
 *   3. Colegas/honorarios con algún match
 *   4. Captación sin convertir + tiene contacto
 *   5. 1 match solo
 *
 * Fallback: si hay menos de maxItems, completa con captaciones
 * recientes sin convertir para que la sección nunca quede vacía.
 */
export function getOfertaActionItems(items = [], maxItems = 6) {
  const scored = [];

  for (const item of items) {
    if (item.estado === "Inactiva" || item.estado === "Convertida") continue;

    const m = item.matchesCount ?? item.matches ?? 0;
    let score = 0, motivo = "", contexto = "", accion = "", urgencia = "media";

    // Contexto extra para cards de match — solo datos reales (created_at / web_url).
    const dias     = diasDesde(item.created_at);
    const nueva    = dias !== null && dias <= 14;
    const ctxMatch = nueva && item.web_url ? "Nueva · publicada en web"
                   : nueva                 ? "Nueva"
                   : item.web_url          ? "Publicada en web" : "";

    // Una sola razón por card: la de mayor prioridad que aplique.
    if (m >= 5) {
      score = 150 + m; urgencia = "alta";
      motivo = `${m} matches activos`; contexto = ctxMatch; accion = "💬 Mandar hoy por WhatsApp";
    } else if (m >= 2) {
      score = 110 + m; urgencia = "alta";
      motivo = `${m} matches activos`; contexto = ctxMatch; accion = "💬 Mandar hoy por WhatsApp";
    } else if (item.retasada) {
      score = 100; urgencia = "alta";
      motivo = item.retasadaPct ? `Retasada -${item.retasadaPct}%` : "Retasada";
      accion = "🔄 Reactivar leads compatibles";
    } else if (item.aptoCredito) {
      score = 90;
      motivo = "Apto crédito";                accion = "🏦 Mandar a leads con crédito";
    } else if (item.estado === "Vence pronto") {
      score = 80; urgencia = "alta";
      motivo = "Vence pronto";                accion = "📞 Contactar propietario";
    } else if (item.sinFicha) {
      score = 50;
      motivo = "Completar ficha";             accion = "📝 Completar datos";
    } else if (item.sinFoto) {
      score = 40;
      motivo = "Sin foto";                    accion = "📷 Cargar fotos";
    } else if (item.sinLink) {
      score = 30;
      motivo = "Sin link";                    accion = "🔗 Agregar link web";
    } else if (item.sinMatch) {
      score = 20;
      motivo = "Sin match";                   accion = "🔍 Revisar precio/zona o difusión";
    }

    if (score > 0) scored.push({ ...item, _score: score, motivo, contexto, accion, urgencia });
  }

  return scored.sort((a, b) => b._score - a._score).slice(0, maxItems);
}
