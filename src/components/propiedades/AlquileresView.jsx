// ══════════════════════════════════════════════════════════════
// ALBA CRM — AlquileresView
// Grid de cards de alquileres
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../../data/constants.js";
import { colorEstadoAlquiler } from "../../domain/rental.js";

export default function AlquileresView({ rentals = [], mobile }) {
  return (
    <div>
      <p style={{ fontSize: mobile ? 13 : 12, color:"#8AAECC", margin: mobile ? "0 0 14px" : "0 0 16px" }}>
        {rentals.length} propiedades en gestión
      </p>
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(250px,1fr))", gap: mobile ? 14 : 12 }}>
        {rentals.map(a => {
          const color = colorEstadoAlquiler(a.estado);
          return (
            <div key={a.id} style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12,
              padding: mobile ? "16px" : "14px", borderLeft:`3px solid ${color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom: mobile ? 10 : 8,
                flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize: mobile ? 14 : 13, fontWeight:600, color:B.text }}>{a.nombre}</div>
                  <div style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", marginTop:2 }}>{a.tipo} · {a.zona}</div>
                </div>
                <div style={{ fontSize: mobile ? 13 : 12, padding: mobile ? "3px 10px" : "2px 8px",
                  borderRadius:20, alignSelf:"flex-start",
                  background: color+"18", color }}>
                  {a.estado}
                </div>
              </div>
              {a.precioARS && (
                <div style={{ fontSize: mobile ? 15 : 14, fontWeight:700, color:B.accentL,
                  fontFamily:"Georgia,serif", marginBottom: mobile ? 6 : 4 }}>
                  ARS {a.precioARS.toLocaleString()}/mes
                </div>
              )}
              <div style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>{a.tipoAlq}</div>
              {a.info && <div style={{ fontSize: mobile ? 13 : 12, color:B.dim, marginTop: mobile ? 8 : 5, fontStyle:"italic" }}>{a.info}</div>}
            </div>
          );
        })}
        {rentals.length === 0 && (
          <div style={{ textAlign:"center", padding: mobile ? "50px 20px" : "40px", color:B.muted, fontSize: mobile ? 14 : 13 }}>
            Sin alquileres registrados
          </div>
        )}
      </div>
    </div>
  );
}
