import React from "react";
import { B } from "../../data/constants.js";

export default function OfertaKPIs({ mobile, kpis = {} }) {
  const KPI_DATA = [
    {
      label: "Oferta activa",
      value: kpis.activas      ?? "—",
      icon: "📦", color: B.accentL,
      sub: "props + captaciones",
    },
    {
      label: "Con match",
      value: kpis.conMatch     ?? "—",
      icon: "🎯", color: B.ok,
      sub: "listas para mandar",
    },
    {
      label: "Sin match",
      value: kpis.sinMatch     ?? "—",
      icon: "⚠️", color: "#E07B2A",
      sub: "revisar hoy",
      alert: (kpis.sinMatch || 0) > 3,
    },
    {
      label: "Captaciones",
      value: kpis.captaciones  ?? "—",
      icon: "⚡", color: "#A78BFA",
      sub: "en inventario",
    },
    {
      label: "Vencen pronto",
      value: kpis.vencenProto  ?? "—",
      icon: "⏰", color: B.hot,
      sub: "en 3 días",
      alert: (kpis.vencenProto || 0) > 0,
    },
    {
      label: "Zonas calientes",
      value: kpis.zonasCalientes ?? "—",
      icon: "🔥", color: "#FB923C",
      sub: "demanda sin oferta",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: mobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
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
            fontSize: mobile ? 20 : 26,
            fontWeight: 800,
            color: kpi.color,
            lineHeight: 1,
            fontFamily: "'DM Sans', sans-serif",
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
