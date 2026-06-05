// ══════════════════════════════════════════════════════════════
// ALBA CRM — api/sync-mdl.js
// Sincroniza propiedades publicadas de Mar del Inmueble (id=80)
// con la tabla properties de Supabase.
// Requiere Bearer token válido de Supabase Auth.
// ══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://alba-crm.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

const MDL_API  = "https://api.mardelinmueble.com/v3/inmuebles/?id_inmobiliaria=9";
const WEB_BASE = "https://albapropiedades.com/inmueble";
const IMG_BASE = "https://api.mardelinmueble.com/uploads/inmuebles/thumbnails";

// ── Helpers ────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return null;
  const clean = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return clean || null;
}

const TIPO_MAP = {
  "Departamento":    "Departamento",
  "Casa":            "Casa",
  "Terreno":         "Terreno",
  "Local Comercial": "Local",
  "Oficina":         "Local",
  "PH":              "PH",
  "Duplex":          "Dúplex",
  "Dúplex":          "Dúplex",
  "Quinta":          "Casa",
};

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function mapInmueble(p) {
  // Thumbnail
  const fotos = p.imagen_principal
    ? `${IMG_BASE}/${p.imagen_principal}`
    : null;

  // Dirección
  const numero = p.numero && Number(p.numero) !== 0 ? ` ${p.numero}` : "";
  const dir    = p.calle ? `${capitalize(p.calle)}${numero}` : "";

  // Zona — normalizar de MAYUS a Capitalize
  const zona = p.barrio_nombre
    ? p.barrio_nombre.split(" ").map(capitalize).join(" ")
    : "";

  // Características resumidas
  const caractsArr = [];
  if (p.ambientes)    caractsArr.push(`${p.ambientes} amb`);
  if (p.cocheras)     caractsArr.push(`${p.cocheras} coch`);
  if (p.banos)        caractsArr.push(`${p.banos} baño${p.banos !== 1 ? "s" : ""}`);
  if (p.amb_patio)    caractsArr.push("patio");
  if (p.amb_balcon)   caractsArr.push("balcón");
  if (p.amb_terraza)  caractsArr.push("terraza");
  if (p.ins_ascensor) caractsArr.push("ascensor");
  if (p.apto_credito) caractsArr.push("apto crédito");
  const caracts = caractsArr.join(", ");

  // m²
  const m2cub  = p.sup_cubierta    ? Number(p.sup_cubierta)    : null;
  const m2desc = p.sup_descubierta ? Number(p.sup_descubierta) : null;
  const m2tot  = m2cub && m2desc   ? Math.round(m2cub + m2desc) : (m2cub || null);

  return {
    external_id: String(p.id),
    web_url:     `${WEB_BASE}/${p.id}`,
    info:        (p.titulo || "").trim(),
    descripcion: stripHtml(p.descripcion),
    tipo:        TIPO_MAP[p.tipo_inmueble] || p.tipo_inmueble || "",
    zona,
    dir,
    precio:      p.precio ? Number(p.precio) : null,
    m2cub,
    m2tot,
    lat:         p.latitud  || null,
    lng:         p.longitud || null,
    caracts,
    fotos,
    activa:      true,
    estado:      "Buen Estado",
    sc:          "🟢 OK",
    dias:        0,
  };
}

