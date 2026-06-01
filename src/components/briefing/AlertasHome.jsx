// ══════════════════════════════════════════════════════════════
// ALBA CRM — AlertasHome
// Alertas operativas del Home. Solo 2 tipos:
//   1. Negociaciones paradas +48hs
//   2. Leads sin calificar +6hs
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { useNavigate } from "react-router-dom";

export default function AlertasHome({ leads }) {
  const navigate = useNavigate();

  const alertas = useMemo(() => {
    const ahora = Date.now();
    const lista = [];

    // 1. Negociaciones paradas +48hs
    const negParadas = leads.filter(
      l => l.etapa === "Negociación" && l.dias !== null && l.dias >= 2
    );
    if (negParadas.length > 0) {
      lista.push({
        texto: negParadas.length === 1
          ? `1 negociación sin contacto +48hs`
          : `${negParadas.length} negociaciones sin contacto +48hs`,
        color: "#FF8C42",
        onClick: () => navigate("/crm"),
      });
    }

    // 2. Leads sin calificar +6hs (sin zona, sin presupuesto o sin tipo)
    const seisHoras = 6 * 60 * 60 * 1000;
    const sinCalificar = leads.filter(l => {
      const creado = l.created_at ? new Date(l.created_at).getTime() : null;
      const esViejo = creado && (ahora - creado) > seisHoras;
      const incompleto = !l.zona || !l.presup || !l.tipo;
      return esViejo && incompleto;
    });
    if (sinCalificar.length > 0) {
      lista.push({
        texto: sinCalificar.length === 1
          ? `1 lead sin calificar +6hs`
          : `${sinCalificar.length} leads sin calificar +6hs`,
        color: "#CC2233",
        onClick: () => navigate("/crm"),
      });
    }

    return lista;
  }, [leads, navigate]);

  if (alertas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
        Sin alertas
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alertas.map((a, i) => (
        <div
          key={i}
          onClick={a.onClick}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 8, cursor: "pointer",
            background: a.color + "0A",
            borderLeft: `3px solid ${a.color}80`,
            border: `1px solid ${a.color}20`,
            borderLeftWidth: 3,
          }}
        >
          <span style={{ flex: 1, fontSize: 12, color: "#8AAECC" }}>{a.texto}</span>
          <span style={{ fontSize: 11, color: a.color }}>→</span>
        </div>
      ))}
    </div>
  );
}
