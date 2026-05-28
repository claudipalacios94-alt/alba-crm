// ══════════════════════════════════════════════════════════════
// ALBA CRM — OportunidadesCaptacion
// Bloque visual del HOME. Solo render — lógica en domain.
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { getTopOpportunities } from "../../domain/opportunity.js";

const CONFIDENCE_COLOR = {
  alta:  "#2E9E6A",
  media: "#E8A830",
  baja:  "#7A9EC0",
};

export default function OportunidadesCaptacion({ leads, properties, captaciones }) {
  const oportunidades = useMemo(
    () => getTopOpportunities(leads, properties, captaciones),
    [leads, properties, captaciones]
  );
  if (oportunidades.length === 0) return null;
  return (
    <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "#4A6A90", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>
        Oportunidades de Captación
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {oportunidades.map(op => (
          <div key={op.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderLeft: "3px solid #E8A830", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E8F0FA" }}>🏠 {op.titulo}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: CONFIDENCE_COLOR[op.confidence], textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {op.confidence}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: op.score >= 70 ? "#E8A83022" : "#4A6A9022", color: op.score >= 70 ? "#E8A830" : "#7A9EC0" }}>
                  {op.score} pts
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#C8D8E8", marginBottom: 8, lineHeight: 1.5 }}>{op.motivo}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#4A6A90", fontStyle: "italic" }}>⚠ {op.riesgo}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#E8A830", whiteSpace: "nowrap" }}>→ {op.accion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
