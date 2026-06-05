// api/og.js — Proxy OG image para captaciones
// Extrae og:image de portales inmobiliarios para mostrar
// thumbnail en el módulo Oferta sin exponer CORS al cliente.

const ALLOWED_ORIGIN = "https://alba-crm.vercel.app";

// Cache en memoria (se resetea con cada deploy — suficiente para prod)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Rate limit: 60 req/min por IP
const rateLimitMap = new Map();
const RATE_LIMIT  = 60;
const RATE_WINDOW = 60 * 1000;

// Solo portales conocidos — evita uso del proxy como fetch genérico
const ALLOWED_DOMAINS = [
  "zonaprop.com.ar",
  "argenprop.com",
  "mercadolibre.com.ar",
  "inmuebles24.com",
  "properati.com.ar",
  "navent.com",
  "remax.com.ar",
  "century21.com.ar",
];

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

function isAllowedDomain(urlStr) {
  try {
    const host = new URL(urlStr).hostname.replace(/^www\./, "");
    return ALLOWED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function extractOgImage(html) {
  // og:image
  let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1];
  // og:image con orden invertido de atributos
  m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (m) return m[1];
  return null;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  const isLocal = origin.startsWith("http://localhost");
  if (origin && origin !== ALLOWED_ORIGIN && !isLocal) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", isLocal ? origin : ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Se requiere url" });

  if (!isAllowedDomain(url)) {
    return res.status(400).json({ error: "Dominio no permitido" });
  }

  // Devolver desde cache si es reciente
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ image: cached.image });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlbaCRM/1.0)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      cache.set(url, { image: null, ts: Date.now() });
      return res.status(200).json({ image: null });
    }

    // Leer solo los primeros 50KB (og:image siempre está en el <head>)
    const reader  = response.body.getReader();
    const chunks  = [];
    let   total   = 0;
    const MAX     = 50 * 1024;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total >= MAX) { reader.cancel(); break; }
    }

    const html  = Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf-8");
    const image = extractOgImage(html);

    cache.set(url, { image, ts: Date.now() });
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({ image });

  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(200).json({ image: null }); // timeout → no foto, sin error visible
    }
    console.error("OG proxy error:", err.message);
    return res.status(200).json({ image: null }); // fallo silencioso — la card muestra emoji
  }
}
