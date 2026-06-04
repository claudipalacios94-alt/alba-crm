import React from "react";
import { B } from "../../data/constants.js";

const RECIENTES = [
  { id: 1, tipo: "Depto 2 amb",  zona: "Güemes",      precio: "USD 82.000", origen: "Portal", hace: "hoy",  estado: "nueva" },
  { id: 2, tipo: "Casa 3 amb",   zona: "Chauvin",     precio: "USD 98.000", origen: "Colega", hace: "1d",   estado: "nueva" },
  { id: 3, tipo: "PH 4 amb",     zona: "Centro",      precio: "USD 95.000", origen: "Portal", hace: "2d",   estado: "sin convertir" },
  { id: 4, tipo: "Depto 1 amb",  zona: "La Perla",    precio: "USD 62.000", origen: "WA",     hace: "3d",   estado: "sin convertir" },
  { id: 5, tipo: "Local",        zona: "Macrocentro", precio: "USD 145.000",origen: "Portal", hace: "4d",   estado: "vence pronto" },
];

const ESTADO_COLOR = {
  "nueva":          { color: B.ok },
  "sin convertir":  { color: "#f97316" },
  "vence pronto":   { color: B.hot },
};

export default function OfertaRecentList() {
  return (
    <div style={{
      background: B.card,
      border: `1px solid ${B.border}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 12px 7px",
        borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: B.text }}>Captaciones recientes</div>
        <button style={{
          fontSize: 10, fontWeight: 600, color: B.accentL,
          background: "transparent", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "'DM Sans', sans-serif",
        }}>Ver todas →</button>
      </div>

      {RECIENTES.map((c, i) => {
        const ec = ESTADO_COLOR[c.estado] || ESTADO_COLOR["sin convertir"];
        return (
          <div key={c.id} style={{
            padding: "7px 12px",
            borderBottom: i < RECIENTES.length - 1 ? `1px solid ${B.surface}` : "none",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: B.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.tipo} · {c.zona}
              </div>
              <div style={{ fontSize: 9, color: B.dim }}>
                {c.precio} · {c.origen} · {c.hace}
              </div>
            </div>
            <span style={{ fontSize: 8, fontWeight: 700, color: ec.color, whiteSpace: "nowrap" }}>
              ● {c.estado}
            </span>
          </div>
        );
      })}
    </div>
  );
}
