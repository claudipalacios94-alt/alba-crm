import React from "react";

function MiniSparkline({ data, color }) {
  const max = Math.max(...data, 1);
  const w = 54, h = 22;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible", opacity: 0.7 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CRMKpiCard({ icon, value, label, sub, color = "#2A5BAD", sparkline, alert }) {
  return (
    <div style={{
      background: "#f2f6fa",
      border: `1px solid ${alert ? "rgba(220,38,38,0.3)" : "#c7d3df"}`,
      borderRadius: 16,
      padding: "16px 18px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: 1,
      minWidth: 120,
      boxShadow: alert
        ? "0 0 0 3px rgba(220,38,38,0.07), 0 1px 6px rgba(0,0,0,0.05)"
        : "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        {sparkline && <MiniSparkline data={sparkline} color={color} />}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: alert ? "#dc2626" : "#102033", lineHeight: 1.05, marginTop: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#46596d" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#5a6f84", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
