// api/analyze.js — Proxy seguro para Claude (análisis de captaciones)
// Protecciones: CORS allowlist, Supabase auth, rate-limit, usage log

import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

const ALLOWED_ORIGINS = [
  "https://alba-crm.vercel.app",
  "http://localhost:5173",
];

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key (no anon), solo en servidor
);

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";

  // ── CORS ──────────────────────────────────────────────────
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;
  if (!allowedOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Rate limit (20 requests/hora por usuario) ─────────────
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0); // inicio de la hora actual

  const { data: rl } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("user_id", user.id)
    .eq("endpoint", "analyze")
    .gte("window_start", windowStart.toISOString())
    .single();

  if (rl && rl.count >= 20) {
    return new Response(JSON.stringify({ error: "Límite de requests alcanzado. Intentá en la próxima hora." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Upsert rate limit
  if (rl) {
    await supabase.from("rate_limits").update({ count: rl.count + 1 }).eq("id", rl.id);
  } else {
    await supabase.from("rate_limits").insert({
      user_id: user.id, endpoint: "analyze", count: 1, window_start: windowStart.toISOString(),
    });
  }

  // ── Request a Claude ──────────────────────────────────────
  const { texto } = await req.json();
  if (!texto) {
    return new Response("Missing texto", { status: 400, headers: corsHeaders });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: `Sos un asistente de inmobiliaria en Mar del Plata, Argentina. Analizás texto libre y extraés información de propiedades.
Respondé SOLO con JSON válido, sin texto adicional, sin backticks:
{
  "nombre_propietario": string o null,
  "telefono": string o null,
  "tipo": "Departamento"|"Casa"|"PH"|"Dúplex"|"Local"|"Terreno"|"Otro" o null,
  "zona": string o null,
  "direccion": string o null,
  "precio": number o null,
  "m2tot": number o null,
  "m2cub": number o null,
  "ambientes": number o null,
  "caracts": string o null,
  "operacion": "venta"|"alquiler" o null,
  "fuera_de_mdp": boolean,
  "ciudad_detectada": string o null,
  "campos_faltantes": array de strings — solo los importantes: tipo, zona, precio
}`,
      messages: [{ role: "user", content: texto }],
    }),
  });

  const data = await res.json();
  const content = data.content?.[0]?.text || "{}";
  const tokensIn  = data.usage?.input_tokens  || 0;
  const tokensOut = data.usage?.output_tokens || 0;

  // ── Usage log ─────────────────────────────────────────────
  await supabase.from("usage_log").insert({
    user_id: user.id, endpoint: "analyze",
    tokens_in: tokensIn, tokens_out: tokensOut,
    timestamp: now.toISOString(),
  });

  return new Response(content, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}