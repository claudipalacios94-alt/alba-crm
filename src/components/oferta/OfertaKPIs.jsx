import React from "react";
import { B } from "../../data/constants.js";

export default function OfertaKPIs({ mobile, albaProp = 0, honorarios = 0, colegas = 0, sinMatch = 0 }) {
  const KPI_DATA = [
    {
      label: "Propiedades Alba",
      value: albaProp,
      icon:  "🏠",
      color: B.accentL,
      sub:   "disponibles",
    },
    {
      label: "Honorarios",
      value: honorarios,
      icon:  "💼",
      color: "#FBBF24",
      sub:   "activas",
    },
    {
      label: "Colegas",
      value: colegas,
      icon:  "🤝",
      color: "#A78BFA",
      sub:   "disponibles",
    },
    {
      label: "Sin match",
      value: sinMatch,
      icon:  "⚠️",
      color: "#E07B2A",
      sub:   "revisar hoy",
      alert: sinMatch > 3,
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: mobile ? 6 : 8,
      marginBottom: 10,
    }}>
      {KPI_DATA.map(kpi => (
        <div key={kpi.label} style={{
          background: B.card,
          border: `1px solid ${kpi.alert ? kpi.color + "55" : B.border}`,
          borderRadius: 10,
          padding: mobile ? "10px 10px" : "11px 13px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: mobile ? 15 : 18 }}>{kpi.icon}</span>
            {kpi.alert && (
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: kpi.color, flexShrink: 0 }} />
            )}
          </div>
          <div style={{
            fontSize: mobile ? 20 : 26, fontWeight: 800, color: kpi.color,
            lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
          }}>{kpi.value}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: B.text, lineHeight: 1.2 }}>
            {kpi.label}
          </div>
          <div style={{ fontSize: 9, color: B.dim }}>{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}
