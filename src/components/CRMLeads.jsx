// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRM LEADS (diseño card, filtros scoring/agente/perfil)
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, genMsgBusqueda, ETAPAS, ECOL, scoreLead, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
 
const TIPOS_OP   = ["Compra","Alquiler","Inversión","Alquiler / Compra"];
const TIPOS_PROP = ["Depto","Casa","PH","Casa / PH","Dúplex","Local","Terreno","Otro"];
 
export default function CRMLeads({ leads, updateLead, deleteLead, properties }) {
  const [fs,  setFs]  = useState("Todos");
  const [fa,  setFa]  = useState("Todos");
  const [fop, setFop] = useState("Todos");
  const [q,   setQ]   = useState("");
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [exp,     setExp]     = useState(null);
  const [editE,   setEditE]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [notaEdit, setNotaEdit] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
 
  const filt = useMemo(() => leads.filter(l => {
    if (!mostrarPerdidos && (l.etapa === "Perdido" || l.etapa === "Cerrado")) return false;
    const s = scoreLead(l).label;
    if (fs === "Caliente" && !s.includes("Caliente")) return false;
    if (fs === "Tibio"    && !s.includes("Tibio"))    return false;
    if (fs === "Frío"     && !s.includes("Frío"))     return false;
    if (fa === "Sin asignar" && l.ag) return false;
    if (fa !== "Todos" && fa !== "Sin asignar" && l.ag !== fa) return false;
    if (fop === "Inversor"  && l.op !== "Inversión") return false;
    if (fop === "Comprador" && l.op === "Inversión") return false;
    if (q && !l.nombre?.toLowerCase().includes(q.toLowerCase())
          && !(l.zona||"").toLowerCase().includes(q.toLowerCase())
          && !(l.tel||"").includes(q)) return false;
    return true;
  }).sort((a, b) => a.dias - b.dias), [leads, fs, fa, fop, q, mostrarPerdidos]);
 
  const perdidosCount = leads.filter(l => l.etapa === "Perdido" || l.etapa === "Cerrado").length;
 
  async function setEtapa(id, etapa) { await updateLead(id, { etapa }); setEditE(null); }
  async function setAgente(id, ag)   { await updateLead(id, { ag });    setEditE(null); }
 
  async function contacteHoy(id) { await updateLead(id, { last_contact_at: new Date().toISOString() }); }
 
  async function setScore(id, n) { await updateLead(id, { prob: n * 20 }); }
 
  async function guardarNota(lead) {
    const nueva = (notaEdit[lead.id] || "").trim();
    if (!nueva) return;
    const ts = new Date().toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
    await updateLead(lead.id, { nota: `[${ts}] ${nueva}${lead.nota ? "\n" + lead.nota : ""}` });
    setNotaEdit(p => ({ ...p, [lead.id]: "" }));
  }
 
  function startEdit(lead) {
    setEditing(lead.id);
    setEditData({
      nombre: lead.nombre || "", tel: lead.tel || "", zona: lead.zona || "",
      presup: lead.presup || "", tipo: lead.tipo || "", op: lead.op || "",
      origen: lead.origen || "", proxAccion: lead.proxAccion || "", nota: lead.nota || "",
    });
  }
 
  async function saveEdit(id) {
    setSaving(true);
    try {
      await updateLead(id, {
        nombre: editData.nombre, tel: editData.tel, zona: editData.zona,
        presup: editData.presup ? Number(editData.presup) : null,
        tipo: editData.tipo, op: editData.op, origen: editData.origen,
        proxaccion: editData.proxAccion, nota: editData.nota,
      });
      setEditing(null);
    } catch(e) { console.error(e); }
    setSaving(false);
  }
 
  async function ejecutarEliminar() {
    if (!confirmDelete) return;
    try { await deleteLead(confirmDelete.id); setConfirmDelete(null); if (exp === confirmDelete.id) setExp(null); }
    catch(e) { console.error(e); }
  }
 
  const chip = (act, c) => ({
    padding:"4px 11px", borderRadius:20, fontSize:11, cursor:"pointer",
    border:`1px solid ${act ? c : B.border}`,
    background: act ? `${c}22` : "transparent",
    color: act ? c : B.muted,
  });
 
  const inp = {
    width:"100%", background:B.bg, border:`1px solid ${B.border}`,
    borderRadius:6, padding:"6px 9px", color:B.text, fontSize:11,
    outline:"none", boxSizing:"border-box", fontFamily:"'Trebuchet MS',sans-serif",
  };
 
  return (
    <div style={{ maxWidth:800 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>CRM Leads</h1>
          <p style={{ fontSize:11, color:"#8AAECC", margin:"3px 0 0" }}>{filt.length} contactos</p>
        </div>
        <button onClick={() => setMostrarPerdidos(p => !p)}
          style={{ fontSize:12, color:mostrarPerdidos?B.hot:B.dim, cursor:"pointer",
            background:"transparent", border:`1px solid ${mostrarPerdidos?B.hot:B.border}`,
            borderRadius:6, padding:"4px 10px" }}>
          {mostrarPerdidos ? "Ocultar archivados" : `Archivados (${perdidosCount})`}
        </button>
      </div>
 
      {/* Filtros */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12,
        padding:"14px 16px", marginBottom:16 }}>
        <input placeholder="Buscar nombre, zona o teléfono..."
          value={q} onChange={e => setQ(e.target.value)}
          style={{ width:"100%", background:"transparent", border:`1px solid ${B.border}`,
            borderRadius:8, padding:"8px 12px", color:B.text, fontSize:12,
            marginBottom:10, outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:11, color:B.muted }}>TEMP</span>
            {["Todos","Caliente","Tibio","Frío"].map(s => (
              <button key={s} onClick={() => setFs(s)}
                style={chip(fs===s, s==="Caliente"?B.hot:s==="Tibio"?B.warm:B.muted)}>{s}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:11, color:B.muted }}>AGENTE</span>
            {["Todos","C","A","F","L","Sin asignar"].map(a => (
              <button key={a} onClick={() => setFa(a)}
                style={chip(fa===a, a==="Sin asignar"?B.hot:a!=="Todos"?AG[a]?.c:B.accentL)}>
                {a==="Todos"?"Todos":a==="Sin asignar"?"—":AG[a]?.n}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:11, color:B.muted }}>PERFIL</span>
            {["Todos","Comprador","Inversor"].map(o => (
              <button key={o} onClick={() => setFop(o)}
                style={chip(fop===o, o==="Inversor"?"#9B6DC8":B.accentL)}>{o}</button>
            ))}
          </div>
        </div>
      </div>
 
      {/* Cards agrupadas por temperatura */}
      {[
        { titulo:"🔴 CALIENTES", color:B.hot,  leads: filt.filter(l => { const s = scoreLead(l).label; return s.includes("Caliente") || l.etapa === "Negociación"; }) },
        { titulo:"🟡 TIBIOS",    color:B.warm, leads: filt.filter(l => { const s = scoreLead(l).label; return s.includes("Tibio") && l.etapa !== "Negociación"; }) },
        { titulo:"⚪ FRÍOS",     color:B.dim,  leads: filt.filter(l => { const s = scoreLead(l).label; return s.includes("Frío"); }) },
      ].filter(g => g.leads.length > 0).map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:grupo.color, letterSpacing:"1.5px",
            marginBottom:8, paddingLeft:4 }}>
            {grupo.titulo} <span style={{ fontWeight:400, color:B.muted }}>({grupo.leads.length})</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {grupo.leads.map(lead => {
          const s    = scoreLead(lead);
          const ag   = AG[lead.ag];
          const ec   = ECOL[lead.etapa] || B.dim;
          const open = exp === lead.id;
          const isEd = editing === lead.id;
          const stars = Math.round((lead.prob || 0) / 20);
          const esInv = lead.op === "Inversión";
 
          return (
            <div key={lead.id} style={{ background:B.card,
              border:`1px solid ${open ? B.accent : B.border}`,
              borderLeft:`3px solid ${s.c}`,
              borderRadius:12, overflow:"hidden", transition:"border-color .15s" }}>
 
              {/* Cabecera */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
                cursor:"pointer" }} onClick={() => setExp(open ? null : lead.id)}>
 
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:B.text }}>{lead.nombre}</span>
                    {esInv && <span style={{ fontSize:11, padding:"1px 6px", borderRadius:10,
                      background:"#9B6DC822", color:"#9B6DC8", fontWeight:700 }}>💼 INV</span>}
                    {ag && <span style={{ fontSize:11, padding:"1px 5px", borderRadius:3,
                      background:ag.bg||"#4A6A90", color:ag.c, fontWeight:700 }}>{ag.n}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#8AAECC", display:"flex", gap:10, flexWrap:"wrap" }}>
                    {lead.zona && <span>📍 {lead.zona}</span>}
                    {lead.tipo && <span>{lead.tipo}</span>}
                    {lead.presup && <span style={{ color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>
                      USD {Number(lead.presup).toLocaleString()}
                    </span>}
                  </div>
                </div>
 
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                  <div style={{ display:"flex", gap:2 }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} onClick={e => { e.stopPropagation(); setScore(lead.id, n); }}
                        style={{ cursor:"pointer", fontSize:13, color:n<=stars?"#F4C642":B.dim }}>★</span>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4,
                      background:`${ec}18`, color:ec }}>{lead.etapa}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4,
                      background:s.bg, color:s.c }}>{s.label}</span>
                    <span style={{ fontSize:11, color:lead.dias>7?B.hot:lead.dias>3?B.warm:B.ok }}>
                      {lead.dias}d
                    </span>
                  </div>
                </div>
              </div>
 
              {/* Panel expandido */}
              {open && (
                <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${B.border}` }}>
                  {isEd ? (
                    <div style={{ paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:B.accentL }}>✏️ Editando</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        {[
                          ["NOMBRE","nombre","text"],["TELÉFONO","tel","text"],
                          ["ZONA","zona","text"],["PRESUPUESTO USD","presup","number"],
                          ["ORIGEN","origen","text"],["PRÓXIMA ACCIÓN","proxAccion","text"],
                        ].map(([label, key, type]) => (
                          <div key={key}>
                            <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>{label}</label>
                            <input type={type} value={editData[key]}
                              onChange={e => setEditData(d => ({...d, [key]:e.target.value}))} style={inp} />
                          </div>
                        ))}
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO OP.</label>
                          <select value={editData.op} onChange={e=>setEditData(d=>({...d,op:e.target.value}))} style={inp}>
                            {TIPOS_OP.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO PROP.</label>
                          <select value={editData.tipo} onChange={e=>setEditData(d=>({...d,tipo:e.target.value}))} style={inp}>
                            {TIPOS_PROP.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>NOTA</label>
                        <textarea value={editData.nota} onChange={e=>setEditData(d=>({...d,nota:e.target.value}))}
                          rows={3} style={{ ...inp, resize:"none" }} />
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => saveEdit(lead.id)} disabled={saving}
                          style={{ flex:1, padding:"8px", borderRadius:7, cursor:"pointer",
                            background:saving?B.border:B.accent, border:`1px solid ${saving?B.border:B.accentL}`,
                            color:saving?B.muted:"#fff", fontSize:12, fontWeight:700 }}>
                          {saving?"Guardando...":"✓ Guardar"}
                        </button>
                        <button onClick={() => setEditing(null)}
                          style={{ padding:"8px 14px", borderRadius:7, cursor:"pointer",
                            background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingTop:12 }}>
                      {/* Etapa selector */}
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                        <span style={{ fontSize:11, color:B.dim, alignSelf:"center" }}>ETAPA</span>
                        {ETAPAS.map(e => (
                          <button key={e} onClick={() => setEtapa(lead.id, e)}
                            style={{ padding:"3px 9px", borderRadius:12, cursor:"pointer", fontSize:12,
                              border:`1px solid ${lead.etapa===e?(ECOL[e]||B.dim):B.border}`,
                              background:lead.etapa===e?`${ECOL[e]||B.dim}22`:"transparent",
                              color:lead.etapa===e?(ECOL[e]||B.dim):B.muted, fontWeight:lead.etapa===e?700:400 }}>
                            {e}
                          </button>
                        ))}
                      </div>
 
                      {/* Agente selector */}
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                        <span style={{ fontSize:11, color:B.dim, alignSelf:"center" }}>AGENTE</span>
                        {Object.entries(AG).map(([k,v]) => (
                          <button key={k} onClick={() => setAgente(lead.id, k)}
                            style={{ padding:"3px 9px", borderRadius:12, cursor:"pointer", fontSize:12,
                              border:`1px solid ${lead.ag===k?v.c:B.border}`,
                              background:lead.ag===k?`${v.c}22`:"transparent",
                              color:lead.ag===k?v.c:B.muted, fontWeight:lead.ag===k?700:400 }}>
                            {v.n}
                          </button>
                        ))}
                      </div>
 
                      {/* Nota */}
                      {lead.nota && (
                        <div style={{ fontSize:11, color:B.dim, background:B.bg, borderRadius:6,
                          padding:"8px 10px", marginBottom:10, lineHeight:1.6,
                          whiteSpace:"pre-wrap", maxHeight:80, overflow:"auto" }}>
                          {lead.nota}
                        </div>
                      )}
 
                      {/* Nueva nota */}
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        <input placeholder="Nota rápida... (Enter para guardar)"
                          value={notaEdit[lead.id]||""}
                          onChange={e => setNotaEdit(p=>({...p,[lead.id]:e.target.value}))}
                          onKeyDown={e => e.key==="Enter" && guardarNota(lead)}
                          style={{ flex:1, background:B.bg, border:`1px solid ${B.border}`,
                            borderRadius:6, padding:"6px 10px", color:B.text, fontSize:11, outline:"none" }} />
                        <button onClick={() => guardarNota(lead)}
                          style={{ padding:"6px 12px", borderRadius:6, background:`${B.accentL}18`,
                            border:`1px solid ${B.accentL}40`, color:B.accentL, fontSize:11, cursor:"pointer" }}>
                          + Nota
                        </button>
                      </div>
 
                      {/* Propiedades compatibles */}
                      {(() => {
                        const matches = matchLeadProps(lead, properties || []);
                        if (!matches.length) return null;
                        return (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:11, color:"#8AAECC", letterSpacing:"1px", fontWeight:600, marginBottom:6 }}>
                              🏠 PROPIEDADES COMPATIBLES ({matches.length})
                            </div>
                            {matches.slice(0,3).map(prop => {
                              const msg = genMsgWhatsApp(lead, prop);
                              const wa = lead.tel
                                ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
                                : null;
                              return (
                                <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:8,
                                  background:B.bg, borderRadius:7, padding:"7px 10px", marginBottom:5 }}>
                                  <div style={{ flex:1, fontSize:11, color:B.muted }}>
                                    <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                                    {" · "}{prop.zona}
                                    {" · "}<span style={{ color:B.accentL }}>USD {(prop.precio||0).toLocaleString()}</span>
                                    {prop.dir && <span style={{ color:B.muted }}> · {prop.dir}</span>}
                                  </div>
                                  {wa && (
                                    <a href={wa} target="_blank" rel="noreferrer"
                                      style={{ padding:"3px 9px", borderRadius:6, whiteSpace:"nowrap",
                                        background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                        color:"#25D366", fontSize:12, textDecoration:"none", fontWeight:600 }}>
                                      💬 WA
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
 
                      {/* Acciones */}
                      <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                        <button onClick={() => contacteHoy(lead.id)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.ok}18`,
                            border:`1px solid ${B.ok}40`, color:B.ok, fontSize:12, cursor:"pointer", fontWeight:600 }}>
                          ✅ Contacté hoy
                        </button>
                        {lead.tel && (
                          <a href={`https://wa.me/${lead.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                            style={{ padding:"5px 12px", borderRadius:6, background:"rgba(37,211,102,0.1)",
                              border:"1px solid rgba(37,211,102,0.25)", color:"#25D366",
                              fontSize:12, textDecoration:"none", fontWeight:600 }}>
                            💬 WA
                          </a>
                        )}
                        {lead.tel && (
                          <a href={`tel:${lead.tel}`}
                            style={{ padding:"5px 12px", borderRadius:6, background:`${B.ok}18`,
                              border:`1px solid ${B.ok}40`, color:B.ok, fontSize:12, textDecoration:"none", fontWeight:600 }}>
                            📞 Llamar
                          </a>
                        )}
                        <button onClick={() => startEdit(lead)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.accentL}12`,
                            border:`1px solid ${B.accentL}30`, color:B.accentL, fontSize:12, cursor:"pointer", fontWeight:600 }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => {
                          const msg = genMsgBusqueda(lead);
                          navigator.clipboard.writeText(msg);
                          alert("✅ Copiado!\n\n" + msg.slice(0,150) + "...");
                        }}
                          style={{ padding:"5px 12px", borderRadius:6, background:"rgba(232,168,48,0.12)",
                            border:"1px solid rgba(232,168,48,0.3)", color:"#E8A830", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                          📋 Búsqueda WA
                        </button>
                        <button onClick={() => setConfirmDelete(lead)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.hot}12`,
                            border:`1px solid ${B.hot}30`, color:B.hot, fontSize:12, cursor:"pointer", fontWeight:600, marginLeft:"auto" }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      ))}
      {filt.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px", color:"#8AAECC", fontSize:13 }}>Sin resultados</div>
      )}
 
      {/* Modal eliminar */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.hot}50`, borderRadius:14,
            padding:"28px 32px", maxWidth:380, width:"90%", boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:22, marginBottom:12, textAlign:"center" }}>🗑</div>
            <div style={{ fontSize:15, fontWeight:700, color:B.text, fontFamily:"Georgia,serif",
              marginBottom:8, textAlign:"center" }}>¿Eliminar lead?</div>
            <div style={{ fontSize:13, color:"#8AAECC", textAlign:"center", marginBottom:24 }}>
              Vas a eliminar a <strong style={{ color:B.text }}>{confirmDelete.nombre}</strong>. No se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={ejecutarEliminar}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:B.hot, border:`1px solid ${B.hot}`, color:"#fff", fontSize:13, fontWeight:700 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
