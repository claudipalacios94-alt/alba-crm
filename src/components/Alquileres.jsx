// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO ALQUILERES
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../data/constants.js";

export default function Alquileres({ rentals = [] }) {
  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Alquileres</h1>
        <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{rentals.length} propiedades en gestión</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:12 }}>
        {rentals.map(a => (
          <div key={a.id} style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"14px",
            borderLeft:`3px solid ${a.estado === "Alquilado" ? B.ok : B.warm}` }}>

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:B.text }}>{a.nombre}</div>
                <div style={{ fontSize:11, color:B.muted, marginTop:2 }}>{a.tipo} · {a.zona}</div>
              </div>
              <div style={{ fontSize:10, padding:"2px 8px", borderRadius:20, alignSelf:"flex-start",
                background: a.estado === "Alquilado" ? `${B.ok}18` : `${B.warm}18`,
                color: a.estado === "Alquilado" ? B.ok : B.warm }}>
                {a.estado}
              </div>
            </div>

            {a.precioARS && (
              <div style={{ fontSize:14, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif", marginBottom:4 }}>
                ARS {a.precioARS.toLocaleString()}/mes
              </div>
            )}

            <div style={{ fontSize:11, color:B.dim }}>{a.tipoAlq}</div>
            {a.info && <div style={{ fontSize:10, color:B.dim, marginTop:5, fontStyle:"italic" }}>{a.info}</div>}
          </div>
        ))}
        {rentals.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px", color:B.muted }}>Sin alquileres registrados</div>
        )}
      </div>
    </div>
  );
}
