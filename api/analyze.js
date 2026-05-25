// ══════════════════════════════════════════════════════════════
// ALBA CRM — API / ANALYZE
// Vercel Edge Function — análisis IA de notas tipadas
// ══════════════════════════════════════════════════════════════

export const config = { runtime: "edge" };

const AI_MODEL = "claude-haiku-4-5-20251001";

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer "))
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const { notas = [], leadInfo = {} } = body;

  // Sin notas → no gastar tokens
  if (!notas.length)
    return new Response(
      JSON.stringify({ status: "frio", nextAction: "Calificar lead", reason: "Sin notas", source: "rules" }),
      { headers: { "Content-Type": "application/json" } }
    );

  // Formatear notas para el prompt — el tipo es el dato clave
  const notasTexto = notas
    .map((n, i) => {
      const fecha = n.createdAt
        ? new Date(n.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
        : "sin fecha";
      return `${i + 1}. [${(n.tipo || "seguimiento").toUpperCase()}] "${n.texto}" (${fecha})`;
    })
    .join("\n");

  const prompt = `Sos asistente de una inmobiliaria en Mar del Plata, Argentina.
Analizá las notas de este comprador y decidí qué hacer hoy.

Lead:
- Zona buscada: ${leadInfo.zona || "?"}
- Presupuesto: USD ${leadInfo.presup ? Number(leadInfo.presup).toLocaleString() : "?"}
- Tipo: ${leadInfo.tipo || "?"}
- Etapa: ${leadInfo.etapa || "?"}
- Días sin contacto: ${leadInfo.dias ?? 0}

Notas (más reciente primero):
${notasTexto}

Tipos de nota posibles:
- INTERES = quiere comprar, le gustó algo
- OBJECION = freno real (precio, pareja, timing, confianza)
- URGENCIA = necesita resolver rápido
- CIERRE = lista para hacer oferta
- SEGUIMIENTO = contacto sin definición clara

Respondé SOLO con este JSON (sin backticks, sin explicación):
{
  "status": "caliente" | "templado" | "frio",
  "nextAction": "acción concreta en máx 6 palabras",
  "reason": "motivo en una línea, sin paja"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";

    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
    catch {
      return new Response(
        JSON.stringify({ status: "frio", nextAction: "Revisar notas", reason: "Error parse IA", source: "rules" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ...parsed, source: "ai" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "frio", nextAction: "Error IA", reason: err.message, source: "error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}