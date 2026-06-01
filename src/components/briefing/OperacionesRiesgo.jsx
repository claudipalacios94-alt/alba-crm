// ══════════════════════════════════════════════════════════════
// ALBA CRM — OperacionesRiesgo v3
// Lista individual con bullet · nombre · etapa badge · días.
// Muestra el grupo más crítico completo + resumen de otros.
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { B } from "../../data/constants.js";
import { useNavigate } from "react-router-dom";

const GRUPOS = [
  {
    key: "negociacion", label: "Negociación sin contacto",
    color: "#FF8C42",
    test: l => l.etapa === "Negociación" && (l.dias === null || l.dias >= 2),
    diasLabel: l => l.dias === null ? "Sin registro" : `${l.dias}d sin contacto`,
  },
  {
    key: "visita", label: "Seguimiento post-visita",
    color: "#E8A830",
    test: l => l.etapa === "Visita" && (l.dias === null || l.dias >= 2),
    diasLabel: l => l.dias === null ? "Sin registro" : `${l.dias}d sin seguimiento`,
  },
  {
    key: "calificado", label: "Calificado sin avance",
    color: "#4A8ABE",
    test: l => l.etapa === "Calificado" && l.dias !== null && l.dias >= 7,
    diasLabel: l => `${l.dias}d sin avance`,
  },
];

const MAX_VISIBLE = 4;

export default function OperacionesRiesgo({ leads }) {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(null);

  const grupos = useMemo(() =>
    GRUPOS.map(g => ({
      ...g,
      items: leads.filter(g.test).sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1)),
    })).filter(g => g.items.length > 0),
  [leads]);

  if (grupos.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "12px 0" }}>
        Sin operaciones en riesgo
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {grupos.map(({ key, label, color, items, diasLabel }) => {
        const isExpanded = expandido === key;
        const visible = isExpanded ? items : items.slice(0, MAX_VISIBLE);
        const resto   = items.length - MAX_VISIBLE;

        return (
          <div key={key}>
            {/* Título del grupo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                {label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color,
                background: color + "18", padding: "1px 7px", borderRadius: 10 }}>
                {items.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {visible.map(lead => (
                <div key={lead.id}
                  onClick={() => navigate("/crm")}
                  style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                    background: color + "06", border: `1px solid ${color}15`,
                    transition: "background 0.15s" }}>

                  {/* Bullet */}
                  <div style={{ width: 7, height: 7, borderRadius: "50%",
                    background: color, flexShrink: 0 }} />

                  {/* Nombre */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#E2E8F0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.nombre}
                  </span>

                  {/* Etapa badge */}
                  <span style={{ fontSize: 10, fontWeight: 700, color,
                    background: color + "18", padding: "2px 8px", borderRadius: 10,
                    flexShrink: 0 }}>
                    {lead.etapa}
                  </span>

                  {/* Días */}
                  <span style={{ fontSize: 11, color: "#64748B", flexShrink: 0, minWidth: 80, textAlign: "right" }}>
                    {diasLabel(lead)}
                  </span>
                </div>
              ))}
            </div>

            {/* Ver todas / Ver menos */}
            {!isExpanded && resto > 0 && (
              <button onClick={() => setExpandido(key)}
                style={{ marginTop: 6, fontSize: 11, color: color,
                  background: "transparent", border: "none",
                  cursor: "pointer", padding: "2px 0", opacity: 0.75 }}>
                Ver {resto} más →
              </button>
            )}
            {isExpanded && (
              <button onClick={() => setExpandido(null)}
                style={{ marginTop: 6, fontSize: 11, color: "#64748B",
                  background: "transparent", border: "none",
                  cursor: "pointer", padding: "2px 0" }}>
                Ver menos ↑
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
