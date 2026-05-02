// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO KANBAN
// Drag & drop entre etapas, filtro por agente
// ══════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead } from "../data/constants.js";

export default function Kanban({ leads, updateLead }) {
  const [dragId,   setDragId]   = useState(null);
  const [overCol,  setOverCol]  = useState(null);
  const [filtroAg, setFiltroAg] = useState("Todos");
  const [toast,    setToast]    = useState(null);
  const ghostRef = useRef(null);

  const vis  = filtroAg === "Todos" ? leads : leads.filter(l => l.ag === filtroAg);
  const cols = ETAPAS.map(etapa => ({
    etapa,
    items: vis.filter(l => l.etapa === etapa),
    total: vis.filter(l => l.etapa === etapa && l.presup).reduce((s, l) => s + l.presup, 0),
  }));

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function onDragStart(e, lead) {
    setDragId(lead.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("id", String(lead.id));
    // Ghost image
    const g = e.currentTarget.cloneNode(true);
    g.style.cssText = `position:fixed;top:-9999px;width:${e.currentTarget.offsetWidth}px;opacity:.9`;
    document.body.appendChild(g);
    ghostRef.current = g;
    e.dataTransfer.setDragImage(g, e.currentTarget.offsetWidth / 2, 16);
  }

  function onDragEnd() {
    setDragId(null);
    setOverCol(null);
    if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null; }
  }

  async function onDrop(e, etapa) {
    e.preventDefault();
    const id   = parseInt(e.dataTransfer.getData("id"));
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.etapa === etapa) { setOverCol(null); return; }
    try {
      await updateLead(id, { etapa });
      showToast(`${lead.nombre} → ${etapa}`);
    } catch (err) {
      showToast("Error al guardar");
    }
    setOverCol(null);
  }

  const chipAg = a => ({
    padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${filtroAg === a ? B.accentL : B.border}`,
    background: filtroAg === a ? `${B.accentL}18` : "transparent",
    color: filtroAg === a ? B.accentL : B.muted,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14, flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Kanban</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{vis.length} leads · arrastrá para cambiar etapa</p>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {["Todos", "C", "A", "F", "L"].map(a => (
            <button key={a} onClick={() => setFiltroAg(a)} style={chipAg(a)}>
              {a === "Todos" ? "Todos" : AG[a]?.n}
            </button>
          ))}
        </div>
      </div>

      {/* Tablero */}
      <div style={{ flex:1, display:"flex", gap:8, overflowX:"auto", overflowY:"hidden", paddingBottom:14,
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
        {cols.map(({ etapa, items, total }) => {
          const ec   = ECOL[etapa];
          const over = overCol === etapa;
          return (
            <div key={etapa}
              onDragOver={e => { e.preventDefault(); setOverCol(etapa); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={e => onDrop(e, etapa)}
              style={{ minWidth:200, maxWidth:200, flexShrink:0,
                background: over ? "rgba(42,91,173,0.07)" : B.colBg,
                border: `1px solid ${over ? B.accent : B.border}`,
                borderRadius:12, display:"flex", flexDirection:"column", transition:"all .15s" }}>

              {/* Cabecera columna */}
              <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${B.border}`, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:ec }} />
                    <span style={{ fontSize:11, fontWeight:600, color:B.text }}>{etapa}</span>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, background:`${ec}22`, color:ec, borderRadius:20, padding:"1px 7px" }}>{items.length}</span>
                </div>
                {total > 0 && <div style={{ fontSize:9, color:B.dim }}>USD {total.toLocaleString()}</div>}
              </div>

              {/* Cards */}
              <div style={{ flex:1, overflowY:"auto", padding:"7px", display:"flex", flexDirection:"column", gap:6,
                scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
                {items.map(lead => {
                  const s        = scoreLead(lead);
                  const ag       = AG[lead.ag];
                  const dragging = dragId === lead.id;
                  return (
                    <div key={lead.id}
                      draggable
                      onDragStart={e => onDragStart(e, lead)}
                      onDragEnd={onDragEnd}
                      style={{ background: dragging ? "rgba(42,91,173,0.06)" : B.card,
                        border: `1px solid ${dragging ? B.accent : B.border}`,
                        borderRadius:8, padding:"9px 10px", cursor:"grab",
                        userSelect:"none", opacity: dragging ? .35 : 1,
                        transform: dragging ? "rotate(1.2deg)" : "none", transition:"opacity .15s" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:B.text, marginBottom:2 }}>{lead.nombre}</div>
                      {lead.zona && <div style={{ fontSize:9, color:B.muted, marginBottom:5 }}>{lead.zona}</div>}
                      {lead.presup && <div style={{ fontSize:11, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif", marginBottom:6 }}>USD {lead.presup.toLocaleString()}</div>}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                        {ag
                          ? <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:ag.bg, color:ag.c, fontWeight:600 }}>{ag.n}</span>
                          : <span style={{ fontSize:9, color:B.dim, padding:"1px 5px", borderRadius:3, background:"rgba(61,90,122,0.2)" }}>Sin asignar</span>
                        }
                        {lead.dias > 0 && <span style={{ fontSize:9, background:s.bg, color:s.c, padding:"1px 5px", borderRadius:3 }}>{lead.dias}d</span>}
                      </div>
                      {lead.notaImp && <div style={{ fontSize:9, color:B.hot, marginTop:4, fontWeight:600 }}>{lead.notaImp}</div>}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ flex:1, minHeight:60, borderRadius:7,
                    border: `1.5px dashed ${over ? B.accent : B.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color .15s" }}>
                    <span style={{ fontSize:11, color: over ? B.accentL : B.dim }}>{over ? "Soltá acá" : "Vacío"}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
          background:"#0F1E35", border:`1px solid ${B.accent}`, borderRadius:20,
          padding:"7px 18px", fontSize:12, color:B.accentL, zIndex:9999, pointerEvents:"none" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
