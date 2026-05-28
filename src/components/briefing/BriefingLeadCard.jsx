// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingLeadCard
// Card operativa en HOME: nombre, motivo, calificación resumida, WA
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B, AG } from "../../data/constants.js";
import { getQualificationScore } from "../../domain/lead.js";

const SENALES_KEYS = ["q_visitas_previas", "q_freno", "q_tiene_para_vender", "q_fecha_limite"];

export default function BriefingLeadCard({ lead }) {
  const ag      = AG[lead.ag];
  const waLink  = lead.tel ? "https://wa.me/" + lead.tel.replace(/\D/g, "") : null;

  const urgColor = lead.etapa === "Negociación" ? B.ok
    : lead.dias <= 2 ? B.hot
    : lead.dias <= 5 ? B.warm
    : B.accentL;

  const razon = lead.etapa === "Negociación" ? "En negociación"
    : lead.dias === 0 ? "Nuevo hoy"
    : lead.dias <= 2 ? lead.dias + "d — Caliente"
    : lead.dias <= 5 ? lead.dias + "d — Tibio"
    : lead.dias + "d sin contacto";

  const respondidas = SENALES_KEYS.filter(k => lead[k]).length;
  const pct         = Math.round((respondidas / SENALES_KEYS.length) * 100);
  const qScore      = getQualificationScore(lead);
  const barColor    = respondidas <= 1 ? "#CC2233" : respondidas <= 2 ? "#E8A830" : respondidas <= 3 ? "#4A8ABE" : "#2E9E6A";

  return (
    <div style={{ background: B.card, border: "1px solid " + urgColor + "40",
      borderLeft: "3px solid " + urgColor, borderRadius: 10, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12 }}>

      {/* Info principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FA" }}>{lead.nombre}</span>
          {ag && (
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4,
              background: ag.bg || "rgba(42,91,173,0.25)", color: ag.c, fontWeight: 700,
              border: "1px solid " + ag.c + "40" }}>{ag.n}</span>
          )}
          <span style={{ fontSize: 11, color: urgColor, fontWeight: 700, marginLeft: "auto" }}>{razon}</span>
        </div>

        <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 6 }}>
          {lead.zona} · {lead.tipo}
          {lead.presup && <span style={{ color: B.accentL, fontFamily: "Georgia,serif", fontWeight: 700 }}> · USD {Number(lead.presup).toLocaleString()}</span>}
        </div>

        {/* Barra de calificación resumida */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: B.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: barColor,
              borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 10, color: barColor, fontWeight: 700, flexShrink: 0 }}>
            {respondidas}/4
          </span>
          {qScore > 0 && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3,
              background: "#2E9E6A18", color: "#2E9E6A", border: "1px solid #2E9E6A30", fontWeight: 700 }}>
              +{qScore}pts
            </span>
          )}
        </div>
      </div>

      {/* WA */}
      {waLink && (
        <a href={waLink} target="_blank" rel="noreferrer"
          style={{ padding: "7px 14px", borderRadius: 7, flexShrink: 0,
            background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
            color: "#25D366", fontSize: 12, textDecoration: "none", fontWeight: 700 }}>
          WA
        </a>
      )}
    </div>
  );
}
