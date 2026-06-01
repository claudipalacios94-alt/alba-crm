// ══════════════════════════════════════════════════════════════
// ALBA CRM — OperacionesRiesgo v2
// Agrupado por tipo de riesgo. Máx 3 grupos.
// Evita repetir el mismo motivo N veces.
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { useNavigate } from "react-router-dom";

const GRUPOS = [
  {
    key:    "negociacion",
    label:  "Negociación sin contacto",
    color:  "#FF8C42",
    test:   l => l.etapa === "Negociación" && (l.dias === null || l.dias >= 2),
  },
  {
    key:    "visita",
    label:  "Seguimiento post-visita",
    color:  "#E8A830",
    test:   l => l.etapa === "Visita" && (l.dias === null || l.dias >= 2),
  },
  {
    key:    "calificado",
    label:  "Calificado sin avance",
    color:  "#4A8ABE",
    test:   l => l.etapa === "Calificado" && l.dias !== null && l.dias >= 7,
  },
];

export default function OperacionesRiesgo({ leads }) {
  const navigate = useNavigate();

  const grupos = useMemo(() =>
    GRUPOS
      .map(g => ({
        ...g,
        items: leads
          .filter(g.test)
          .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1)),
      }))
      .filter(g => g.items.length > 0),
  [leads]);

  if (grupos.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
        Sin operaciones en riesgo
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {grupos.map(({ key, label, color, items }) => (
        <div
          key={key}
          onClick={() => navigate("/crm")}
          style={{
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: color + "08",
            border: `1px solid ${color}20`,
            borderLeft: `3px solid ${color}`,
          }}
        >
          {/* Título del grupo + conteo */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>
              {label}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: color + "20", color,
              padding: "1px 7px", borderRadius: 10,
            }}>
              {items.length}
            </span>
          </div>

          {/* Lista de nombres + días */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "4px 10px",
          }}>
            {items.map(lead => (
              <span key={lead.id} style={{ fontSize: 12, color: "#C8D8E8", whiteSpace: "nowrap" }}>
                {lead.nombre.split(" ")[0]}
                {lead.dias !== null
                  ? <span style={{ color: color, fontWeight: 700 }}> {lead.dias}d</span>
                  : <span style={{ color: B.muted }}> —</span>
                }
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
