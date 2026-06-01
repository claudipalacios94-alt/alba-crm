// ══════════════════════════════════════════════════════════════
// ALBA CRM — OfertaHome v2
// Zone cards 2 cols, compradores / propiedades / status badge.
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { normZona } from "../../domain/matching.js";
import { useNavigate } from "react-router-dom";

export default function OfertaHome({ leads, properties, captaciones }) {
  const navigate = useNavigate();

  const zonas = useMemo(() => {
    const map = {};

    leads.forEach(l => {
      if (!l.zona) return;
      l.zona.split(/[,/]/).map(z => normZona(z.trim())).filter(Boolean).forEach(z => {
        if (!map[z]) map[z] = { leads: 0, props: 0 };
        map[z].leads++;
      });
    });

    (properties || []).filter(p => p.activa !== false).forEach(p => {
      const z = normZona(p.zona || "");
      if (!z) return;
      if (!map[z]) map[z] = { leads: 0, props: 0 };
      map[z].props += 1;
    });

    (captaciones || []).forEach(c => {
      const z = normZona(c.zona || "");
      if (!z) return;
      if (!map[z]) map[z] = { leads: 0, props: 0 };
      map[z].props += 0.5;
    });

    return Object.entries(map)
      .filter(([, v]) => v.leads >= 1)
      .map(([zona, v]) => {
        const props = Math.round(v.props);
        const deq = v.leads - v.props;
        let estado;
        if (deq >= 4)       estado = { label: "Falta oferta",  color: "#EF4444" };
        else if (deq >= 2)  estado = { label: "Alta demanda",  color: "#FF8C42" };
        else if (deq < -1)  estado = { label: "Exceso oferta", color: "#E8A830" };
        else                estado = { label: "Equilibrado",   color: "#4ADE80" };
        return { zona, leads: v.leads, props, deq, estado };
      })
      .sort((a, b) => b.deq - a.deq)
      .slice(0, 6);
  }, [leads, properties, captaciones]);

  if (zonas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
        Sin datos suficientes por zona
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 10,
      }}>
        {zonas.map(z => (
          <div key={z.zona} style={{
            background: "#0C1527",
            border: "1px solid #1E293B",
            borderRadius: 10,
            padding: "12px 14px",
          }}>
            {/* Nombre zona */}
            <div style={{
              fontSize: 13, fontWeight: 700, color: "#E2E8F0",
              textTransform: "capitalize", marginBottom: 6,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {z.zona}
            </div>

            {/* Conteos */}
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#4A8AE8", fontWeight: 600 }}>
                {z.leads} compradores
              </div>
              <div style={{ fontSize: 11, color: "#2E9E6A", fontWeight: 600 }}>
                {z.props} propiedades
              </div>
            </div>

            {/* Badge estado */}
            <div style={{
              display: "inline-block",
              fontSize: 10, fontWeight: 700, color: z.estado.color,
              background: z.estado.color + "18",
              border: `1px solid ${z.estado.color}30`,
              padding: "2px 8px", borderRadius: 10,
            }}>
              {z.estado.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <button
        onClick={() => navigate("/captaciones")}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 7, fontSize: 11,
          fontWeight: 600, color: "#4A8AE8", background: "transparent",
          border: "1px solid #1E293B", cursor: "pointer",
          letterSpacing: "0.02em",
        }}>
        Ver todas las zonas ›
      </button>
    </div>
  );
}
