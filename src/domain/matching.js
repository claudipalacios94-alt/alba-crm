// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / MATCHING
// Lógica de matching lead ↔ propiedad. Sin React, sin Supabase.
// matchLeadProps migrada desde domain/lead.js (mantener allá
// el re-export para no romper imports existentes).
// ══════════════════════════════════════════════════════════════

/**
 * Normaliza texto de zona para comparación:
 * quita artículos, tildes y convierte a minúsculas.
 * Ej: "La Perla" → "perla", "El Grosellar" → "grosellar"
 */
export function normZona(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^(la|el|los|las)\s+/i, "")
    .trim();
}

/**
 * Parsea una zona/tipo que puede venir como "La Perla, Centro / Depto"
 * y devuelve array de variantes normalizadas.
 * @param {string} valor
 * @returns {string[]}
 */
export function parsearVariantes(valor) {
  return (valor || "")
    .split(/[,\/]|\s+y\s+/)
    .map(v => normZona(v))
    .filter(Boolean);
}

/**
 * Matching lead → propiedades (para mostrar opciones a un lead).
 * Score máximo: 95 pts.
 *   zona match:         40
 *   precio ≤ presup:    30 | ≤ 5%: 18 | ≤ 10%: 8 | >10%: null
 *   tipo match:         20
 *   cochera/balcón:     +5 c/u
 *
 * @param {object} lead
 * @param {object[]} properties
 * @returns {object[]} propiedades con _score, máx 5, ordenadas desc
 */
export function matchLeadProps(lead, properties) {
  if (!lead || !properties?.length) return [];

  const zonasLead = parsearVariantes(lead.zona);
  const tiposLead = parsearVariantes(
    (lead.tipo || "").replace("departamento", "depto")
  );
  const presup = Number(lead.presup) || 0;
  const op     = (lead.op || "").toLowerCase();

  if (op === "alquiler") return [];

  return properties
    .filter(p => p.activa !== false)
    .map(p => {
      const pZona    = normZona(p.zona);
      const pTipo    = normZona((p.tipo || "").toLowerCase().replace("departamento", "depto"));
      const pPrecio  = Number(p.precio) || 0;
      const pCaracts = (p.caracts || "").toLowerCase();
      let score = 0;

      // — Zona (obligatorio)
      const zonaOk = zonasLead.some(z => pZona.includes(z) || z.includes(pZona));
      if (!zonaOk) return null;
      score += 40;

      // — Precio
      if (presup > 0 && pPrecio > 0) {
        if      (pPrecio <= presup)             score += 30;
        else if (pPrecio <= presup * 1.05)      score += 18;
        else if (pPrecio <= presup * 1.20)      score += 8;
        else return null;
      }

      // — Tipo
      if (tiposLead.length > 0) {
        const tipoOk = tiposLead.some(t => pTipo.includes(t) || t.includes(pTipo));
        if (!tipoOk) return null;
        score += 20;
      }

      // — Bonus amenities
      if (lead.cochera === "si" && pCaracts.includes("cochera")) score += 5;
      if (lead.balcon  === "si" && pCaracts.includes("balc"))    score += 5;
      if (lead.patio   === "si" && pCaracts.includes("patio"))   score += 5;
      if (lead.m2min && Number(p.m2tot) >= Number(lead.m2min))  score += 5;

      return { ...p, _score: score };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score)
    ;
}

/**
 * Matching inverso: propiedad → leads interesados.
 * Usado en PropCard para mostrar qué leads aplican a una prop.
 *
 * @param {object} prop
 * @param {object[]} leads
 * @returns {object[]} leads activos que matchean, sin límite
 */
export function matchPropLeads(prop, leads) {
  if (!leads?.length) return [];

  const pZona   = normZona(prop.zona);
  const pTipo   = normZona((prop.tipo || "").toLowerCase().replace("departamento", "depto"));
  const pPrecio = Number(prop.precio) || 0;

  return leads
    .filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido")
    .filter(lead => {
      const zonasLead = parsearVariantes(lead.zona);
      const tiposLead = parsearVariantes(
        (lead.tipo || "").replace("departamento", "depto")
      );
      const presup = Number(lead.presup) || 0;

      // — Zona (obligatorio)
      const zonaOk = zonasLead.some(z => pZona.includes(z) || z.includes(pZona));
      if (!zonaOk) return false;

      // — Precio (tolerancia 20% sobre presupuesto → misma lógica anterior)
      if (presup > 0 && pPrecio > 0 && pPrecio > presup * 1.20) return false;

      // — Tipo (si el lead especificó tipo, debe matchear)
      if (tiposLead.length > 0) {
        const tipoOk = tiposLead.some(t => pTipo.includes(t) || t.includes(pTipo));
        if (!tipoOk) return false;
      }

      return true;
    });
}

/**
 * ¿Una propiedad entra en el presupuesto de un lead?
 * Útil para filtros rápidos sin score completo.
 * @param {number} precioProp
 * @param {number} presupuesto
 * @param {number} [tolerancia=0.05] — porcentaje sobre presupuesto
 * @returns {boolean}
 */
export function enPresupuesto(precioProp, presupuesto, tolerancia = 0.05) {
  const precio = Number(precioProp);
  const presup = Number(presupuesto);
  if (!precio || !presup) return true; // sin datos no se descarta
  return precio <= presup * (1 + tolerancia);
}

/**
 * Clasifica el score de un match en nivel cualitativo.
 * @param {number} score
 * @returns {'alto'|'medio'|'bajo'}
 */
export function nivelMatch(score) {
  if (score >= 75) return "alto";
  if (score >= 50) return "medio";
  return "bajo";
}