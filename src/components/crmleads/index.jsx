// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRMLeads (orquestador)
// Filtros, tabs, grupos por temperatura, mail de pedidos
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { B, AG, scoreLead, matchLeadProps, getPriorityScore, getRecommendedAction } from "../../data/constants.js";
import LeadCard    from "./LeadCard.jsx";
import { useIncidents } from "../../hooks/useIncidents.js";
import ModalPerdido from "./ModalPerdido.jsx";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

export default function CRMLeads({ leads, updateLead, deleteLead, properties, captaciones, supabase }) {
  const mobile = useIsMobile(768);
  useIncidents(leads);
  const [pagina,         setPagina]         = useState("compradores");
  const [fs,             setFs]             = useState("Todos");
  const [fa,             setFa]             = useState("Todos");
  const [q,              setQ]              = useState("");
  const [mostrarPerdidos,setMostrarPerdidos]= useState(false);
  const [mostrados,      setMostrados]      = useState(new Set());
  const [matchesVistos,  setMatchesVistos]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("alba_matches_vistos")||"[]")); } catch { return new Set(); }
  });
  const [modalPerdido,   setModalPerdido]   = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [exp,            setExp]            = useState(null);
  const [showMail,       setShowMail]       = useState(false);
  const [mailCopiado,    setMailCopiado]    = useState(false);

  useEffect(() => {
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

  const todasProps = useMemo(() => {
    const capsNorm = (captaciones||[]).map(c => ({
      id:"cap-"+c.id, tipo:c.tipo, zona:c.zona, precio:c.precio,
      dir:c.direccion, caracts:c.caracts, activa:true,
      _esCaptacion:true, _tipoCap:c.tipo_captacion,
    }));
    return [...(properties||[]), ...capsNorm];
  }, [properties, captaciones]);

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
  }).sort((a,b) => a.dias - b.dias), [leads, fs, fa, q, mostrarPerdidos]);

  const filt          = useMemo(() => filtBase.filter(l => !l.inversor), [filtBase]);
  const filtInversores = useMemo(() => filtBase.filter(l => !!l.inversor), [filtBase]);

  const matchesNuevos = useMemo(() => {
    let count = 0;
    [...filt, ...filtInversores].forEach(l => {
      matchLeadProps(l, todasProps).forEach(p => {
        if (!matchesVistos.has(`${l.id}-${p.id}`)) count++;
      });
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
    if (etapa === "Perdido") { setModalPerdido(leads.find(l => l.id === id)); return; }
    await updateLead(id, { etapa });
  }

  async function confirmarPerdido(lead, motivo) {
    await updateLead(lead.id, { etapa:"Perdido", motivo_perdida:motivo });
    setModalPerdido(null);
  }

  async function setAgente(id, ag) { await updateLead(id, { ag }); }

  async function ejecutarEliminar() {
    if (!confirmDelete) return;
    await deleteLead(confirmDelete.id);
    setConfirmDelete(null);
    if (exp === confirmDelete.id) setExp(null);
  }

  // Mail de pedidos
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.presup && l.zona).sort((a,b) => a.dias - b.dias);
  function generarMail() {
    const cal = activos.filter(l => l.dias <= 2);
    const tib = activos.filter(l => l.dias > 2 && l.dias <= 7);
    const fmt = l => {
      const precio = l.presup ? `USD ${l.presup.toLocaleString()}` : "presupuesto a consultar";
      const partes = [l.tipo, l.zona&&`en ${l.zona}`, precio].filter(Boolean).join(", ");
      const extras = [l.credito==="si"&&"crédito aprobado",l.cochera==="si"&&"con cochera",l.patio==="si"&&"con patio",l.ambientes&&`${l.ambientes} amb`].filter(Boolean).join(" · ");
      return `• ${partes}${extras ? ` — ${extras}` : ""}`;
    };
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

  const leadsActivos = pagina === "compradores" ? filt : filtInversores;

  const grupos = [
    { titulo:"🔴 CALIENTES", color:B.hot,  leads: leadsActivos.filter(l => { const s=scoreLead(l).label; return s.includes("Caliente")||l.etapa==="Negociación"; }) },
    { titulo:"🟡 TIBIOS",    color:B.warm, leads: leadsActivos.filter(l => { const s=scoreLead(l).label; return s.includes("Tibio")&&l.etapa!=="Negociación"; }) },
    { titulo:"⚪ FRÍOS",     color:B.dim,  leads: leadsActivos.filter(l => { const s=scoreLead(l).label; return s.includes("Frío"); }) },
  ].filter(g => g.leads.length > 0);

  const leadTop = useMemo(() => {
    const activos = leadsActivos.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
    return activos.sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0] || null;
  }, [leadsActivos]);

  const urgenciaColor = { alta: B.hot, media: B.warm, baja: B.dim };

  const cardProps = { mobile, properties, captaciones, mostrados, toggleMostrado, updateLead, deleteLead, setEtapa, setAgente, setModalPerdido, setConfirmDelete };

  return (
    <div style={{ maxWidth: mobile ? "100%" : 800 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom: mobile ? 12 : 16, flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 8 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h1 style={{ fontSize: mobile ? 18 : 20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>CRM Leads</h1>
          {matchesNuevos > 0 && (
            <button onClick={marcarMatchesVistos}
              style={{ display:"flex", alignItems:"center", gap:4, padding: mobile ? "6px 12px" : "4px 10px",
                borderRadius:8, background:"rgba(232,168,48,0.15)", border:"1px solid rgba(232,168,48,0.4)",
                color:"#E8A830", fontSize: mobile ? 12 : 11, fontWeight:700, cursor:"pointer" }}>
              🔔 {matchesNuevos} match{matchesNuevos>1?"es":""} nuevo{matchesNuevos>1?"s":""}
            </button>
          )}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => setShowMail(m => !m)}
            style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:8, cursor:"pointer",
              fontSize: mobile ? 13 : 12, fontWeight:600,
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
        <div style={{ background:"rgba(10,21,37,0.95)", border:`1px solid ${B.accentL}40`,
          borderRadius:12, overflow:"hidden", marginBottom: mobile ? 12 : 14 }}>
          <div style={{ padding: mobile ? "12px 14px" : "10px 16px", borderBottom:`1px solid ${B.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 8 : 0 }}>
            <span style={{ fontSize: mobile ? 12 : 11, fontWeight:700, color:B.accentL }}>
              ✉ MAIL DE PEDIDOS — {activos.filter(l=>l.dias<=7).length} búsquedas activas
            </span>
            <div style={{ display:"flex", gap: mobile ? 8 : 6 }}>
              <button onClick={copiarMail}
                style={{ padding: mobile ? "6px 14px" : "4px 12px", borderRadius:7, cursor:"pointer",
                  background: mailCopiado ? "#2E9E6A" : B.accent, border:"none",
                  color:"#fff", fontSize: mobile ? 12 : 11, fontWeight:700 }}>
                {mailCopiado ? "✓ Copiado" : "Copiar"}
              </button>
              <a href={`mailto:?subject=Pedidos%20Alba%20Inversiones&body=${encodeURIComponent(generarMail())}`}
                style={{ padding: mobile ? "6px 14px" : "4px 12px", borderRadius:7,
                  background:"transparent", border:`1px solid ${B.border}`,
                  color:"#8AAECC", fontSize: mobile ? 12 : 11, fontWeight:600, textDecoration:"none" }}>
                Abrir en mail
              </a>
            </div>
          </div>
          <pre style={{ margin:0, padding: mobile ? "14px" : "12px 16px", fontSize: mobile ? 13 : 12,
            color:"#C8D8E8", lineHeight:1.7, whiteSpace:"pre-wrap",
            fontFamily:"-apple-system,sans-serif", maxHeight:320, overflowY:"auto" }}>
            {generarMail()}
          </pre>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:B.card, borderRadius:10, padding:4,
        border:`1px solid ${B.border}`, marginBottom: mobile ? 12 : 14,
        width: mobile ? "100%" : "fit-content" }}>
        {[
          { id:"compradores", label:"🏠 Compradores", count:filt.length },
          { id:"inversores",  label:"💼 Inversores",  count:filtInversores.length, color:"#9B6DC8" },
        ].map(t => (
          <button key={t.id} onClick={() => setPagina(t.id)}
            style={{ flex: mobile ? 1 : "none", padding: mobile ? "8px 16px" : "6px 16px",
              borderRadius:7, cursor:"pointer", fontSize: mobile ? 13 : 12, fontWeight:600, border:"none",
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
            borderRadius:8, padding: mobile ? "10px 12px" : "8px 12px", color:B.text,
            fontSize: mobile ? 13 : 12, marginBottom:10, outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 10 : 12, flexDirection: mobile ? "column" : "row" }}>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>TEMP</span>
            {["Todos","Caliente","Tibio","Frío"].map(s => (
              <button key={s} onClick={() => setFs(s)}
                style={{...chip(fs===s, s==="Caliente"?B.hot:s==="Tibio"?B.warm:B.muted),
                  padding: mobile ? "6px 12px" : "4px 11px", fontSize: mobile ? 12 : 11}}>{s}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, color:B.muted }}>AGENTE</span>
            {["Todos","C","A","F","L","Lu","Sin asignar"].map(a => (
              <button key={a} onClick={() => setFa(a)}
                style={{...chip(fa===a, a==="Sin asignar"?B.hot:a!=="Todos"?AG[a]?.c:B.accentL),
                  padding: mobile ? "6px 12px" : "4px 11px", fontSize: mobile ? 12 : 11}}>
                {a==="Todos"?"Todos":a==="Sin asignar"?"—":AG[a]?.n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Acción del día */}
      {leadTop && (() => {
        const score = getPriorityScore(leadTop);
        const rec   = getRecommendedAction(leadTop);
        const col   = urgenciaColor[rec.urgencia];
        return (
          <div style={{ background:`${col}12`, border:`1px solid ${col}40`,
            borderLeft:`4px solid ${col}`, borderRadius:10,
            padding: mobile ? "12px 14px" : "14px 16px", marginBottom: mobile ? 12 : 16,
            display:"flex", alignItems:"center", gap: mobile ? 10 : 14,
            flexWrap: mobile ? "wrap" : "nowrap" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth: mobile ? 44 : 48 }}>
              <span style={{ fontSize: mobile ? 20 : 22, fontWeight:900, color:col,
                lineHeight:1, fontFamily:"Georgia,serif" }}>{score}</span>
              <span style={{ fontSize:9, color:B.dim, letterSpacing:"1px", marginTop:1 }}>SCORE</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize: mobile ? 10 : 9, fontWeight:700, color:col,
                letterSpacing:"1.5px", marginBottom:3 }}>ACCIÓN DEL DÍA</div>
              <div style={{ fontSize: mobile ? 14 : 13, fontWeight:700, color:B.text, marginBottom:2 }}>
                {leadTop.nombre}
                {leadTop.zona && <span style={{ fontWeight:400, color:B.dim }}> · {leadTop.zona}</span>}
              </div>
              <div style={{ fontSize: mobile ? 12 : 11, color:B.dim }}>{rec.motivo}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems: mobile ? "flex-start" : "flex-end",
              gap:6, flexShrink:0 }}>
              <span style={{ fontSize: mobile ? 13 : 12, fontWeight:700, color:col,
                background:`${col}18`, padding:"4px 12px", borderRadius:20,
                border:`1px solid ${col}40`, whiteSpace:"nowrap" }}>
                {rec.accion}
              </span>
              <button onClick={() => setExp(leadTop.id)}
                style={{ fontSize: mobile ? 11 : 10, color:B.accentL, background:"transparent",
                  border:`1px solid ${B.border}`, borderRadius:6, padding:"3px 10px",
                  cursor:"pointer" }}>
                Ver lead →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Grupos */}
      {grupos.map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: mobile ? 14 : 16 }}>
          <div style={{ fontSize: mobile ? 12 : 11, fontWeight:700, color:grupo.color,
            letterSpacing:"1.5px", marginBottom: mobile ? 10 : 8, paddingLeft:4 }}>
            {grupo.titulo} <span style={{ fontWeight:400, color:B.muted }}>({grupo.leads.length})</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 10 : 8 }}>
            {grupo.leads.map(lead => (
              <LeadCard key={lead.id} lead={lead}
                open={exp === lead.id}
                onToggle={() => setExp(exp === lead.id ? null : lead.id)}
                {...cardProps} />
            ))}
          </div>
        </div>
      ))}

      {leadsActivos.length === 0 && (
        <div style={{ textAlign:"center", padding: mobile ? "50px 20px" : "40px",
          color:"#8AAECC", fontSize: mobile ? 14 : 13 }}>Sin resultados</div>
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
        <ModalPerdido lead={modalPerdido}
          onConfirmar={confirmarPerdido}
          onCancelar={() => setModalPerdido(null)} />
      )}
    </div>
  );
}