// api/places.js — Proxy serverless para Google Places Autocomplete

const ALLOWED_ORIGIN = "https://alba-crm.vercel.app";

const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { input } = req.query;
  if (!input) return res.status(400).json({ error: "Se requiere input" });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key no configurada" });

  try {
    const url =
      "https://maps.googleapis.com/maps/api/place/autocomplete/json?" +
      "input=" + encodeURIComponent(input) +
      "&components=country:ar" +
      "&location=-38.002,-57.555&radius=20000" +
      "&language=es" +
      "&key=" + apiKey;

    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Places proxy error:", err);
    return res.status(500).json({ error: "Error al consultar Google" });
  }
}
