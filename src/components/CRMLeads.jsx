// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CRM LEADS
// Lista filtrable, edición inline de etapa y agente, notas
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead } from "../data/constants.js";

export default function CRMLeads({ leads, updateLead, deleteLead }) {
  const [fs, setFs]         = useState("Todos");
  const [fe, setFe]         = useState("Todas");
  const [fa, setFa]         = useState("Todos");
  const [q,  setQ]          = useState("");
  const [exp, setExp]       = useState(null);
  const [editE, setEditE]   = useState(null);
  const [notaEdit, setNotaEdit] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filt = useMemo(() => leads.filter(l => {
    const s = scoreLead(l).label;
    if (fs === "Caliente" && !s.includes("Caliente")) return false;
    if (fs === "Tibio"    && !s.includes("Tibio"))    return false;
    if (fs === "Frío"     && !s.includes("Frío"))     return false;
    if (fe !== "Todas" && l.etapa !== fe) return false;
    if (fa === "Sin asignar" && l.ag)    return false;
    if (fa !== "Todos" && fa !== "Sin asignar" && l.ag !== fa) return false;
    if (q && !l.nombre?.toLowerCase().includes(q.toLowerCase())
          && !(l.zona || "").toLowerCase().includes(q.toLowerCase())
          && !(l.tel  || "").includes(q)) return false;
    return true;
  }), [leads, fs, fe, fa, q]);

  async function setEtapa(id, etapa) {
    await updateLead(id, { etapa });
    setEditE(null);
  }

  async function setAgente(id, ag) {
    await updateLead(id, { ag });
    setEditE(null);
  }

  async function guardarNota(lead) {
    const nueva = (notaEdit[lead.id] || "").trim();
    if (!nueva) return;
    const ts = new Date().toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
    const notaFinal = `[${ts}] ${nueva}${lead.nota ? "\n" + lead.nota : ""}`;
    await updateLead(lead.id, { nota: notaFinal });
    setNotaEdit(p => ({ ...p, [lead.id]: "" }));
  }

  async function confirmarEliminar(lead) {
    setConfirmDelete(lead);
  }

  async function ejecutarEliminar() {
    if (!confirmDelete) return;
    try {
      await deleteLead(confirmDelete.id);
      setConfirmDelete(null);
      if (exp === confirmDelete.id) setExp(null);
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  }

  const chip = (act, c) => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${act ? c : B.border}`,
    background: act ? `${c}22` : "transparent",
    color: act ? c : B.muted,
  });

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>CRM Leads</h1>
        <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{filt.length} de {leads.length} contactos</p>
      </div>

      {/* Filtros */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:11, padding:"12px 14px", marginBottom:12 }}>
        <input placeholder="Buscar nombre, zona o teléfono..."
          value={q} onChange={e => setQ(e.target.value)}
          style={{ width:"100%", background:"transparent", border:`1px solid ${B.border}`, borderRadius:7,
            padding:"7px 11px", color:B.text, fontSize:12, marginBottom:8, outline:"none", boxSizing:"border-box" }} />

        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>SCORING</span>
          {["Todos","Caliente","Tibio","Frío"].map(s => (
            <button key={s} onClick={() => setFs(s)} style={chip(fs === s, s === "Caliente" ? B.hot : s === "Tibio" ? B.warm : s === "Frío" ? B.muted : B.accentL)}>{s}</button>
          ))}
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>ETAPA</span>
          {["Todas", ...ETAPAS].map(e => (
            <button key={e} onClick={() => setFe(e)} style={chip(fe === e, ECOL[e] || B.accentL)}>{e}</button>
          ))}
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>AGENTE</span>
          {["Todos","C","A","F","L","Sin asignar"].map(a => (
            <button key={a} onClick={() => setFa(a)} style={chip(fa === a, a === "Sin asignar" ? B.hot : a !== "Todos" ? AG[a]?.c : B.accentL)}>
              {a === "Todos" ? "Todos" : a === "Sin asignar" ? "Sin asignar" : AG[a]?.n}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filt.map(lead => {
          const s    = scoreLead(lead);
          const ag   = AG[lead.ag];
          const ec   = ECOL[lead.etapa];
          const open = exp === lead.id;

          return (
            <div key={lead.id} style={{ background:B.card, border:`1px solid ${open ? B.accent : B.border}`, borderRadius:10, transition:"border-color .15s" }}>

              {/* Fila principal */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", cursor:"pointer", padding:"10px 13px" }}
                onClick={() => setExp(open ? null : lead.id)}>
                <span style={{ fontSize:11, color:B.dim, minWidth:24 }}>#{lead.id}</span>
                <span style={{ fontSize:12, fontWeight:500, color:B.text, flex:1, minWidth:100 }}>{lead.nombre}</span>

                {/* Selector agente */}
                <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                  <span onClick={() => setEditE(editE === `ag-${lead.id}` ? null : `ag-${lead.id}`)}
                    style={{ fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
                      background: lead.ag && AG[lead.ag] ? AG[lead.ag].bg : "rgba(61,90,122,0.2)",
                      color: lead.ag && AG[lead.ag] ? AG[lead.ag].c : B.muted, fontWeight:600 }}>
                    {lead.ag && AG[lead.ag] ? AG[lead.ag].n : "Sin asignar"} ▾
                  </span>
                  {editE === `ag-${lead.id}` && (
                    <div style={{ position:"absolute", top:"110%", left:0, zIndex:200,
                      background:"#0B1628", border:`1px solid ${B.border}`, borderRadius:8,
                      padding:4, minWidth:130, boxShadow:"0 8px 32px rgba(0,0,0,.7)" }}>
                      {[["", "Sin asignar"], ...Object.entries(AG).map(([k, v]) => [k, v.n])].map(([k, n]) => (
                        <div key={k} onClick={() => setAgente(lead.id, k)}
                          style={{ padding:"6px 10px", borderRadius:5, cursor:"pointer", fontSize:12,
                            color: lead.ag === k ? (k ? AG[k].c : B.accentL) : B.muted,
                            background: lead.ag === k ? `${k ? AG[k]?.c || B.accentL : B.accentL}18` : "transparent",
                            fontWeight: lead.ag === k ? 600 : 400 }}>{n}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selector etapa */}
                <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                  <span onClick={() => setEditE(editE === lead.id ? null : lead.id)}
                    style={{ fontSize:11, padding:"3px 9px", borderRadius:4, cursor:"pointer",
                      background:`${ec}18`, color:ec, border:`1px solid ${ec}35` }}>
                    {lead.etapa} ▾
                  </span>
                  {editE === lead.id && (
                    <div style={{ position:"absolute", top:"110%", left:0, zIndex:200,
                      background:"#0B1628", border:`1px solid ${B.border}`, borderRadius:8,
                      padding:4, minWidth:150, boxShadow:"0 8px 32px rgba(0,0,0,.65)" }}>
                      {ETAPAS.map(e => (
                        <div key={e} onClick={() => setEtapa(lead.id, e)}
                          style={{ padding:"6px 10px", borderRadius:5, cursor:"pointer", fontSize:12,
                            color: lead.etapa === e ? ECOL[e] : B.muted,
                            background: lead.etapa === e ? `${ECOL[e]}15` : "transparent",
                            fontWeight: lead.etapa === e ? 600 : 400 }}>{e}</div>
                      ))}
                    </div>
                  )}
                </div>

                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:s.bg, color:s.c }}>{s.label}</span>
                {lead.presup && <span style={{ fontSize:11, color:B.accentL, fontFamily:"Georgia,serif" }}>USD {lead.presup.toLocaleString()}</span>}
              </div>

              {/* Panel expandido */}
              {open && (
                <div style={{ padding:"10px 13px 13px", borderTop:`1px solid ${B.border}` }}>

                  {/* Grid de datos */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:9, marginBottom:12 }}>
                    {[
                      ["Operación",     lead.op],
                      ["Tipo",          lead.tipo || "—"],
                      ["Zona",          lead.zona || "—"],
                      ["Teléfono",      lead.tel  || "—"],
                      ["Origen",        lead.origen || "—"],
                      ["Días sin contacto", lead.dias],
                      ["Probabilidad",  lead.prob ? `${lead.prob}%` : "—"],
                      ["Prox. acción",  lead.proxAccion || "—"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize:9, color:B.dim, letterSpacing:".8px", textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                        <div style={{ fontSize:12, color:B.text }}>{v}</div>
                      </div>
                    ))}
                    {lead.notaImp && (
                      <div style={{ gridColumn:"1/-1" }}>
                        <div style={{ fontSize:9, color:B.hot, letterSpacing:".8px", textTransform:"uppercase", marginBottom:2 }}>NOTA IMPORTANTE</div>
                        <div style={{ fontSize:12, color:B.hot, fontWeight:600 }}>📌 {lead.notaImp}</div>
                      </div>
                    )}
                  </div>

                  {/* Acciones rápidas */}
                  <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    {lead.tel && (
                      <a href={`tel:${lead.tel}`}
                        style={{ padding:"5px 12px", borderRadius:6, background:`${B.ok}18`, border:`1px solid ${B.ok}40`, color:B.ok, fontSize:10, textDecoration:"none", fontWeight:600 }}>
                        📞 Llamar
                      </a>
                    )}
                    {lead.tel && (
                      <a href={`https://wa.me/${lead.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                        style={{ padding:"5px 12px", borderRadius:6, background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)", color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                        💬 WhatsApp
                      </a>
                    )}
                    <button onClick={() => confirmarEliminar(lead)}
                      style={{ padding:"5px 12px", borderRadius:6, background:`${B.hot}12`,
                        border:`1px solid ${B.hot}30`, color:B.hot, fontSize:10,
                        cursor:"pointer", fontWeight:600, marginLeft:"auto" }}>
                      🗑 Eliminar
                    </button>
                  </div>

                  {/* Nota existente */}
                  {lead.nota && (
                    <div style={{ fontSize:12, color:B.muted, fontStyle:"italic", marginBottom:8,
                      padding:"7px 10px", background:"rgba(74,138,232,0.05)", borderRadius:6, borderLeft:`2px solid ${B.border}`,
                      whiteSpace:"pre-wrap", lineHeight:1.6 }}>
                      {lead.nota}
                    </div>
                  )}

                  {/* Input nota nueva */}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input
                      value={notaEdit[lead.id] || ""}
                      onChange={e => setNotaEdit(p => ({ ...p, [lead.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") guardarNota(lead); }}
                      placeholder="Nota nueva — Enter para guardar..."
                      style={{ flex:1, background:"transparent", border:`1px solid ${B.border}`,
                        borderRadius:7, padding:"7px 10px", color:B.text, fontSize:12,
                        outline:"none", fontFamily:"'Trebuchet MS',sans-serif" }} />
                    {(notaEdit[lead.id] || "").trim() && (
                      <button onClick={() => guardarNota(lead)}
                        style={{ padding:"7px 14px", borderRadius:7, cursor:"pointer",
                          background:B.accent, border:`1px solid ${B.accentL}`,
                          color:"#fff", fontSize:12, fontWeight:700 }}>
                        Guardar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filt.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:B.muted, fontSize:13 }}>Sin resultados</div>}
      </div>

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.hot}50`, borderRadius:14,
            padding:"28px 32px", maxWidth:380, width:"90%",
            boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:22, marginBottom:12, textAlign:"center" }}>🗑</div>
            <div style={{ fontSize:15, fontWeight:700, color:B.text, fontFamily:"Georgia,serif",
              marginBottom:8, textAlign:"center" }}>
              ¿Eliminar lead?
            </div>
            <div style={{ fontSize:13, color:B.muted, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              Vas a eliminar a <strong style={{ color:B.text }}>{confirmDelete.nombre}</strong>.
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`,
                  color:B.muted, fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={ejecutarEliminar}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:B.hot, border:`1px solid ${B.hot}`,
                  color:"#fff", fontSize:13, fontWeight:700 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
