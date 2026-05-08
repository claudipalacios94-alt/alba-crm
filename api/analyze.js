export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { texto } = await req.json();
  if (!texto) return new Response("Missing texto", { status: 400 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
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

  return new Response(content, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
