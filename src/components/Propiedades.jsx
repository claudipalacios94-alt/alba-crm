// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO PROPIEDADES
// Grid filtrable con scoring de días en cartera
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../data/constants.js";

export default function Propiedades({ properties }) {
  const [ft, setFt] = useState("Todos");
  const [fs, setFs] = useState("Todos");

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo))];
  const list  = properties.filter(p =>
    (ft === "Todos" || p.tipo === ft) &&
    (fs === "Todos"
      || (fs === "Urgente"  && p.sc?.includes("Urgente"))
      || (fs === "Atención" && p.sc?.includes("Atención"))
      || (fs === "OK"       && p.sc?.includes("OK")))
  );

  const ch = act => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${act ? B.accentL : B.border}`,
    background: act ? `${B.accentL}18` : "transparent",
    color: act ? B.accentL : B.muted,
  });

  const scColor = p =>
    p.sc?.includes("Urgente")  ? B.hot  :
    p.sc?.includes("Atención") ? B.warm : B.ok;

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Propiedades en venta</h1>
        <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{list.length} de {properties.length} propiedades</p>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
        {tipos.map(t => <button key={t} onClick={() => setFt(t)} style={ch(ft === t)}>{t}</button>)}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
        {["Todos","OK","Atención","Urgente"].map(s => (
          <button key={s} onClick={() => setFs(s)}
            style={{ ...ch(fs === s),
              borderColor: fs === s ? (s === "Urgente" ? B.hot : s === "Atención" ? B.warm : B.accentL) : B.border,
              color: fs === s ? (s === "Urgente" ? B.hot : s === "Atención" ? B.warm : B.accentL) : B.muted }}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
        {list.map(p => {
          const c = scColor(p);
          return (
            <div key={p.id} style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"14px", borderLeft:`3px solid ${c}` }}>

              {/* Tipo + zona + badge */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:B.text }}>{p.tipo}</div>
                  <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>{p.zona}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, padding:"2px 7px", borderRadius:4, background:`${c}18`, color:c }}>{p.sc}</div>
                  {p.ag && AG[p.ag] && (
                    <div style={{ fontSize:9, padding:"1px 5px", borderRadius:3,
                      background:AG[p.ag].bg, color:AG[p.ag].c, fontWeight:700, marginTop:3 }}>
                      {AG[p.ag].n}
                    </div>
                  )}
                </div>
              </div>

              {/* Dirección */}
              <div style={{ fontSize:11, color:B.muted, marginBottom:7 }}>{p.dir}</div>

              {/* Características */}
              <div style={{ fontSize:11, color:B.dim, marginBottom:9 }}>{p.caracts}</div>

              {/* Precio + días */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:15, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>
                  {p.precio ? `USD ${p.precio.toLocaleString()}` : "A consultar"}
                </div>
                <div style={{ fontSize:10, color:B.dim }}>{p.dias}d en cartera</div>
              </div>

              {/* m² y precio/m² */}
              {p.m2tot && (
                <div style={{ fontSize:10, color:B.muted, marginTop:4 }}>
                  {p.m2tot}m² tot
                  {p.m2cub ? ` · ${p.m2cub}m² cub` : ""}
                  {p.precio && p.m2tot ? ` · USD ${Math.round(p.precio / p.m2tot).toLocaleString()}/m²` : ""}
                </div>
              )}

              {/* Info interna */}
              {p.info && (
                <div style={{ fontSize:10, color:B.dim, marginTop:5, fontStyle:"italic" }}>{p.info}</div>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:B.muted }}>Sin propiedades</div>
        )}
      </div>
    </div>
  );
}
