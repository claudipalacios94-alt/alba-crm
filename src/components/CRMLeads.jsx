// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CRM LEADS v2
// Edición completa, último contacto, score manual, inversores
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead } from "../data/constants.js";
 
const TIPOS_OP = ["Compra","Alquiler","Inversión","Alquiler / Compra"];
const TIPOS_PROP = ["Depto","Casa","PH","Casa / PH","Dúplex","Local","Terreno","Otro"];
 
export default function CRMLeads({ leads, updateLead, deleteLead }) {
  const [fs, setFs]     = useState("Todos");
  const [fe, setFe]     = useState("Todas");
  const [fa, setFa]     = useState("Todos");
  const [fop, setFop]   = useState("Todos"); // Todos / Inversor / Comprador
  const [q,  setQ]      = useState("");
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [exp, setExp]   = useState(null);
  const [editE, setEditE] = useState(null);
  const [editing, setEditing] = useState(null); // id del lead en edición
  const [editData, setEditData] = useState({});
  const [notaEdit, setNotaEdit] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
 
  const filt = useMemo(() => leads.filter(l => {
    // Perdidos/Cerrados ocultos por defecto
    if (!mostrarPerdidos && (l.etapa === "Perdido" || l.etapa === "Cerrado")) return false;
    const s = scoreLead(l).label;
    if (fs === "Caliente" && !s.includes("Caliente")) return false;
    if (fs === "Tibio"    && !s.includes("Tibio"))    return false;
    if (fs === "Frío"     && !s.includes("Frío"))     return false;
    if (fe !== "Todas" && l.etapa !== fe) return false;
    if (fa === "Sin asignar" && l.ag)    return false;
    if (fa !== "Todos" && fa !== "Sin asignar" && l.ag !== fa) return false;
    if (fop === "Inversor"  && l.op !== "Inversión") return false;
    if (fop === "Comprador" && l.op === "Inversión") return false;
    if (q && !l.nombre?.toLowerCase().includes(q.toLowerCase())
          && !(l.zona || "").toLowerCase().includes(q.toLowerCase())
          && !(l.tel  || "").includes(q)) return false;
    return true;
  }), [leads, fs, fe, fa, fop, q, mostrarPerdidos]);
 
  const perdidosCount = leads.filter(l => l.etapa === "Perdido" || l.etapa === "Cerrado").length;
 
  async function setEtapa(id, etapa) {
    await updateLead(id, { etapa });
    setEditE(null);
  }
 
  async function setAgente(id, ag) {
    await updateLead(id, { ag });
    setEditE(null);
  }
 
  async function contacteHoy(lead) {
    const hoy = new Date().toISOString();
    await updateLead(lead.id, { updated_at: hoy });
    // Forzar recarga visual — dias se recalcula en el servidor
  }
 
  async function guardarNota(lead) {
    const nueva = (notaEdit[lead.id] || "").trim();
    if (!nueva) return;
    const ts = new Date().toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
    const notaFinal = `[${ts}] ${nueva}${lead.nota ? "\n" + lead.nota : ""}`;
    await updateLead(lead.id, { nota: notaFinal });
    setNotaEdit(p => ({ ...p, [lead.id]: "" }));
  }
 
  async function setScore(id, score) {
    await updateLead(id, { prob: score * 20 }); // 1★=20, 5★=100
  }
 
  function startEdit(lead) {
    setEditing(lead.id);
    setEditData({
      nombre:    lead.nombre    || "",
      tel:       lead.tel       || "",
      zona:      lead.zona      || "",
      presup:    lead.presup    || "",
      tipo:      lead.tipo      || "",
      op:        lead.op        || "",
      origen:    lead.origen    || "",
      proxAccion: lead.proxAccion || "",
      nota:      lead.nota      || "",
    });
  }
 
  async function saveEdit(id) {
    setSaving(true);
    try {
      await updateLead(id, {
        nombre:     editData.nombre,
        tel:        editData.tel,
        zona:       editData.zona,
        presup:     editData.presup ? Number(editData.presup) : null,
        tipo:       editData.tipo,
        op:         editData.op,
        origen:     editData.origen,
        proxaccion: editData.proxAccion,
        nota:       editData.nota,
      });
      setEditing(null);
    } catch(e) { console.error(e); }
    setSaving(false);
  }
 
  async function ejecutarEliminar() {
    if (!confirmDelete) return;
    try {
      await deleteLead(confirmDelete.id);
      setConfirmDelete(null);
      if (exp === confirmDelete.id) setExp(null);
    } catch (err) { console.error(err); }
  }
 
  const chip = (act, c) => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${act ? c : B.border}`,
    background: act ? `${c}22` : "transparent",
    color: act ? c : B.muted,
  });
 
  const inp = {
    width:"100%", background:B.bg, border:`1px solid ${B.border}`,
    borderRadius:6, padding:"6px 9px", color:B.text, fontSize:11,
    outline:"none", boxSizing:"border-box", fontFamily:"'Trebuchet MS',sans-serif",
  };
 
  return (
    <div>
      <div style={{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>CRM Leads</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{filt.length} de {leads.filter(l=>!mostrarPerdidos?(l.etapa!=="Perdido"&&l.etapa!=="Cerrado"):true).length} contactos</p>
        </div>
        <button onClick={() => setMostrarPerdidos(p => !p)}
          style={{ fontSize:10, color:mostrarPerdidos?B.hot:B.dim, cursor:"pointer",
            background:"transparent", border:`1px solid ${mostrarPerdidos?B.hot:B.border}`,
            borderRadius:6, padding:"4px 10px" }}>
          {mostrarPerdidos ? "Ocultar perdidos" : `Ver perdidos (${perdidosCount})`}
        </button>
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
            <button key={s} onClick={() => setFs(s)} style={chip(fs===s, s==="Caliente"?B.hot:s==="Tibio"?B.warm:s==="Frío"?B.muted:B.accentL)}>{s}</button>
          ))}
        </div>
 
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>ETAPA</span>
          {["Todas",...ETAPAS.filter(e=>e!=="Cerrado"&&e!=="Perdido")].map(e => (
            <button key={e} onClick={() => setFe(e)} style={chip(fe===e, ECOL[e]||B.accentL)}>{e}</button>
          ))}
        </div>
 
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>AGENTE</span>
          {["Todos","C","A","F","L","Sin asignar"].map(a => (
            <button key={a} onClick={() => setFa(a)} style={chip(fa===a, a==="Sin asignar"?B.hot:a!=="Todos"?AG[a]?.c:B.accentL)}>
              {a==="Todos"?"Todos":a==="Sin asignar"?"Sin asignar":AG[a]?.n}
            </button>
          ))}
        </div>
 
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          <span style={{ fontSize:9, color:B.dim, alignSelf:"center", marginRight:3 }}>PERFIL</span>
          {["Todos","Comprador","Inversor"].map(o => (
            <button key={o} onClick={() => setFop(o)} style={chip(fop===o, o==="Inversor"?"#9B6DC8":B.accentL)}>{o}</button>
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
          const isEd = editing === lead.id;
          const stars = Math.round((lead.prob || 0) / 20);
          const esInversor = lead.op === "Inversión";
 
          return (
            <div key={lead.id} style={{ background:B.card, border:`1px solid ${open?B.accent:B.border}`, borderRadius:10 }}>
 
              {/* Fila principal */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", cursor:"pointer", padding:"10px 13px" }}
                onClick={() => setExp(open ? null : lead.id)}>
                <span style={{ fontSize:11, color:B.dim, minWidth:24 }}>#{lead.id}</span>
                <span style={{ fontSize:12, fontWeight:500, color:B.text, flex:1, minWidth:100 }}>{lead.nombre}</span>
 
                {esInversor && (
                  <span style={{ fontSize:9, padding:"1px 6px", borderRadius:10,
                    background:"#9B6DC822", color:"#9B6DC8", fontWeight:700 }}>💼 INV</span>
                )}
 
                {/* Stars */}
                <div onClick={e => e.stopPropagation()} style={{ display:"flex", gap:1 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} onClick={() => setScore(lead.id, n)}
                      style={{ cursor:"pointer", fontSize:12, color:n<=stars?"#F4C642":B.dim }}>★</span>
                  ))}
                </div>
 
                {/* Agente */}
                <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                  <span onClick={() => setEditE(editE===`ag-${lead.id}`?null:`ag-${lead.id}`)}
                    style={{ fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
                      background:ag?ag.bg:"rgba(61,90,122,0.2)", color:ag?ag.c:B.muted, fontWeight:600 }}>
                    {ag?ag.n:"Sin asignar"} ▾
                  </span>
                  {editE===`ag-${lead.id}` && (
                    <div style={{ position:"absolute", top:"110%", left:0, zIndex:200,
                      background:"#0B1628", border:`1px solid ${B.border}`, borderRadius:8,
                      padding:4, minWidth:130, boxShadow:"0 8px 32px rgba(0,0,0,.7)" }}>
                      {[["","Sin asignar"],...Object.entries(AG).map(([k,v])=>[k,v.n])].map(([k,n]) => (
                        <div key={k} onClick={() => setAgente(lead.id, k)}
                          style={{ padding:"6px 10px", borderRadius:5, cursor:"pointer", fontSize:12,
                            color:lead.ag===k?(k?AG[k].c:B.accentL):B.muted,
                            background:lead.ag===k?`${k?AG[k]?.c||B.accentL:B.accentL}18`:"transparent" }}>{n}</div>
                      ))}
                    </div>
                  )}
                </div>
 
                {/* Etapa */}
                <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                  <span onClick={() => setEditE(editE===lead.id?null:lead.id)}
                    style={{ fontSize:11, padding:"3px 9px", borderRadius:4, cursor:"pointer",
                      background:`${ec}18`, color:ec, border:`1px solid ${ec}35` }}>
                    {lead.etapa} ▾
                  </span>
                  {editE===lead.id && (
                    <div style={{ position:"absolute", top:"110%", left:0, zIndex:200,
                      background:"#0B1628", border:`1px solid ${B.border}`, borderRadius:8,
                      padding:4, minWidth:150, boxShadow:"0 8px 32px rgba(0,0,0,.65)" }}>
                      {ETAPAS.map(e => (
                        <div key={e} onClick={() => setEtapa(lead.id, e)}
                          style={{ padding:"6px 10px", borderRadius:5, cursor:"pointer", fontSize:12,
                            color:lead.etapa===e?ECOL[e]:B.muted,
                            background:lead.etapa===e?`${ECOL[e]}15`:"transparent" }}>{e}</div>
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
                  {isEd ? (
                    /* ── MODO EDICIÓN ── */
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:B.accentL, marginBottom:4 }}>✏️ Editando lead</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>NOMBRE</label>
                          <input value={editData.nombre} onChange={e=>setEditData(d=>({...d,nombre:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>TELÉFONO</label>
                          <input value={editData.tel} onChange={e=>setEditData(d=>({...d,tel:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>ZONA</label>
                          <input value={editData.zona} onChange={e=>setEditData(d=>({...d,zona:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>PRESUPUESTO USD</label>
                          <input type="number" value={editData.presup} onChange={e=>setEditData(d=>({...d,presup:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>TIPO OPERACIÓN</label>
                          <select value={editData.op} onChange={e=>setEditData(d=>({...d,op:e.target.value}))} style={inp}>
                            {TIPOS_OP.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>TIPO PROPIEDAD</label>
                          <select value={editData.tipo} onChange={e=>setEditData(d=>({...d,tipo:e.target.value}))} style={inp}>
                            {TIPOS_PROP.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>ORIGEN</label>
                          <input value={editData.origen} onChange={e=>setEditData(d=>({...d,origen:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>PRÓXIMA ACCIÓN</label>
                          <input value={editData.proxAccion} onChange={e=>setEditData(d=>({...d,proxAccion:e.target.value}))} style={inp} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>NOTA</label>
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
                            background:"transparent", border:`1px solid ${B.border}`, color:B.muted, fontSize:12 }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── MODO VISTA ── */
                    <>
                      {/* Info rápida */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:10, fontSize:11, color:B.muted }}>
                        {lead.zona   && <span>📍 {lead.zona}</span>}
                        {lead.tipo   && <span>🏠 {lead.tipo}</span>}
                        {lead.op     && <span>🔑 {lead.op}</span>}
                        {lead.origen && <span>📣 {lead.origen}</span>}
                        {lead.tel    && <span>📞 {lead.tel}</span>}
                        {lead.dias !== undefined && <span style={{ color:lead.dias>7?B.hot:lead.dias>3?B.warm:B.ok }}>⏱ {lead.dias}d sin contacto</span>}
                      </div>
 
                      {/* Nota */}
                      {lead.nota && (
                        <div style={{ fontSize:11, color:B.dim, background:B.bg, borderRadius:6,
                          padding:"8px 10px", marginBottom:10, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                          {lead.nota}
                        </div>
                      )}
 
                      {/* Nueva nota */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <input placeholder="Agregar nota rápida..."
                            value={notaEdit[lead.id]||""}
                            onChange={e => setNotaEdit(p=>({...p,[lead.id]:e.target.value}))}
                            onKeyDown={e => e.key==="Enter" && guardarNota(lead)}
                            style={{ flex:1, background:B.bg, border:`1px solid ${B.border}`, borderRadius:6,
                              padding:"6px 10px", color:B.text, fontSize:11, outline:"none" }} />
                          <button onClick={() => guardarNota(lead)}
                            style={{ padding:"6px 12px", borderRadius:6, background:`${B.accentL}18`,
                              border:`1px solid ${B.accentL}40`, color:B.accentL, fontSize:11, cursor:"pointer" }}>
                            + Nota
                          </button>
                        </div>
                      </div>
 
                      {/* Acciones */}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {/* Contacté hoy */}
                        <button onClick={() => contacteHoy(lead)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.ok}18`,
                            border:`1px solid ${B.ok}40`, color:B.ok, fontSize:10, cursor:"pointer", fontWeight:600 }}>
                          ✅ Contacté hoy
                        </button>
 
                        {lead.tel && (
                          <a href={`tel:${lead.tel}`}
                            style={{ padding:"5px 12px", borderRadius:6, background:`${B.ok}18`,
                              border:`1px solid ${B.ok}40`, color:B.ok, fontSize:10, textDecoration:"none", fontWeight:600 }}>
                            📞 Llamar
                          </a>
                        )}
                        {lead.tel && (
                          <a href={`https://wa.me/${lead.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                            style={{ padding:"5px 12px", borderRadius:6, background:"rgba(37,211,102,0.1)",
                              border:"1px solid rgba(37,211,102,0.25)", color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                            💬 WhatsApp
                          </a>
                        )}
 
                        <button onClick={() => startEdit(lead)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.accentL}12`,
                            border:`1px solid ${B.accentL}30`, color:B.accentL, fontSize:10, cursor:"pointer", fontWeight:600 }}>
                          ✏️ Editar
                        </button>
 
                        <button onClick={() => setConfirmDelete(lead)}
                          style={{ padding:"5px 12px", borderRadius:6, background:`${B.hot}12`,
                            border:`1px solid ${B.hot}30`, color:B.hot, fontSize:10, cursor:"pointer", fontWeight:600, marginLeft:"auto" }}>
                          🗑 Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filt.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px", color:B.muted, fontSize:13 }}>Sin resultados</div>
        )}
      </div>
 
      {/* Modal confirmar eliminar */}
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
            <div style={{ fontSize:13, color:B.muted, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              Vas a eliminar a <strong style={{ color:B.text }}>{confirmDelete.nombre}</strong>. Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`, color:B.muted, fontSize:13 }}>
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
