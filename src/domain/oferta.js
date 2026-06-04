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

// ── buildOfertaItems ───────────────────────────────────────────
export function buildOfertaItems(properties = [], captaciones = [], leads = []) {
  const items = [];

  // — Properties ------------------------------------------------
  for (const p of properties) {
    const matches = safeMatchPropLeads(p, leads);
    items.push({
      id:         `prop-${p.id}`,
      source:     "property",
      origen:     "Propia",
      tipo:       p.tipo      || "",
      zona:       p.zona      || "",
      direccion:  p.dir       || "",
      precio:     p.precio    ? Number(p.precio)  : null,
      ambientes:  null,
      m2tot:      p.m2tot     ? Number(p.m2tot)   : null,
      m2cub:      p.m2cub     ? Number(p.m2cub)   : null,
      caracts:    parseCaracts(p.caracts),
      estado:     p.activa === false ? "Inactiva" : "Activa",
      lat:        p.lat,
      lng:        p.lng,
      created_at: p.created_at,
      matches,
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
  const url = item.raw?.url;
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
export function getOfertaActionItems(items = [], maxItems = 3) {
  const scored = [];
  const usados = new Set();

  for (const item of items) {
    if (item.estado === "Inactiva" || item.estado === "Convertida") continue;

    let score = 0;
    let motivo = "";
    let accion = "💬 Mandar por WA";
    let urgencia = "media";

    // ── 1. Matches (primera prioridad absoluta) ──────────────
    if (item.matches >= 5) {
      score    = 150 + item.matches;
      motivo   = `${item.matches} matches — mandá hoy por WA`;
      urgencia = "alta";
    } else if (item.matches >= 3) {
      score    = 120 + item.matches;
      motivo   = `${item.matches} matches activos — coordinar visita`;
      accion   = "🎯 Ver matches";
      urgencia = "alta";
    } else if (item.matches >= 2) {
      score    = 90 + item.matches;
      motivo   = `${item.matches} matches — ver interesados`;
      accion   = "🎯 Ver matches";
    }

    // ── 2. Vence pronto (puede sumarse a matches si hay ambos) ─
    if (item.estado === "Vence pronto") {
      if (score > 0) {
        score += 15; // bonus urgencia + oportunidad
        motivo += " · vence pronto";
      } else {
        score    = 80;
        motivo   = "Vence pronto — llamar al propietario hoy";
        accion   = "📞 Llamar ahora";
        urgencia = "alta";
      }
    }

    // ── 3. Colega / honorarios con match ──────────────────────
    if (!score && item.matches === 1 && (item.origen === "Colega" || item.origen === "Honorarios")) {
      score    = 55;
      motivo   = `${item.origen} con 1 match — trabajar antes que otra inmobiliaria`;
      accion   = "⚡ Trabajar";
    }

    // ── 4. Captación con contacto sin convertir ───────────────
    if (!score && item.source === "captacion" && !item.raw?.convertida && item.contacto) {
      score    = 35;
      motivo   = "Captación con contacto — convertir antes de que venza";
      accion   = "⚡ Convertir";
    }

    // ── 5. 1 match solo ───────────────────────────────────────
    if (!score && item.matches === 1) {
      score    = 30;
      motivo   = "1 match — verificar interés";
      accion   = "🎯 Ver match";
    }

    if (score > 0) {
      scored.push({ ...item, _score: score, motivo, accion, urgencia });
      usados.add(item.id);
    }
  }

  const top = scored.sort((a, b) => b._score - a._score).slice(0, maxItems);

  // ── Fallback: completar con captaciones recientes si faltan ──
  if (top.length < maxItems) {
    const fallbacks = items
      .filter(i =>
        !usados.has(i.id) &&
        i.source === "captacion" &&
        !i.raw?.convertida &&
        i.estado !== "Inactiva"
      )
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, maxItems - top.length)
      .map(i => ({
        ...i,
        _score: 5,
        motivo: "Captación reciente — revisar y convertir",
        accion: "⚡ Convertir",
        urgencia: "media",
      }));
    return [...top, ...fallbacks];
  }

  return top;
}
