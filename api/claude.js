// ══════════════════════════════════════════════════════════════
// ALBA CRM — Vercel API Function: proxy para Anthropic API
// ══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://alba-crm.vercel.app",
  "http://localhost:5173",
];

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // ── CORS ──────────────────────────────────────────────────
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // ── Auth ──────────────────────────────────────────────────
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "No autorizado" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  // ── Rate limit (50 requests/hora por usuario) ─────────────
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0);

  const { data: rl } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("user_id", user.id)
    .eq("endpoint", "claude")
    .gte("window_start", windowStart.toISOString())
    .single();

  if (rl && rl.count >= 50) {
    return res.status(429).json({ error: "Too many requests. Intentá en una hora." });
  }

  if (rl) {
    await supabase.from("rate_limits").update({ count: rl.count + 1 }).eq("id", rl.id);
  } else {
    await supabase.from("rate_limits").insert({
      user_id: user.id, endpoint: "claude", count: 1, window_start: windowStart.toISOString(),
    });
  }

  // ── Proxy a Anthropic ─────────────────────────────────────
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // ── Usage log ───────────────────────────────────────────
    await supabase.from("usage_log").insert({
      user_id: user.id, endpoint: "claude",
      tokens_in:  data.usage?.input_tokens  || 0,
      tokens_out: data.usage?.output_tokens || 0,
      timestamp: now.toISOString(),
    });

    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}