import React from "react";
import { B } from "../../data/constants.js";

const ZONAS = [
  { nombre: "La Perla",      x: "68%", y: "22%", items: 8,  demanda: "alta" },
  { nombre: "Güemes",        x: "56%", y: "32%", items: 6,  demanda: "alta" },
  { nombre: "Centro",        x: "50%", y: "44%", items: 12, demanda: "media" },
  { nombre: "Chauvin",       x: "40%", y: "54%", items: 4,  demanda: "media" },
  { nombre: "San Juan",      x: "60%", y: "50%", items: 3,  demanda: "baja" },
  { nombre: "V. Lourdes",    x: "33%", y: "64%", items: 5,  demanda: "media" },
  { nombre: "Bosque Grande", x: "26%", y: "73%", items: 2,  demanda: "alta" },
];

const DEMANDA_COLOR = { alta: "#ef4444", media: "#f97316", baja: B.dim };

export default function OfertaMapPreview() {
  return (
    <div style={{
      background: B.card,
      border: `1px solid ${B.border}`,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    }}>
      <div style={{
        padding: "9px 12px 7px",
        borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.text }}>Mapa de oferta</div>
          <div style={{ fontSize: 9, color: B.dim }}>52 activas · MDP</div>
        </div>
        <button style={{
          fontSize: 10, fontWeight: 600, color: B.accentL,
          background: "transparent", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "'DM Sans', sans-serif",
        }}>Ver completo →</button>
      </div>

      <div style={{
        height: 180,
        background: "linear-gradient(160deg, #0a1a28 0%, #071420 60%, #060f18 100%)",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
          <defs>
            <pattern id="og" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke={B.accentL} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#og)" />
        </svg>

        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "18%",
          background: "linear-gradient(135deg, #0a2a3a 0%, #061820 100%)",
          borderLeft: `1px solid ${B.border}`,
        }} />
        <div style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          fontSize: 8, color: B.dim, fontWeight: 600, opacity: 0.7, letterSpacing: "1px",
        }}>MAR</div>

        {ZONAS.map(z => {
          const size = z.items > 6 ? 26 : z.items > 3 ? 20 : 14;
          return (
            <div key={z.nombre} style={{
              position: "absolute", left: z.x, top: z.y,
              transform: "translate(-50%, -50%)",
            }}>
              <div style={{
                width: size, height: size, borderRadius: "50%",
                background: DEMANDA_COLOR[z.demanda],
                border: `2px solid ${B.surface}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: size > 18 ? 8 : 6, fontWeight: 700, color: "#fff",
                cursor: "pointer",
                boxShadow: `0 0 8px ${DEMANDA_COLOR[z.demanda]}55`,
              }}>{z.items}</div>
              <div style={{
                position: "absolute", top: "100%", left: "50%",
                transform: "translateX(-50%)",
                fontSize: 7, fontWeight: 500, color: B.muted,
                whiteSpace: "nowrap", marginTop: 2,
              }}>{z.nombre}</div>
            </div>
          );
        })}

        <div style={{
          position: "absolute", bottom: 7, left: 7,
          background: `${B.surface}ee`, borderRadius: 5,
          padding: "3px 7px", fontSize: 8, color: B.muted,
          display: "flex", gap: 8,
          border: `1px solid ${B.border}`,
        }}>
          <span><span style={{ color: "#ef4444" }}>●</span> Alta</span>
          <span><span style={{ color: "#f97316" }}>●</span> Media</span>
          <span><span style={{ color: B.dim }}>●</span> Baja</span>
        </div>
      </div>
    </div>
  );
}
