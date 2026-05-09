// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRM LEADS (diseño card, filtros scoring/agente/perfil)
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, genMsgBusqueda, ETAPAS, ECOL, scoreLead, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
 
const TIPOS_OP   = ["Compra","Alquiler","Inversión","Alquiler / Compra"];
const TIPOS_PROP = ["Depto","Casa","PH","Casa / PH","Dúplex","Local","Terreno","Otro"];
 

const MOTIVOS_PERDIDA = [
  "Precio fuera de rango",
  "Compró con otra inmobiliaria",
  "Encontró propietario directo",
  "Cambió de zona",
  "Desistió de comprar",
  "Sin respuesta — lead frío",
  "Financiamiento rechazado",
  "Motivo desconocido",
];

function ModalPerdido({ lead, onConfirmar, onCancelar }) {
  const [motivo,  setMotivo]  = useState("");
  const [custom,  setCustom]  = useState("");
  const [saving,  setSaving]  = useState(false);

  async function confirmar() {
    const m = motivo === "Otro" ? custom.trim() : motivo;
    if (!m) return;
    setSaving(true);
    await onConfirmar(lead, m);
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onCancelar}>
      <div style={{ background:"#0F1E35", border:`1px solid ${B.hot}40`, borderRadius:14,
        padding:"24px 28px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontSize:14, fontWeight:700, color:B.text, marginBottom:4 }}>
          ¿Por qué se perdió este lead?
        </div>
        <div style={{ fontSize:12, color:"#8AAECC", marginBottom:18 }}>
          {lead.nombre} — {lead.zona} · USD {(lead.presup||0).toLocaleString()}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {MOTIVOS_PERDIDA.map(m => (
            <button key={m} onClick={() => setMotivo(m)}
              style={{ padding:"10px 14px", borderRadius:8, cursor:"pointer", textAlign:"left",
                background: motivo === m ? B.hot + "20" : "transparent",
                border: `1px solid ${motivo === m ? B.hot : B.border}`,
                color: motivo === m ? "#E86060" : "#8AAECC", fontSize:13 }}>
              {m}
            </button>
          ))}
          <button onClick={() => setMotivo("Otro")}
            style={{ padding:"10px 14px", borderRadius:8, cursor:"pointer", textAlign:"left",
              background: motivo === "Otro" ? B.hot + "20" : "transparent",
              border: `1px solid ${motivo === "Otro" ? B.hot : B.border}`,
              color: motivo === "Otro" ? "#E86060" : "#8AAECC", fontSize:13 }}>
            Otro motivo...
          </button>
          {motivo === "Otro" && (
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Describí el motivo"
              style={{ padding:"9px 12px", borderRadius:8, background:B.card,
                border:`1px solid ${B.border}`, color:B.text, fontSize:13, outline:"none" }} />
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancelar}
            style={{ flex:1, padding:"10px", borderRadius:8, cursor:"pointer",
              background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:13 }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!motivo || (motivo === "Otro" && !custom.trim()) || saving}
            style={{ flex:1, padding:"10px", borderRadius:8, cursor:"pointer",
              background: motivo ? B.hot : B.border,
              border:`1px solid ${motivo ? B.hot : B.border}`,
              color: motivo ? "#fff" : "#8AAECC", fontSize:13, fontWeight:700 }}>
            {saving ? "Guardando..." : "Marcar como perdido"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CRMLeads({ leads, updateLead, deleteLead, properties }) {
  const [fs,  setFs]  = useState("Todos");
  const [fa,  setFa]  = useState("Todos");
  const [fop, setFop] = useState("Todos");
  const [q,   setQ]   = useState("");
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [modalPerdido,   setModalPerdido]   = useState(null); // lead a marcar como perdido
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
 
  async function setEtapa(id, etapa) {
    if (etapa === "Perdido") {
      const lead = leads.find(l => l.id === id);
      setModalPerdido(lead);
      setEditE(null);
      return;
    }
    await updateLead(id, { etapa });
    setEditE(null);
  }

  async function confirmarPerdido(lead, motivo) {
    await updateLead(lead.id, { etapa: "Perdido", motivo_perdida: motivo });
    setModalPerdido(null);
  }
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
      cochera: lead.cochera || "", patio: lead.patio || "", credito: lead.credito || "",
      balcon: lead.balcon || "", ambientes: lead.ambientes || "", m2min: lead.m2min || "",
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
        cochera: editData.cochera || null,
        patio:   editData.patio   || null,
        credito: editData.credito || null,
        balcon:  editData.balcon  || null,
        ambientes: editData.ambientes || null,
        m2min: editData.m2min ? Number(editData.m2min) : null,
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
                      {/* Características */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>COCHERA</label>
                          <select value={editData.cochera||""} onChange={e=>setEditData(d=>({...d,cochera:e.target.value}))} style={inp}>
                            <option value="">Indistinto</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>PATIO</label>
                          <select value={editData.patio||""} onChange={e=>setEditData(d=>({...d,patio:e.target.value}))} style={inp}>
                            <option value="">Indistinto</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>CRÉDITO</label>
                          <select value={editData.credito||""} onChange={e=>setEditData(d=>({...d,credito:e.target.value}))} style={inp}>
                            <option value="">Sin info</option>
                            <option value="si">Aprobado</option>
                            <option value="no">No tiene</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>AMBIENTES</label>
                          <input value={editData.ambientes||""} onChange={e=>setEditData(d=>({...d,ambientes:e.target.value}))} style={inp} placeholder="ej: 2" />
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>M² MÍN.</label>
                          <input type="number" value={editData.m2min||""} onChange={e=>setEditData(d=>({...d,m2min:e.target.value}))} style={inp} placeholder="ej: 50" />
                        </div>
                        <div>
                          <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>BALCÓN</label>
                          <select value={editData.balcon||""} onChange={e=>setEditData(d=>({...d,balcon:e.target.value}))} style={inp}>
                            <option value="">Indistinto</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
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
 
                      {/* Características del lead — badges visuales */}
                      {(() => {
                        const tags = [
                          lead.credito === "si"  && { label:"✅ Crédito aprobado", color:"#2E9E6A" },
                          lead.cochera === "si"  && { label:"🚗 Con cochera",       color:"#4A8ABE" },
                          lead.cochera === "no"  && { label:"❌ Sin cochera",        color:"#8AAECC" },
                          lead.patio   === "si"  && { label:"🌿 Con patio",          color:"#4A8ABE" },
                          lead.balcon  === "si"  && { label:"🏙 Con balcón",         color:"#4A8ABE" },
                          lead.ambientes         && { label:`${lead.ambientes} amb.`, color:"#8AAECC" },
                          lead.m2min             && { label:`Mín. ${lead.m2min}m²`,  color:"#8AAECC" },
                          lead.op === "Inversor" && { label:"📈 Inversor",           color:"#E8A830" },
                        ].filter(Boolean);
                        if (!tags.length) return null;
                        return (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                            {tags.map((tag, i) => (
                              <span key={i} style={{ fontSize:11, padding:"3px 9px", borderRadius:10,
                                background: tag.color + "18", color: tag.color,
                                border:`1px solid ${tag.color}40`, fontWeight:500 }}>
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

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
                          const msg = lead.msg_busqueda || genMsgBusqueda(lead);
                          const modal = document.createElement("div");
                          modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
                          const turno = new Date().getHours() < 14 ? "manana" : "tarde";
                          modal.innerHTML = `<div style="background:#0F1E35;border:1px solid #2A5BA830;border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.85)">
                            <div style="font-size:11px;color:#8AAECC;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">📋 MENSAJE BÚSQUEDA — editá y se guarda para la próxima</div>
                            <textarea id="busqueda-txt" style="width:100%;height:200px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#E8F0FA;font-size:13px;line-height:1.7;resize:vertical;outline:none;font-family:inherit;box-sizing:border-box">${msg}</textarea>
                            <div style="display:flex;gap:8px;margin-top:12px">
                              <button id="busqueda-copy" style="flex:1;padding:10px;border-radius:8px;background:#E8A830;border:none;color:#0F1E35;font-size:13px;font-weight:700;cursor:pointer">Copiar y guardar</button>
                              <button id="busqueda-reset" style="padding:10px 12px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:12px;cursor:pointer" title="Regenerar desde datos del lead">↺</button>
                              <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 16px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:13px;cursor:pointer">Cancelar</button>
                            </div>
                          </div>`;
                          document.body.appendChild(modal);
                          modal.onclick = e => { if(e.target === modal) modal.remove(); };
                          modal.querySelector("#busqueda-copy").onclick = () => {
                            const txt = modal.querySelector("#busqueda-txt").value;
                            const hoy = new Date().toISOString().slice(0,10);
                            const updates = { msg_busqueda: txt };
                            updates[`enviado_${turno}`] = hoy;
                            navigator.clipboard.writeText(txt).then(() => {
                              updateLead(lead.id, updates);
                              modal.remove();
                            });
                          };
                          modal.querySelector("#busqueda-reset").onclick = () => {
                            modal.querySelector("#busqueda-txt").value = genMsgBusqueda(lead);
                          };
                        }}
                          style={{ padding:"5px 12px", borderRadius:6, background:"rgba(232,168,48,0.12)",
                            border:"1px solid rgba(232,168,48,0.3)", color:"#E8A830", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                          📋 Búsqueda WA
                        </button>
                        {/* Ticks mañana / tarde */}
                        {(() => {
                          const hoy = new Date().toISOString().slice(0,10);
                          const okM = lead.enviado_manana === hoy;
                          const okT = lead.enviado_tarde  === hoy;
                          return (
                            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                              <button onClick={() => updateLead(lead.id, { enviado_manana: okM ? null : hoy })}
                                title={okM ? "Mañana: enviado ✓" : "Mañana: no enviado"}
                                style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
                                  background: okM ? "rgba(204,34,51,0.2)" : "transparent",
                                  border: `1px solid ${okM ? "#CC2233" : B.border}`,
                                  color: okM ? "#CC2233" : "#4A6A90",
                                  fontWeight: 700 }}>
                                {okM ? "☀✓" : "☀"}
                              </button>
                              <button onClick={() => updateLead(lead.id, { enviado_tarde: okT ? null : hoy })}
                                title={okT ? "Tarde: enviado ✓" : "Tarde: no enviado"}
                                style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
                                  background: okT ? "rgba(204,34,51,0.2)" : "transparent",
                                  border: `1px solid ${okT ? "#CC2233" : B.border}`,
                                  color: okT ? "#CC2233" : "#4A6A90",
                                  fontWeight: 700 }}>
                                {okT ? "🌙✓" : "🌙"}
                              </button>
                            </div>
                          );
                        })()}
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

      {/* Modal — Motivo de pérdida */}
      {modalPerdido && (
        <ModalPerdido lead={modalPerdido} onConfirmar={confirmarPerdido} onCancelar={() => setModalPerdido(null)} />
      )}
    </div>
  );
}
