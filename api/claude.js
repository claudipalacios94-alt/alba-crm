// ══════════════════════════════════════════════════════════════
// ALBA CRM — Vercel API Function: proxy para Anthropic API
// ══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://alba-crm.vercel.app",
  "http://localhost:5173",
];

// Rate limiting simple en memoria (resetea con cada deploy)
const requestCounts = new Map();
const RATE_LIMIT = 50; // requests por IP por hora
const RATE_WINDOW = 60 * 60 * 1000; // 1 hora en ms

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.timestamp > RATE_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export default async function handler(req, res) {
  // 1. Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Verificar origen
  const origin = req.headers.origin || "";
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // 3. Rate limiting por IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Intentá en una hora." });
  }

  // 4. Proxy a Anthropic
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
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