// ── Handler ────────────────────────────────────────────────────

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ||
                  origin.startsWith("http://localhost");

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method Not Allowed" });

  // ── Auth: validar Bearer token ────────────────────────────
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "No autorizado" });

  // Admin client — solo para validar el token (service key no escribe properties)
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  // User client — anon key + Bearer token → RLS lo trata como usuario autenticado
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  // ── 1. Fetch Mar del Inmueble ──────────────────────────────
  let inmuebles;
  try {
    const r = await fetch(MDL_API, {
      headers: { "User-Agent": "AlbaCRM/1.0" },
      signal:  AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`MDL API status ${r.status}`);
    const body = await r.json();
    inmuebles = body.inmuebles;
    if (!Array.isArray(inmuebles)) throw new Error("Respuesta inesperada de MDL");
  } catch (err) {
    console.error("sync-mdl fetch error:", err.message);
    return res.status(502).json({ error: "No se pudo conectar con Mar del Inmueble", detail: err.message });
  }

  // ── Modo: dry_run o importación de selected_ids ───────────
  const dryRun     = req.body?.dry_run     === true;
  const selectedIds = Array.isArray(req.body?.selected_ids)
    ? req.body.selected_ids.map(String)
    : null;

  const publicadas = inmuebles.filter(p => p.publicado);

  // ── DRY-RUN: revisar todas contra DB, devolver lista completa ──
  if (dryRun) {
    // Obtener external_ids ya en la DB para marcar duplicados
    const { data: existentes } = await supabase
      .from("properties")
      .select("external_id")
      .not("external_id", "is", null);

    const enDb = new Set((existentes || []).map(r => String(r.external_id)));

    const items = publicadas.map(p => {
      const mapped = mapInmueble(p);
      return {
        external_id: mapped.external_id,
        op:          enDb.has(mapped.external_id) ? "update" : "insert",
        operacion:   (p.tipo_operacion || "").toLowerCase().includes("alquiler") ? "alquiler" : "venta",
        tipo:        mapped.tipo,
        zona:        mapped.zona,
        dir:         mapped.dir,
        precio:      mapped.precio,
        tiene_foto:  !!mapped.fotos,
        web_url:     mapped.web_url,
        titulo:      (p.titulo || "").trim().slice(0, 70),
      };
    });

    return res.status(200).json({
      ok:      true,
      dry_run: true,
      total:   publicadas.length,
      items,
      message: `${publicadas.length} propiedades disponibles. Seleccioná cuáles importar.`,
    });
  }

  // ── IMPORTACIÓN: solo los selected_ids elegidos ────────────
  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).json({ error: "selected_ids requerido para importar. Usá dry_run primero." });
  }

  const lote = publicadas.filter(p => selectedIds.includes(String(p.id)));

  if (lote.length === 0) {
    return res.status(400).json({ error: "Ninguna propiedad seleccionada coincide con publicadas." });
  }

  let created = 0, updated = 0, errors = 0;
  const errorLog = [];

  for (const p of lote) {
    const mapped = mapInmueble(p);
    let op = "find";

    try {
      const { data: existing, error: findErr } = await supabase
        .from("properties")
        .select("id")
        .eq("external_id", mapped.external_id)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        op = "update";
        const { error: updErr } = await supabase
          .from("properties")
          .update({
            web_url: mapped.web_url, fotos: mapped.fotos,
            descripcion: mapped.descripcion, info: mapped.info,
            tipo: mapped.tipo, zona: mapped.zona, dir: mapped.dir,
            precio: mapped.precio, m2cub: mapped.m2cub, m2tot: mapped.m2tot,
            lat: mapped.lat, lng: mapped.lng, caracts: mapped.caracts,
            activa: mapped.activa,
          })
          .eq("id", existing.id);
        if (updErr) throw updErr;
        updated++;
      } else {
        op = "insert";
        const { error: insErr } = await supabase.from("properties").insert(mapped);
        if (insErr) throw insErr;
        created++;
      }
    } catch (err) {
      console.error(`sync-mdl ${op} error for id ${p.id}:`, err);
      errors++;
      errorLog.push({
        external_id:   mapped.external_id,
        op,
        error_message: err.message || null,
        error_code:    err.code    || null,
        error_hint:    err.hint    || null,
      });
    }
  }

  return res.status(200).json({
    ok:      errors === 0,
    total:   lote.length,
    created,
    updated,
    errors,
    message: `Importadas: ${created} nuevas, ${updated} actualizadas, ${errors} errores.`,
    error_detail: errorLog.length > 0 ? errorLog : undefined,
  });
}
