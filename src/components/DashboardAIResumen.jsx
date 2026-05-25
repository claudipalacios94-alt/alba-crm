import React, { useState, useCallback } from "react";
import { supabase } from "../hooks/useSupabase.js";
import { B } from "../data/constants.js";

export default function DashboardAIResumen({ urgentes, sinMatch, zonas }) {
  const [resumen, setResumen] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const generar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión activa");
const prompt = `Sos el director comercial de Alba Inversiones en Mar del Plata.
Tu objetivo es maximizar cierres hoy.
Analizá los datos y decime:
1. Qué acciones concretas tengo que hacer hoy (prioridad alta)
2. Qué oportunidades claras no puedo perder
3. Dónde debería enfocar captación o seguimiento
Reglas:
- Máximo 4 líneas
- Directo, sin relleno
- Tono firme, profesional, accionable
- Nada de frases genéricas
Datos de hoy:
- Leads urgentes (sin contacto +3 días): ${urgentes.length > 0 ? urgentes.slice(0,5).map(l => `${l.nombre} (${l.zona}, ${l.dias}d)`).join(", ") : "ninguno"}
- Leads sin propiedades compatibles: ${sinMatch} leads
- Zonas con más demanda que oferta: ${zonas.length > 0 ? zonas.slice(0,5).join(", ") : "ninguna"}
Respondé como si estuvieras guiando a un agente junior.`;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const texto = data?.content?.[0]?.text || "Sin respuesta";
      setResumen(texto);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [urgentes, sinMatch, zonas]);

  return (
    <div style={{
      marginTop: 20,
      background: B.card,
      border: `1px solid ${B.border}`,
      borderRadius: 12,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: B.muted, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
          🤖 Resumen IA del día
        </div>
        <button onClick={generar} disabled={loading}
          style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: loading ? "default" : "pointer",
            background: loading ? B.border : B.accentL, color: "#fff", border: "none", fontWeight: 600,
          }}>
          {loading ? "Generando..." : resumen ? "Actualizar" : "Generar"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: B.hot }}>{error}</div>
      )}

      {!resumen && !loading && !error && (
        <div style={{ fontSize: 12, color: B.dim }}>
          Presioná "Generar" para ver las prioridades del día según tus datos actuales.
        </div>
      )}

      {resumen && (
        <div style={{ fontSize: 13, color: B.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {resumen}
        </div>
      )}
    </div>
  );
}