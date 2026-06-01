// ══════════════════════════════════════════════════════════════
// ALBA CRM — AlertasHome v2
// Título + descripción por alerta + flecha. Igual que referencia.
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
    const neg = leads.filter(l => l.etapa === "Negociación" && l.dias !== null && l.dias >= 2);
    if (neg.length > 0) {
      lista.push({
        titulo: "Negociaciones detenidas",
        desc:   neg.length === 1
          ? "1 negociación sin contacto hace más de 2 días"
          : `${neg.length} negociaciones sin contacto hace más de 2 días`,
        color:  "#FF8C42",
        onClick: () => navigate("/crm"),
      });
    }

    // 2. Leads sin calificar +6hs
    const seisH = 6 * 60 * 60 * 1000;
    const sinCal = leads.filter(l => {
      const creado = l.created_at ? new Date(l.created_at).getTime() : null;
      return creado && (ahora - creado) > seisH && (!l.zona || !l.presup || !l.tipo);
    });
    if (sinCal.length > 0) {
      lista.push({
        titulo: "Leads sin calificar",
        desc:   sinCal.length === 1
          ? "1 lead nuevo sin calificar"
          : `${sinCal.length} leads nuevos sin calificar`,
        color:  "#EF4444",
        onClick: () => navigate("/crm"),
      });
    }

    return lista;
  }, [leads, navigate]);

  if (alertas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "12px 0" }}>
        Sin alertas activas
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {alertas.map((a, i) => (
        <div key={i} onClick={a.onClick}
          style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: i === 0 ? "8px 8px 0 0" : "0 0 8px 8px",
            cursor: "pointer", background: "#0C1527",
            border: "1px solid #1E293B",
            borderTop: i > 0 ? "none" : "1px solid #1E293B",
            transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = a.color + "08"}
          onMouseLeave={e => e.currentTarget.style.background = "#0C1527"}>

          {/* Icono */}
          <div style={{ flexShrink: 0, fontSize: 16, color: a.color, lineHeight: 1 }}>⚠</div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 2 }}>
              {a.titulo}
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>
              {a.desc}
            </div>
          </div>

          {/* Flecha */}
          <span style={{ fontSize: 14, color: "#374151", flexShrink: 0 }}>›</span>
        </div>
      ))}
    </div>
  );
}
