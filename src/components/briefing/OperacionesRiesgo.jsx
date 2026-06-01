// ══════════════════════════════════════════════════════════════
// ALBA CRM — OperacionesRiesgo
// Máximo 3 operaciones que pueden perderse si no se actúa.
// Solo leads en etapas avanzadas con señales de riesgo real.
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { useNavigate } from "react-router-dom";

function motivoYColor(lead) {
  const d = lead.dias;
  if (lead.etapa === "Negociación") {
    if (d === null)  return { motivo: "Negociación sin registro de contacto", color: "#FF8C42" };
    if (d >= 5)      return { motivo: `${d}d sin contacto — cierre en riesgo`, color: "#FF4D4D" };
    if (d >= 2)      return { motivo: `${d}d sin contacto — negociación pausada`, color: "#FF8C42" };
  }
  if (lead.etapa === "Visita") {
    if (d === null)  return { motivo: "Visita sin seguimiento registrado", color: "#E8A830" };
    if (d >= 5)      return { motivo: `${d}d sin seguimiento post-visita`, color: "#FF8C42" };
    if (d >= 2)      return { motivo: `${d}d — visita sin acción`, color: "#E8A830" };
  }
  if (lead.etapa === "Calificado" && d !== null && d >= 7) {
    return { motivo: `${d}d inactivo — calificado sin avance`, color: "#4A8ABE" };
  }
  return null;
}

function severidad(lead) {
  const d = lead.dias ?? 0;
  if (lead.etapa === "Negociación") return 1000 + d;
  if (lead.etapa === "Visita")      return 500  + d;
  if (lead.etapa === "Calificado")  return 100  + d;
  return d;
}

export default function OperacionesRiesgo({ leads }) {
  const navigate = useNavigate();

  const operaciones = useMemo(() => {
    return leads
      .map(l => ({ lead: l, ...motivoYColor(l) }))
      .filter(x => x.motivo)
      .sort((a, b) => severidad(b.lead) - severidad(a.lead))
      .slice(0, 3);
  }, [leads]);

  if (operaciones.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
        Sin operaciones en riesgo
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {operaciones.map(({ lead, motivo, color }) => (
        <div
          key={lead.id}
          onClick={() => navigate("/crm")}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: color + "08",
            border: `1px solid ${color}25`,
            borderLeft: `3px solid ${color}`,
          }}
        >
          {/* Nombre + etapa */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E8F0FA",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.nombre}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: color,
                background: color + "18", padding: "1px 7px", borderRadius: 10,
                flexShrink: 0 }}>
                {lead.etapa}
              </span>
            </div>
            <div style={{ fontSize: 11, color: color, opacity: 0.85 }}>
              {motivo}
            </div>
          </div>
          <span style={{ fontSize: 11, color: color, flexShrink: 0 }}>→</span>
        </div>
      ))}
    </div>
  );
}
