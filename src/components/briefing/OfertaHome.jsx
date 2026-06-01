// ══════════════════════════════════════════════════════════════
// ALBA CRM — OfertaHome
// TOP 3 zonas con mayor desequilibrio demanda/oferta.
// Decisión de captación inmediata: Zona · Leads · Props · Estado
// Reutiliza normZona() de domain/matching.js
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { normZona } from "../../domain/matching.js";

export default function OfertaHome({ leads, properties, captaciones }) {
  const zonas = useMemo(() => {
    const map = {};

    // Demanda: leads activos con zona
    leads.forEach(l => {
      if (!l.zona) return;
      l.zona.split(/[,/]/).map(z => normZona(z.trim())).filter(Boolean).forEach(z => {
        if (!map[z]) map[z] = { leads: 0, props: 0 };
        map[z].leads++;
      });
    });

    // Oferta: propiedades activas (peso 1.0)
    (properties || []).filter(p => p.activa !== false).forEach(p => {
      const z = normZona(p.zona || "");
      if (!z) return;
      if (!map[z]) map[z] = { leads: 0, props: 0 };
      map[z].props += 1;
    });

    // Oferta: captaciones (peso 0.5)
    (captaciones || []).forEach(c => {
      const z = normZona(c.zona || "");
      if (!z) return;
      if (!map[z]) map[z] = { leads: 0, props: 0 };
      map[z].props += 0.5;
    });

    return Object.entries(map)
      .filter(([, v]) => v.leads >= 2) // mínimo 2 leads para ser relevante
      .map(([zona, v]) => {
        const propsRedondeado = Math.round(v.props);
        const desequilibrio = v.leads - v.props;
        let estado;
        if (desequilibrio >= 4) {
          estado = { label: "Falta oferta", emoji: "🔴", color: "#FF4D4D" };
        } else if (desequilibrio >= 2) {
          estado = { label: "Alta demanda", emoji: "🟠", color: "#FF8C42" };
        } else if (desequilibrio < -1) {
          estado = { label: "Exceso oferta", emoji: "🟡", color: "#E8A830" };
        } else {
          estado = { label: "Equilibrado", emoji: "🟢", color: "#4ADE80" };
        }
        return { zona, leads: v.leads, props: propsRedondeado, desequilibrio, estado };
      })
      .sort((a, b) => b.desequilibrio - a.desequilibrio)
      .slice(0, 3);
  }, [leads, properties, captaciones]);

  // Captaciones sin zona (advertencia)
  const capsSinZona = (captaciones || []).filter(c => !c.zona).length;

  if (zonas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
        Sin datos suficientes por zona
      </div>
    );
  }

  return (
    <div>
      {/* Tabla de zonas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: "0",
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${B.border}`,
      }}>
        {/* Header */}
        {["Zona", "Leads", "Props", "Estado"].map(h => (
          <div key={h} style={{
            padding: "6px 10px", fontSize: 10, fontWeight: 700,
            color: B.dim, background: B.surface,
            textTransform: "uppercase", letterSpacing: "0.7px",
            borderBottom: `1px solid ${B.border}`,
          }}>
            {h}
          </div>
        ))}

        {/* Filas */}
        {zonas.map((z, i) => (
          <React.Fragment key={z.zona}>
            {/* Zona */}
            <div style={{
              padding: "9px 10px", fontSize: 13, fontWeight: 600,
              color: "#C8D8E8", textTransform: "capitalize",
              background: i % 2 === 1 ? B.surface + "80" : "transparent",
              borderBottom: i < zonas.length - 1 ? `1px solid ${B.border}40` : "none",
            }}>
              {z.zona}
            </div>
            {/* Leads */}
            <div style={{
              padding: "9px 10px", fontSize: 13, fontWeight: 700,
              color: B.accentL, textAlign: "center",
              background: i % 2 === 1 ? B.surface + "80" : "transparent",
              borderBottom: i < zonas.length - 1 ? `1px solid ${B.border}40` : "none",
            }}>
              {z.leads}
            </div>
            {/* Props */}
            <div style={{
              padding: "9px 10px", fontSize: 13, fontWeight: 700,
              color: "#2E9E6A", textAlign: "center",
              background: i % 2 === 1 ? B.surface + "80" : "transparent",
              borderBottom: i < zonas.length - 1 ? `1px solid ${B.border}40` : "none",
            }}>
              {z.props}
            </div>
            {/* Estado */}
            <div style={{
              padding: "9px 10px", fontSize: 11, fontWeight: 700,
              color: z.estado.color, textAlign: "right", whiteSpace: "nowrap",
              background: i % 2 === 1 ? B.surface + "80" : "transparent",
              borderBottom: i < zonas.length - 1 ? `1px solid ${B.border}40` : "none",
            }}>
              {z.estado.emoji} {z.estado.label}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Advertencia captaciones sin zona */}
      {capsSinZona > 0 && (
        <div style={{ fontSize: 10, color: B.dim, marginTop: 8 }}>
          {capsSinZona} captación{capsSinZona > 1 ? "es" : ""} sin zona no incluida{capsSinZona > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
