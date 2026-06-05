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

const MDL_API  = "https://api.mardelinmueble.com/v3/inmuebles/?id_inmobiliaria=80";
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

  // ── Auth: Bearer token válido de Supabase ──────────────────
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "No autorizado" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

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

  // ── 2. Mapear y hacer upsert seguro ───────────────────────
  let created = 0, updated = 0, errors = 0;
  const errorLog = [];

  for (const p of inmuebles) {
    if (!p.publicado) continue;

    const mapped = mapInmueble(p);
    let op = "find";

    try {
      // Buscar si ya existe por external_id
      const { data: existing, error: findErr } = await supabase
        .from("properties")
        .select("id")
        .eq("external_id", mapped.external_id)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        op = "update";
        const updatePayload = {
          web_url:     mapped.web_url,
          fotos:       mapped.fotos,
          descripcion: mapped.descripcion,
          info:        mapped.info,
          tipo:        mapped.tipo,
          zona:        mapped.zona,
          dir:         mapped.dir,
          precio:      mapped.precio,
          m2cub:       mapped.m2cub,
          m2tot:       mapped.m2tot,
          lat:         mapped.lat,
          lng:         mapped.lng,
          caracts:     mapped.caracts,
          activa:      mapped.activa,
        };
        const { error: updErr } = await supabase
          .from("properties")
          .update(updatePayload)
          .eq("id", existing.id);
        if (updErr) throw updErr;
        updated++;
      } else {
        op = "insert";
        const { error: insErr } = await supabase
          .from("properties")
          .insert(mapped);
        if (insErr) throw insErr;
        created++;
      }
    } catch (err) {
      console.error(`sync-mdl ${op} error for id ${p.id}:`, err);
      errors++;
      errorLog.push({
        external_id: mapped.external_id,
        titulo:      (p.titulo || "").trim().slice(0, 60),
        op,
        error_message: err.message  || null,
        error_code:    err.code     || null,
        error_details: err.details  || null,
        error_hint:    err.hint     || null,
        payload_keys:  Object.keys(mapped),
        payload_sample: {
          external_id: mapped.external_id,
          tipo:        mapped.tipo,
          precio:      mapped.precio,
          m2cub:       mapped.m2cub,
          m2tot:       mapped.m2tot,
          lat:         mapped.lat,
          lng:         mapped.lng,
          activa:      mapped.activa,
          sc:          mapped.sc,
          dias:        mapped.dias,
        },
      });
    }
  }

  return res.status(200).json({
    ok:      errors === 0,
    total:   inmuebles.length,
    created,
    updated,
    errors,
    message: `Sync completado: ${created} nuevas, ${updated} actualizadas, ${errors} errores.`,
    error_detail: errorLog.length > 0 ? errorLog : undefined,
  });
}
