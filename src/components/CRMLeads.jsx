// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRM LEADS (diseño card, filtros scoring/agente/perfil)
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { B, AG, genMsgBusqueda, ETAPAS, ECOL, scoreLead, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
import { BuscadorPanel } from "./Buscador.jsx";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}
 
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
 
function InversorNota({ lead, onGuardar }) {
  const [editando, setEditando] = React.useState(false);
  const [val, setVal] = React.useState(lead.nota_inversor || "");
 
  async function guardar() {
    await onGuardar(lead, val);
    setEditando(false);
  }
 
  if (editando) return (
    <div style={{ display:"flex", gap:4, flex:1 }}>
      <input value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") guardar(); if(e.key==="Escape") setEditando(false); }}
        placeholder="ej: busca renta 6%, quiere 2 unidades..."
        autoFocus
        style={{ flex:1, background:"rgba(10,21,37,0.6)", border:"1px solid #9B6DC8", borderRadius:5,
          padding:"3px 8px", color:"#C8D8E8", fontSize:11, outline:"none" }} />
      <button onClick={guardar}
        style={{ padding:"3px 8px", borderRadius:5, cursor:"pointer",
          background:"#9B6DC8", border:"none", color:"#fff", fontSize:10, fontWeight:700 }}>OK</button>
    </div>
  );
 
  return (
    <div onClick={()=>setEditando(true)} style={{ flex:1, cursor:"pointer" }}>
      {lead.nota_inversor
        ? <span style={{ fontSize:11, color:"#C8A8E8", fontStyle:"italic" }}>{lead.nota_inversor}</span>
        : <span style={{ fontSize:10, color:"#6A4A90" }}>+ agregar nota</span>}
    </div>
  );
}
 
