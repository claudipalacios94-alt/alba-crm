// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO BRIEFING DEL DÍA
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, scoreLead } from "../data/constants.js";

export default function Briefing({ leads }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const [tachado, setTachado]   = useState({});

  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const sinAsignar = activos.filter(l => !l.ag).length;

  const llamadas = useMemo(() => activos
    .filter(l => (filtroAg === "Todos" || l.ag === filtroAg) && (l.dias <= 7 || l.etapa === "Negociación" || l.etapa === "Visita"))
    .map(l => {
      let p = 0, r = "";
      if (l.etapa === "Negociación")              { p = 100; r = "En negociación — decisión inminente"; }
      else if (l.dias === 0)                      { p = 90;  r = "Nuevo hoy — primer contacto urgente"; }
      else if (l.dias < 3 && (l.prob || 0) >= 40) { p = 85; r = "Caliente con buena probabilidad"; }
      else if (l.dias < 3)                        { p = 78;  r = "Contacto reciente — mantener el calor"; }
      else if (l.etapa === "Visita" && l.dias > 3){ p = 72;  r = "Post-visita sin seguimiento registrado"; }
      else if (l.dias >= 4 && l.dias <= 7)        { p = 60;  r = "Tibio — recontactar antes que enfríe"; }
      return { ...l, p, r };
    })
    .sort((a, b) => b.p - a.p)
    .slice(0, 12)
  , [activos, filtroAg]);

  const cierre = useMemo(() => activos
    .filter(l => (filtroAg === "Todos" || l.ag === filtroAg) && ((l.prob || 0) >= 40 || l.etapa === "Negociación"))
    .sort((a, b) => (b.prob || 0) - (a.prob || 0))
    .slice(0, 5)
  , [activos, filtroAg]);

  const pendientes = llamadas.filter(l => !tachado[l.id]).length;
  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días ☀️" : hora < 19 ? "Buenas tardes" : "Buenas noches 🌙";

  const chipAg = a => ({
    padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${filtroAg === a ? B.accentL : B.border}`,
    background: filtroAg === a ? `${B.accentL}18` : "transparent",
    color: filtroAg === a ? B.accentL : B.muted,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>{saludo}</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"4px 0 0" }}>
            {hoy.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })} · {leads.length} leads totales
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            { v: pendientes, l: "Llamar hoy",    c: pendientes > 0 ? B.hot : B.ok },
            { v: sinAsignar, l: "Sin asignar",   c: sinAsignar > 10 ? B.hot : B.warm },
          ].map(s => (
            <div key={s.l} style={{ background:B.card, border:`1px solid ${s.c}35`, borderRadius:10, padding:"8px 14px", textAlign:"center", minWidth:82 }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.c, fontFamily:"Georgia,serif", lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9, color:B.muted, marginTop:3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta distribución */}
      {sinAsignar > 5 && (
        <div style={{ background:"rgba(232,93,48,0.07)", border:"1px solid rgba(232,93,48,0.22)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#E8856A" }}>
          <strong>{sinAsignar} leads sin agente asignado.</strong> Ir al Asistente IA → pedir plan de distribución.
        </div>
      )}

      {/* Filtro agente */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
        {["Todos", "C", "A", "F", "L"].map(a => (
          <button key={a} onClick={() => setFiltroAg(a)} style={chipAg(a)}>
            {a === "Todos" ? "Todo el equipo" : AG[a]?.n}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>

        {/* Llamadas del día */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"11px 14px 9px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:B.text }}>Llamadas del día</div>
              <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>Tocá para tachar cuando lo hacés</div>
            </div>
            <span style={{ fontSize:11, background:`${pendientes > 0 ? B.hot : B.ok}18`, color:pendientes > 0 ? B.hot : B.ok, borderRadius:20, padding:"2px 10px", fontWeight:700 }}>
              {pendientes} pendientes
            </span>
          </div>
          <div style={{ padding:"8px" }}>
            {llamadas.length === 0
              ? <div style={{ padding:"24px", textAlign:"center", color:B.dim, fontSize:13 }}>Sin llamadas urgentes para este filtro</div>
              : llamadas.map((lead, i) => {
                  const done = tachado[lead.id];
                  const ag   = AG[lead.ag];
                  const s    = scoreLead(lead);
                  const isTop = i === 0 && !done;
                  return (
                    <div key={lead.id}
                      onClick={() => setTachado(p => ({ ...p, [lead.id]: !p[lead.id] }))}
                      style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px", borderRadius:7, marginBottom:2, cursor:"pointer", userSelect:"none",
                        background: done ? "rgba(46,158,106,0.04)" : isTop ? "rgba(232,93,48,0.04)" : "transparent",
                        borderLeft: `2px solid ${done ? B.ok : isTop ? B.hot : "transparent"}`,
                        opacity: done ? .45 : 1 }}>
                      <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, marginTop:2,
                        border:`1.5px solid ${done ? B.ok : B.border}`,
                        background: done ? `${B.ok}25` : "transparent",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {done && <span style={{ fontSize:9, color:B.ok }}>✓</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginBottom:2 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:done ? B.muted : B.text, textDecoration:done ? "line-through" : "none" }}>{lead.nombre}</span>
                          {ag
                            ? <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:ag.bg, color:ag.c, fontWeight:700 }}>{ag.n}</span>
                            : <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:"rgba(90,122,184,0.15)", color:B.muted }}>Sin asignar</span>
                          }
                          <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:s.bg, color:s.c }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize:11, color:B.muted }}>{lead.r}</div>
                        {lead.notaImp && !done && <div style={{ fontSize:10, color:B.hot, marginTop:2, fontWeight:600 }}>{lead.notaImp}</div>}
                      </div>
                      {lead.presup && <div style={{ fontSize:11, color:B.accentL, fontFamily:"Georgia,serif", whiteSpace:"nowrap", flexShrink:0, marginTop:2 }}>USD {lead.presup.toLocaleString()}</div>}
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Cerca del cierre */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"11px 14px 9px", borderBottom:`1px solid ${B.border}` }}>
            <div style={{ fontSize:13, fontWeight:600, color:B.text }}>Cerca del cierre</div>
            <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>Máxima prioridad</div>
          </div>
          <div style={{ padding:"10px" }}>
            {cierre.length === 0
              ? <div style={{ padding:"20px", textAlign:"center", color:B.dim, fontSize:12 }}>Sin oportunidades activas</div>
              : cierre.map(lead => {
                  const ag = AG[lead.ag];
                  const barC = (lead.prob || 0) >= 70 ? B.ok : (lead.prob || 0) >= 40 ? "#D4732A" : B.warm;
                  return (
                    <div key={lead.id} style={{ padding:"10px 11px", borderRadius:9, marginBottom:6, background:"rgba(212,115,42,0.04)", border:"1px solid rgba(212,115,42,0.12)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:6, marginBottom:6 }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:B.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{lead.nombre}</div>
                          <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>{lead.etapa} · {lead.zona || "Zona ?"}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          {lead.presup && <div style={{ fontSize:12, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>USD {lead.presup.toLocaleString()}</div>}
                          {ag
                            ? <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:ag.bg, color:ag.c, fontWeight:700, display:"inline-block", marginTop:2 }}>{ag.n}</span>
                            : <span style={{ fontSize:9, color:B.dim }}>Sin asignar</span>
                          }
                        </div>
                      </div>
                      {lead.prob && (
                        <div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:9, color:B.dim }}>Probabilidad</span>
                            <span style={{ fontSize:9, color:barC, fontWeight:700 }}>{lead.prob}%</span>
                          </div>
                          <div style={{ height:3, background:B.border, borderRadius:2 }}>
                            <div style={{ height:"100%", width:`${lead.prob}%`, background:barC, borderRadius:2 }} />
                          </div>
                        </div>
                      )}
                      {lead.notaImp && <div style={{ fontSize:9, color:B.hot, marginTop:5, fontWeight:600 }}>{lead.notaImp}</div>}
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