export default function CRMLeads({ leads, updateLead, deleteLead, properties, captaciones, supabase }) {
  const mobile = useIsMobile(768);
  const [pagina, setPagina] = useState("compradores");
  const [fs,  setFs]  = useState("Todos");
  const [fa,  setFa]  = useState("Todos");
  const [fop, setFop] = useState("Todos");
  const [q,   setQ]   = useState("");
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [mostrados,      setMostrados]      = useState(new Set());
  const [buscandoId,     setBuscandoId]     = useState(null);
  const [matchesVistos,  setMatchesVistos]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("alba_matches_vistos")||"[]")); } catch(e) { return new Set(); }
  });
 
  React.useEffect(() => {
    if (!supabase) return;
    supabase.from("matches_mostrados").select("lead_id,prop_id")
      .then(({ data }) => {
        if (data) setMostrados(new Set(data.map(r => `${r.lead_id}-${r.prop_id}`)));
      });
  }, []);
 
  async function toggleMostrado(leadId, propId) {
    const key = `${leadId}-${propId}`;
    if (mostrados.has(key)) {
      await supabase.from("matches_mostrados").delete().match({ lead_id: leadId, prop_id: propId });
      setMostrados(prev => { const s = new Set(prev); s.delete(key); return s; });
    } else {
      await supabase.from("matches_mostrados").insert([{ lead_id: leadId, prop_id: propId }]);
      setMostrados(prev => new Set([...prev, key]));
    }
  }
 
  const [modalPerdido,   setModalPerdido]   = useState(null);
  const [showMail,       setShowMail]       = useState(false);
  const [mailCopiado,    setMailCopiado]    = useState(false);
  const [exp,     setExp]     = useState(null);
  const [editE,   setEditE]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [notaEdit, setNotaEdit] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
 
  const filtBase = useMemo(() => leads.filter(l => {
    if (!mostrarPerdidos && (l.etapa === "Perdido" || l.etapa === "Cerrado")) return false;
    const s = scoreLead(l).label;
    if (fs === "Caliente" && !s.includes("Caliente")) return false;
    if (fs === "Tibio"    && !s.includes("Tibio"))    return false;
    if (fs === "Frío"     && !s.includes("Frío"))     return false;
    if (fa === "Sin asignar" && l.ag) return false;
    if (fa !== "Todos" && fa !== "Sin asignar" && l.ag !== fa) return false;
    if (q && !l.nombre?.toLowerCase().includes(q.toLowerCase())
          && !(l.zona||"").toLowerCase().includes(q.toLowerCase())
          && !(l.tel||"").includes(q)) return false;
    return true;
  }).sort((a, b) => a.dias - b.dias), [leads, fs, fa, q, mostrarPerdidos]);
 
  const filt = useMemo(() => filtBase.filter(l => !l.inversor), [filtBase]);
  const filtInversores = useMemo(() => filtBase.filter(l => !!l.inversor), [filtBase]);
 
  const todasProps = useMemo(() => {
    const capsNorm = (captaciones||[]).map(c => ({
      id:"cap-"+c.id, tipo:c.tipo, zona:c.zona, precio:c.precio,
      dir:c.direccion, caracts:c.caracts, activa:true,
      _esCaptacion:true, _tipoCap:c.tipo_captacion,
    }));
    return [...(properties||[]), ...capsNorm];
  }, [properties, captaciones]);
 
  const matchesNuevos = useMemo(() => {
    let count = 0;
    [...filt, ...filtInversores].forEach(l => {
      const m = matchLeadProps(l, todasProps);
      m.forEach(p => { if (!matchesVistos.has(`${l.id}-${p.id}`)) count++; });
    });
    return count;
  }, [filt, filtInversores, todasProps, matchesVistos]);
 
  function marcarMatchesVistos() {
    const nuevos = new Set(matchesVistos);
    [...filt, ...filtInversores].forEach(l => {
      matchLeadProps(l, todasProps).forEach(p => nuevos.add(`${l.id}-${p.id}`));
    });
    setMatchesVistos(nuevos);
    localStorage.setItem("alba_matches_vistos", JSON.stringify([...nuevos]));
  }
 
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
 
  async function setAgente(id, ag)   { await updateLead(id, { ag }); setEditE(null); }
  async function contacteHoy(id) { await updateLead(id, { last_contact_at: new Date().toISOString() }); }
 
  async function toggleInversor(lead) {
    await updateLead(lead.id, { inversor: !lead.inversor });
  }
 
  async function guardarNotaInversor(lead, nota) {
    await updateLead(lead.id, { nota_inversor: nota });
  }
 
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
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.presup && l.zona).sort((a,b) => a.dias - b.dias);
 
  function generarMail() {
    const cal = activos.filter(l => l.dias <= 2);
    const tib = activos.filter(l => l.dias > 2 && l.dias <= 7);
    function fmt(l) {
      const precio = l.presup ? `USD ${l.presup.toLocaleString()}` : "presupuesto a consultar";
      const partes = [l.tipo, l.zona && `en ${l.zona}`, precio].filter(Boolean).join(", ");
      const extras = [l.credito==="si"&&"crédito aprobado", l.cochera==="si"&&"con cochera", l.patio==="si"&&"con patio", l.ambientes&&`${l.ambientes} amb`].filter(Boolean).join(" · ");
      return `• ${partes}${extras ? ` — ${extras}` : ""}`;
    }
    let mail = `Buenos días colegas,\n\nLes comparto mis pedidos activos de Alba Inversiones:\n`;
    if (cal.length > 0) { mail += `\n🔴 URGENTES\n`; mail += cal.map(fmt).join("\n"); }
    if (tib.length > 0) { mail += `\n\n🟡 EN BÚSQUEDA\n`; mail += tib.map(fmt).join("\n"); }
    mail += `\n\nCualquier opción que encaje, me avisan.\n\nSaludos,\nAlba Inversiones · Reg. 3832`;
    return mail;
  }
 
  function copiarMail() {
    navigator.clipboard.writeText(generarMail());
    setMailCopiado(true);
    setTimeout(() => setMailCopiado(false), 2000);
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
 
  const leadsActivos = pagina === "compradores" ? filt : filtInversores;
 
  return (
    <div style={{ maxWidth: mobile ? "100%" : 800 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: mobile ? 12 : 16, flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 8 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h1 style={{ fontSize: mobile ? 18 : 20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>CRM Leads</h1>
          {matchesNuevos > 0 && (
            <button onClick={marcarMatchesVistos}
              style={{ display:"flex", alignItems:"center", gap:4, padding: mobile ? "6px 12px" : "4px 10px", borderRadius:8,
                background:"rgba(232,168,48,0.15)", border:"1px solid rgba(232,168,48,0.4)",
                color:"#E8A830", fontSize: mobile ? 12 : 11, fontWeight:700, cursor:"pointer" }}>
              🔔 {matchesNuevos} match{matchesNuevos>1?"es":""} nuevo{matchesNuevos>1?"s":""}
            </button>
          )}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => setShowMail(m => !m)}
            style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:8, cursor:"pointer", fontSize: mobile ? 13 : 12, fontWeight:600,
              background: showMail ? B.accent : "rgba(42,91,173,0.12)",
              border:`1px solid ${showMail ? B.accentL : B.border}`,
              color: showMail ? "#fff" : B.accentL }}>
            ✉ Mail pedidos
          </button>
          <button onClick={() => setMostrarPerdidos(p => !p)}
            style={{ fontSize: mobile ? 13 : 12, color:mostrarPerdidos?B.hot:B.dim, cursor:"pointer",
              background:"transparent", border:`1px solid ${mostrarPerdidos?B.hot:B.border}`,
              borderRadius:6, padding: mobile ? "6px 12px" : "4px 10px" }}>
            {mostrarPerdidos ? "Ocultar archivados" : `Archivados (${perdidosCount})`}
          </button>
        </div>
      </div>
 
      {/* Panel mail */}
      {showMail && (
        <div style={{ background:"rgba(10,21,37,0.95)", border:`1px solid ${B.accentL}40`, borderRadius:12, overflow:"hidden", marginBottom: mobile ? 12 : 14 }}>
          <div style={{ padding: mobile ? "12px 14px" : "10px 16px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 8 : 0 }}>
            <span style={{ fontSize: mobile ? 12 : 11, fontWeight:700, color:B.accentL }}>✉ MAIL DE PEDIDOS — {activos.filter(l=>l.dias<=7).length} búsquedas activas</span>
            <div style={{ display:"flex", gap: mobile ? 8 : 6 }}>
              <button onClick={copiarMail}
                style={{ padding: mobile ? "6px 14px" : "4px 12px", borderRadius:7, cursor:"pointer",
                  background: mailCopiado ? "#2E9E6A" : B.accent, border:"none", color:"#fff", fontSize: mobile ? 12 : 11, fontWeight:700 }}>
                {mailCopiado ? "✓ Copiado" : "Copiar"}
              </button>
              <a href={`mailto:?subject=Pedidos%20Alba%20Inversiones&body=${encodeURIComponent(generarMail())}`}
                style={{ padding: mobile ? "6px 14px" : "4px 12px", borderRadius:7, background:"transparent", border:`1px solid ${B.border}`,
                  color:"#8AAECC", fontSize: mobile ? 12 : 11, fontWeight:600, textDecoration:"none" }}>
                Abrir en mail
              </a>
            </div>
          </div>
          <pre style={{ margin:0, padding: mobile ? "14px" : "12px 16px", fontSize: mobile ? 13 : 12, color:"#C8D8E8", lineHeight:1.7,
            whiteSpace:"pre-wrap", fontFamily:"-apple-system,sans-serif", maxHeight:320, overflowY:"auto" }}>
            {generarMail()}
          </pre>
        </div>
      )}
 
      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:B.card, borderRadius:10, padding:4,
        border:`1px solid ${B.border}`, marginBottom: mobile ? 12 : 14, width: mobile ? "100%" : "fit-content" }}>
        {[
          { id:"compradores", label:`🏠 Compradores`, count:filt.length },
          { id:"inversores",  label:`💼 Inversores`,  count:filtInversores.length, color:"#9B6DC8" },
        ].map(t => (
          <button key={t.id} onClick={()=>setPagina(t.id)}
            style={{ flex: mobile ? 1 : "none", padding: mobile ? "8px 16px" : "6px 16px", borderRadius:7, cursor:"pointer", fontSize: mobile ? 13 : 12, fontWeight:600, border:"none",
              background: pagina===t.id ? (t.color||B.accent) : "transparent",
              color: pagina===t.id ? "#fff" : "#8AAECC" }}>
            {t.label} <span style={{ opacity:0.7, fontSize: mobile ? 11 : 10 }}>({t.count})</span>
          </button>
        ))}
      </div>
 
      {/* Filtros */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12,
        padding: mobile ? "12px 14px" : "14px 16px", marginBottom: mobile ? 12 : 16 }}>
        <input placeholder="Buscar nombre, zona o teléfono..."
          value={q} onChange={e => setQ(e.target.value)}
          style={{ width:"100%", background:"transparent", border:`1px solid ${B.border}`,
            borderRadius:8, padding: mobile ? "10px 12px" : "8px 12px", color:B.text, fontSize: mobile ? 13 : 12,
            marginBottom:10, outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 10 : 12, flexDirection: mobile ? "column" : "row" }}>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>TEMP</span>
            {["Todos","Caliente","Tibio","Frío"].map(s => (
              <button key={s} onClick={() => setFs(s)}
                style={{...chip(fs===s, s==="Caliente"?B.hot:s==="Tibio"?B.warm:B.muted), padding: mobile ? "6px 12px" : "4px 11px", fontSize: mobile ? 12 : 11}}>{s}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>AGENTE</span>
            {["Todos","C","A","F","L","Sin asignar"].map(a => (
              <button key={a} onClick={() => setFa(a)}
                style={{...chip(fa===a, a==="Sin asignar"?B.hot:a!=="Todos"?AG[a]?.c:B.accentL), padding: mobile ? "6px 12px" : "4px 11px", fontSize: mobile ? 12 : 11}}>
                {a==="Todos"?"Todos":a==="Sin asignar"?"—":AG[a]?.n}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>PERFIL</span>
            {["Todos","Comprador","Inversor"].map(o => (
              <button key={o} onClick={() => setFop(o)}
                style={{...chip(fop===o, o==="Inversor"?"#9B6DC8":B.accentL), padding: mobile ? "6px 12px" : "4px 11px", fontSize: mobile ? 12 : 11}}>{o}</button>
            ))}
          </div>
        </div>
      </div>
 
      {/* Cards */}
      {[
        { titulo:"🔴 CALIENTES", color:B.hot,  leads: leadsActivos.filter(l => { const s = scoreLead(l).label; return s.includes("Caliente") || l.etapa === "Negociación"; }) },
        { titulo:"🟡 TIBIOS",    color:B.warm, leads: leadsActivos.filter(l => { const s = scoreLead(l).label; return s.includes("Tibio") && l.etapa !== "Negociación"; }) },
        { titulo:"⚪ FRÍOS",     color:B.dim,  leads: leadsActivos.filter(l => { const s = scoreLead(l).label; return s.includes("Frío"); }) },
      ].filter(g => g.leads.length > 0).map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: mobile ? 14 : 16 }}>
          <div style={{ fontSize: mobile ? 12 : 11, fontWeight:700, color:grupo.color, letterSpacing:"1.5px",
            marginBottom: mobile ? 10 : 8, paddingLeft:4 }}>
            {grupo.titulo} <span style={{ fontWeight:400, color:B.muted }}>({grupo.leads.length})</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 10 : 8 }}>
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
                  <div style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 10, padding: mobile ? "14px 16px" : "12px 16px",
                    cursor:"pointer", flexWrap: mobile ? "wrap" : "nowrap" }} onClick={() => setExp(open ? null : lead.id)}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                        <span style={{ fontSize: mobile ? 14 : 13, fontWeight:700, color:B.text }}>{lead.nombre}</span>
                        {esInv && <span style={{ fontSize: mobile ? 12 : 11, padding:"1px 6px", borderRadius:10,
                          background:"#9B6DC822", color:"#9B6DC8", fontWeight:700 }}>💼 INV</span>}
                        {ag && <span style={{ fontSize: mobile ? 12 : 11, padding:"1px 5px", borderRadius:3,
                          background:ag.bg||"#4A6A90", color:ag.c, fontWeight:700 }}>{ag.n}</span>}
                      </div>
                      <div style={{ fontSize: mobile ? 13 : 12, color:"#8AAECC", display:"flex", gap:10, flexWrap:"wrap" }}>
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
                            style={{ cursor:"pointer", fontSize: mobile ? 15 : 13, color:n<=stars?"#F4C642":B.dim }}>★</span>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                        <span style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "3px 9px" : "2px 8px", borderRadius:4,
                          background:`${ec}18`, color:ec }}>{lead.etapa}</span>
                        <span style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "3px 9px" : "2px 8px", borderRadius:4,
                          background:s.bg, color:s.c }}>{s.label}</span>
                        <span style={{ fontSize: mobile ? 12 : 11, color:lead.dias>7?B.hot:lead.dias>3?B.warm:B.ok }}>
                          {lead.dias}d
                        </span>
                      </div>
                    </div>
                  </div>
 
                  {/* Panel expandido */}
                  {open && (
                    <div style={{ padding: mobile ? "0 14px 14px" : "0 16px 16px", borderTop:`1px solid ${B.border}` }}>
                      {isEd ? (
                        <div style={{ paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:B.accentL }}>✏️ Editando</div>
                          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:8 }}>
                            {[
                              ["NOMBRE","nombre","text"],["TELÉFONO","tel","text"],
                              ["ZONA","zona","text"],["PRESUPUESTO USD","presup","number"],
                              ["ORIGEN","origen","text"],["PRÓXIMA ACCIÓN","proxAccion","text"],
                            ].map(([label, key, type]) => (
                              <div key={key}>
                                <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>{label}</label>
                                <input type={type} value={editData[key]}
                                  onChange={e => setEditData(d => ({...d, [key]:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}} />
                              </div>
                            ))}
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO OP.</label>
                              <select value={editData.op} onChange={e=>setEditData(d=>({...d,op:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                {TIPOS_OP.map(t=><option key={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO PROP.</label>
                              <select value={editData.tipo} onChange={e=>setEditData(d=>({...d,tipo:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                {TIPOS_PROP.map(t=><option key={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>NOTA</label>
                            <textarea value={editData.nota} onChange={e=>setEditData(d=>({...d,nota:e.target.value}))}
                              rows={3} style={{ ...inp, resize:"none", padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11 }} />
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap:6 }}>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>COCHERA</label>
                              <select value={editData.cochera||""} onChange={e=>setEditData(d=>({...d,cochera:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                <option value="">Indistinto</option><option value="si">Sí</option><option value="no">No</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>PATIO</label>
                              <select value={editData.patio||""} onChange={e=>setEditData(d=>({...d,patio:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                <option value="">Indistinto</option><option value="si">Sí</option><option value="no">No</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>CRÉDITO</label>
                              <select value={editData.credito||""} onChange={e=>setEditData(d=>({...d,credito:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                <option value="">Sin info</option><option value="si">Aprobado</option><option value="no">No tiene</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>AMBIENTES</label>
                              <input value={editData.ambientes||""} onChange={e=>setEditData(d=>({...d,ambientes:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}} placeholder="ej: 2" />
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>M² MÍN.</label>
                              <input type="number" value={editData.m2min||""} onChange={e=>setEditData(d=>({...d,m2min:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}} placeholder="ej: 50" />
                            </div>
                            <div>
                              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>BALCÓN</label>
                              <select value={editData.balcon||""} onChange={e=>setEditData(d=>({...d,balcon:e.target.value}))} style={{...inp, padding: mobile ? "8px 10px" : "6px 9px", fontSize: mobile ? 13 : 11}}>
                                <option value="">Indistinto</option><option value="si">Sí</option><option value="no">No</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap: mobile ? 10 : 8 }}>
                            <button onClick={() => saveEdit(lead.id)} disabled={saving}
                              style={{ flex:1, padding: mobile ? "10px" : "8px", borderRadius:7, cursor:"pointer",
                                background:saving?B.border:B.accent, border:`1px solid ${saving?B.border:B.accentL}`,
                                color:saving?B.muted:"#fff", fontSize: mobile ? 13 : 12, fontWeight:700 }}>
                              {saving?"Guardando...":"✓ Guardar"}
                            </button>
                            <button onClick={() => setEditing(null)}
                              style={{ padding: mobile ? "10px 16px" : "8px 14px", borderRadius:7, cursor:"pointer",
                                background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize: mobile ? 13 : 12 }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ paddingTop:12 }}>
                          {/* Etapa */}
                          <div style={{ display:"flex", gap: mobile ? 6 : 5, flexWrap:"wrap", marginBottom: mobile ? 12 : 10 }}>
                            <span style={{ fontSize: mobile ? 12 : 11, color:B.dim, alignSelf:"center" }}>ETAPA</span>
                            {ETAPAS.map(e => (
                              <button key={e} onClick={() => setEtapa(lead.id, e)}
                                style={{ padding: mobile ? "5px 11px" : "3px 9px", borderRadius:12, cursor:"pointer", fontSize: mobile ? 13 : 12,
                                  border:`1px solid ${lead.etapa===e?(ECOL[e]||B.dim):B.border}`,
                                  background:lead.etapa===e?`${ECOL[e]||B.dim}22`:"transparent",
                                  color:lead.etapa===e?(ECOL[e]||B.dim):B.muted, fontWeight:lead.etapa===e?700:400 }}>
                                {e}
                              </button>
                            ))}
                          </div>
 
                          {/* Agente */}
                          <div style={{ display:"flex", gap: mobile ? 6 : 5, flexWrap:"wrap", marginBottom: mobile ? 12 : 10 }}>
                            <span style={{ fontSize: mobile ? 12 : 11, color:B.dim, alignSelf:"center" }}>AGENTE</span>
                            {Object.entries(AG).map(([k,v]) => (
                              <button key={k} onClick={() => setAgente(lead.id, k)}
                                style={{ padding: mobile ? "5px 11px" : "3px 9px", borderRadius:12, cursor:"pointer", fontSize: mobile ? 13 : 12,
                                  border:`1px solid ${lead.ag===k?v.c:B.border}`,
                                  background:lead.ag===k?`${v.c}22`:"transparent",
                                  color:lead.ag===k?v.c:B.muted, fontWeight:lead.ag===k?700:400 }}>
                                {v.n}
                              </button>
                            ))}
                          </div>
 
                          {/* Tags características */}
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
                              <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 6 : 5, marginBottom: mobile ? 12 : 10 }}>
                                {tags.map((tag, i) => (
                                  <span key={i} style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "4px 10px" : "3px 9px", borderRadius:10,
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
                            <div style={{ fontSize: mobile ? 12 : 11, color:B.dim, background:B.bg, borderRadius:6,
                              padding: mobile ? "10px 12px" : "8px 10px", marginBottom: mobile ? 12 : 10, lineHeight:1.6,
                              whiteSpace:"pre-wrap", maxHeight:80, overflow:"auto" }}>
                              {lead.nota}
                            </div>
                          )}
 
                          {/* Nueva nota */}
                          <div style={{ display:"flex", gap: mobile ? 8 : 6, marginBottom: mobile ? 12 : 10, flexDirection: mobile ? "column" : "row" }}>
                            <input placeholder="Nota rápida... (Enter para guardar)"
                              value={notaEdit[lead.id]||""}
                              onChange={e => setNotaEdit(p=>({...p,[lead.id]:e.target.value}))}
                              onKeyDown={e => e.key==="Enter" && guardarNota(lead)}
                              style={{ flex:1, background:B.bg, border:`1px solid ${B.border}`,
                                borderRadius:6, padding: mobile ? "8px 12px" : "6px 10px", color:B.text, fontSize: mobile ? 13 : 11, outline:"none" }} />
                            <button onClick={() => guardarNota(lead)}
                              style={{ padding: mobile ? "8px 14px" : "6px 12px", borderRadius:6, background:`${B.accentL}18`,
                                border:`1px solid ${B.accentL}40`, color:B.accentL, fontSize: mobile ? 13 : 11, cursor:"pointer" }}>
                              + Nota
                            </button>
                          </div>
 
                          {/* Propiedades compatibles */}
                          {(() => {
                            const capsNorm = (captaciones||[]).map(c => ({
                              id: "cap-"+c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
                              dir: c.direccion, caracts: c.caracts, activa: true,
                              _esCaptacion: true, _tipoCap: c.tipo_captacion,
                              _url: c.url, _propietario: c.nombre_propietario, _tel: c.telefono,
                            }));
                            const todasProps = [...(properties||[]), ...capsNorm];
                            const matches = matchLeadProps(lead, todasProps);
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
                                  const yaMostrado = mostrados.has(`${lead.id}-${prop.id}`);
                                  return (
                                    <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:8,
                                      background:B.bg, borderRadius:7, padding:"7px 10px", marginBottom:5,
                                      opacity: yaMostrado ? 0.45 : 1 }}>
                                      <button onClick={() => toggleMostrado(lead.id, prop.id)}
                                        style={{ width:16, height:16, borderRadius:"50%", border:"1.5px solid",
                                          borderColor: yaMostrado ? "#2E9E6A" : "#4A6A90",
                                          background: yaMostrado ? "#2E9E6A" : "transparent",
                                          cursor:"pointer", flexShrink:0, fontSize:9, color:"white",
                                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                                        {yaMostrado ? "✓" : ""}
                                      </button>
                                      <div style={{ flex:1, fontSize:11, color:B.muted,
                                        textDecoration: yaMostrado ? "line-through" : "none" }}>
                                        <span style={{ color: yaMostrado ? "#6A8AAE" : B.text, fontWeight:600 }}>{prop.tipo}</span>
                                        {" · "}{prop.zona}
                                        {" · "}<span style={{ color: yaMostrado ? "#6A8AAE" : B.accentL }}>USD {(prop.precio||0).toLocaleString()}</span>
                                        {prop.dir && <span style={{ color:B.muted }}> · {prop.dir}</span>}
                                        {prop._esCaptacion && (
                                          <span style={{ marginLeft:6, fontSize:9, padding:"1px 5px", borderRadius:4,
                                            background:"rgba(204,34,51,0.15)", color:"#CC2233", border:"1px solid rgba(204,34,51,0.3)" }}>
                                            📌 {prop._tipoCap||"captación"}
                                          </span>
                                        )}
                                      </div>
                                      {wa && !yaMostrado && (
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
 
                          {/* Panel buscador inline */}
                          {buscandoId === lead.id && (
                            <div style={{ marginBottom:10 }}>
                              <BuscadorPanel lead={lead} />
                            </div>
                          )}
 
                          {/* Switch Inversor */}
                          <div style={{ display:"flex", alignItems:"center", gap: mobile ? 10 : 8, marginBottom: mobile ? 10 : 8,
                            padding: mobile ? "9px 12px" : "7px 10px", borderRadius:8,
                            background: lead.inversor ? "rgba(155,109,200,0.1)" : "rgba(42,91,173,0.05)",
                            border: `1px solid ${lead.inversor ? "#9B6DC840" : B.border}` }}>
                            <button onClick={()=>toggleInversor(lead)}
                              style={{ width: mobile ? 42 : 36, height: mobile ? 24 : 20, borderRadius: mobile ? 12 : 10, cursor:"pointer", border:"none", position:"relative", flexShrink:0,
                                background: lead.inversor ? "#9B6DC8" : "#2A3A5A" }}>
                              <div style={{ position:"absolute", top: mobile ? 3 : 2, left: lead.inversor ? (mobile ? 22 : 18) : 2, width: mobile ? 18 : 16, height: mobile ? 18 : 16,
                                borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
                            </button>
                            <span style={{ fontSize: mobile ? 12 : 11, color: lead.inversor ? "#9B6DC8" : "#8AAECC", fontWeight:600 }}>
                              💼 Inversor
                            </span>
                            {lead.inversor && (
                              <InversorNota lead={lead} onGuardar={guardarNotaInversor} />
                            )}
                          </div>
 
                          {/* Acciones */}
                          <div style={{ display:"flex", gap: mobile ? 8 : 7, flexWrap:"wrap" }}>
                            <button onClick={() => contacteHoy(lead.id)}
                              style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, background:`${B.ok}18`,
                                border:`1px solid ${B.ok}40`, color:B.ok, fontSize: mobile ? 13 : 12, cursor:"pointer", fontWeight:600 }}>
                              ✅ Contacté hoy
                            </button>
                            {lead.tel && (
                              <a href={`https://wa.me/${lead.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                                style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, background:"rgba(37,211,102,0.1)",
                                  border:"1px solid rgba(37,211,102,0.25)", color:"#25D366",
                                  fontSize: mobile ? 13 : 12, textDecoration:"none", fontWeight:600 }}>
                                💬 WA
                              </a>
                            )}
                            {lead.tel && (
                              <a href={`tel:${lead.tel}`}
                                style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, background:`${B.ok}18`,
                                  border:`1px solid ${B.ok}40`, color:B.ok, fontSize: mobile ? 13 : 12, textDecoration:"none", fontWeight:600 }}>
                                📞 Llamar
                              </a>
                            )}
                            <button onClick={() => startEdit(lead)}
                              style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, background:`${B.accentL}12`,
                                border:`1px solid ${B.accentL}30`, color:B.accentL, fontSize: mobile ? 13 : 12, cursor:"pointer", fontWeight:600 }}>
                              ✏️ Editar
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setBuscandoId(b => b === lead.id ? null : lead.id); }}
                              style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, fontSize: mobile ? 13 : 12, cursor:"pointer", fontWeight:600,
                                background: buscandoId === lead.id ? `${B.accentL}25` : `${B.accentL}12`,
                                border:`1px solid ${buscandoId === lead.id ? B.accentL : B.accentL+"30"}`,
                                color:B.accentL }}>
                              🔍 Buscar
                            </button>
                            <button onClick={() => {
                              const msg = lead.msg_busqueda || genMsgBusqueda(lead);
                              const modal = document.createElement("div");
                              modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
                              const turno = new Date().getHours() < 14 ? "manana" : "tarde";
                              modal.innerHTML = `<div style="background:#0F1E35;border:1px solid #2A5BA830;border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.85)">
                                <div style="font-size:11px;color:#8AAECC;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">📋 MENSAJE BÚSQUEDA</div>
                                <textarea id="busqueda-txt" style="width:100%;height:200px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#E8F0FA;font-size:13px;line-height:1.7;resize:vertical;outline:none;font-family:inherit;box-sizing:border-box">${msg}</textarea>
                                <div style="display:flex;gap:8px;margin-top:12px">
                                  <button id="busqueda-copy" style="flex:1;padding:10px;border-radius:8px;background:#E8A830;border:none;color:#0F1E35;font-size:13px;font-weight:700;cursor:pointer">Copiar y guardar</button>
                                  <button id="busqueda-reset" style="padding:10px 12px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:12px;cursor:pointer">↺</button>
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
                            {(() => {
                              const hoy = new Date().toISOString().slice(0,10);
                              const okM = lead.enviado_manana === hoy;
                              const okT = lead.enviado_tarde  === hoy;
                              return (
                                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                                  <button onClick={() => updateLead(lead.id, { enviado_manana: okM ? null : hoy })}
                                    style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
                                      background: okM ? "rgba(204,34,51,0.2)" : "transparent",
                                      border: `1px solid ${okM ? "#CC2233" : B.border}`,
                                      color: okM ? "#CC2233" : "#4A6A90", fontWeight:700 }}>
                                    {okM ? "☀✓" : "☀"}
                                  </button>
                                  <button onClick={() => updateLead(lead.id, { enviado_tarde: okT ? null : hoy })}
                                    style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
                                      background: okT ? "rgba(204,34,51,0.2)" : "transparent",
                                      border: `1px solid ${okT ? "#CC2233" : B.border}`,
                                      color: okT ? "#CC2233" : "#4A6A90", fontWeight:700 }}>
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
 
      {leadsActivos.length === 0 && (
        <div style={{ textAlign:"center", padding: mobile ? "50px 20px" : "40px", color:"#8AAECC", fontSize: mobile ? 14 : 13 }}>Sin resultados</div>
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
 
      {modalPerdido && (
        <ModalPerdido lead={modalPerdido} onConfirmar={confirmarPerdido} onCancelar={() => setModalPerdido(null)} />
      )}
    </div>
  );
}
