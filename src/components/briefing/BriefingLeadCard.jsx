// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingLeadCard
// Card de lead con calificación y preguntas inline
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B, AG } from "../../data/constants.js";
import { supabase } from "../../hooks/supabaseClient.js";

const PREGUNTAS = [
  { key:"q_visitas_previas",   label:"¿Cuánto tiempo llevás buscando?",          placeholder:"ej: 2 semanas, 6 meses..." },
  { key:"q_freno",             label:"¿Qué te frenó en propiedades anteriores?", placeholder:"ej: precio, ubicación..." },
  { key:"q_tiene_para_vender", label:"¿Tenés algo para vender o permutar?",      placeholder:"ej: depto en Centro" },
  { key:"q_fecha_limite",      label:"¿Hay una fecha límite para decidir?",      placeholder:"ej: vence alquiler en agosto" },
];

export default function BriefingLeadCard({ lead }) {
  const [open,    setOpen]    = React.useState(false);
  const [editQ,   setEditQ]   = React.useState(null);
  const [valQ,    setValQ]    = React.useState("");
  const [savingQ, setSavingQ] = React.useState(false);
  const [localLead, setLocalLead] = React.useState(lead);

  const ag = AG[localLead.ag];
  const waLink   = localLead.tel ? "https://wa.me/" + localLead.tel.replace(/\D/g, "") : null;
  const urgColor = localLead.etapa === "Negociación" ? B.ok
    : localLead.dias <= 2 ? B.hot
    : localLead.dias <= 5 ? B.warm
    : B.accentL;
  const razon = localLead.etapa === "Negociación" ? "En negociación"
    : localLead.dias === 0 ? "Nuevo hoy"
    : localLead.dias <= 2 ? localLead.dias + "d — Caliente"
    : localLead.dias <= 5 ? localLead.dias + "d — Tibio"
    : localLead.dias + "d sin contacto";

  const respondidas = PREGUNTAS.filter(p => localLead[p.key]).length;
  const pct      = Math.round((respondidas / PREGUNTAS.length) * 100);
  const calColor = respondidas <= 1 ? B.hot : respondidas <= 3 ? B.warm : B.ok;

  async function guardarPregunta(key) {
    setSavingQ(true);
    await supabase.from("leads").update({ [key]: valQ }).eq("id", localLead.id);
    setLocalLead(prev => ({ ...prev, [key]: valQ }));
    setEditQ(null);
    setSavingQ(false);
  }

  return (
    <div style={{ background:B.card, border:"1px solid "+urgColor+"40",
      borderLeft:"3px solid "+urgColor, borderRadius:10, overflow:"hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding:"12px 14px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#E8F0FA" }}>{localLead.nombre}</span>
          {ag && (
            <span style={{ fontSize:11, padding:"2px 7px", borderRadius:4,
              background:ag.bg||"rgba(42,91,173,0.25)", color:ag.c,
              fontWeight:700, border:"1px solid "+ag.c+"40" }}>{ag.n}</span>
          )}
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
            background:calColor+"22", color:calColor, border:"1px solid "+calColor+"40", fontWeight:700 }}>
            {respondidas}/{PREGUNTAS.length} calificado
          </span>
          <span style={{ fontSize:11, color:urgColor, fontWeight:700, marginLeft:"auto" }}>
            {razon}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
              style={{ marginLeft:4, verticalAlign:"middle", transition:"transform 0.2s",
                transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M4 6L8 10L12 6" stroke={urgColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        <div style={{ fontSize:12, color:"#8AAECC", marginBottom:4 }}>
          {localLead.zona} · {localLead.tipo} · {localLead.presup ? "USD "+localLead.presup.toLocaleString() : "—"}
        </div>
        <div style={{ height:3, background:B.border, borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:pct+"%", background:calColor, borderRadius:2, transition:"width 0.3s" }} />
        </div>
      </div>

      {open && (
        <div style={{ borderTop:"1px solid "+urgColor+"30", padding:"12px 14px",
          background:"rgba(10,21,37,0.5)", display:"flex", flexDirection:"column", gap:10 }}>
          {localLead.nota && <div style={{ fontSize:13, color:"#A8C8E8", lineHeight:1.6, fontStyle:"italic" }}>{localLead.nota}</div>}
          {localLead.proxAccion && (
            <div style={{ fontSize:12, color:"#8AAECC" }}>
              <span style={{ color:"#5A8AAE", fontWeight:600, fontSize:11 }}>PROXIMA ACCION: </span>
              {localLead.proxAccion}
            </div>
          )}

          <div style={{ background:"rgba(10,21,37,0.4)", borderRadius:8, padding:"10px 12px", border:"1px solid "+B.border }}>
            <div style={{ fontSize:10, fontWeight:700, color:B.accentL, letterSpacing:"0.8px", marginBottom:8 }}>CALIFICACION DEL LEAD</div>
            {PREGUNTAS.map(p => (
              <div key={p.key} style={{ marginBottom:6 }}>
                {editQ === p.key ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <input autoFocus value={valQ} onChange={e => setValQ(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") guardarPregunta(p.key); if (e.key === "Escape") setEditQ(null); }}
                      placeholder={p.placeholder}
                      style={{ flex:1, background:B.bg, border:"1px solid "+B.accentL, borderRadius:5,
                        padding:"4px 8px", color:B.text, fontSize:11, outline:"none" }} />
                    <button onClick={() => guardarPregunta(p.key)} disabled={savingQ}
                      style={{ padding:"4px 10px", borderRadius:5, cursor:"pointer",
                        background:B.accent, border:"none", color:"#fff", fontSize:11, fontWeight:700 }}>
                      {savingQ ? "..." : "OK"}
                    </button>
                    <button onClick={() => setEditQ(null)}
                      style={{ padding:"4px 8px", borderRadius:5, cursor:"pointer",
                        background:"transparent", border:"1px solid "+B.border, color:"#8AAECC", fontSize:11 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8AAECC" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div onClick={() => { setEditQ(p.key); setValQ(localLead[p.key] || ""); }}
                    style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"3px 6px",
                      borderRadius:5, background: localLead[p.key] ? "rgba(46,158,106,0.08)" : "rgba(204,34,51,0.06)" }}>
                    <span style={{ fontSize:13, flexShrink:0, color: localLead[p.key] ? "#2E9E6A" : "#4A6A90" }}>
                      {localLead[p.key] ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6A90" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                      )}
                    </span>
                    <span style={{ fontSize:11, color:"#8AAECC", flex:1 }}>{p.label}</span>
                    {localLead[p.key]
                      ? <span style={{ fontSize:11, color:"#A8C8E8", fontStyle:"italic" }}>{localLead[p.key]}</span>
                      : <span style={{ fontSize:10, color:B.hot }}>Sin dato — click para completar</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            {localLead.etapa && (
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10,
                background:urgColor+"22", color:urgColor, fontWeight:600, border:"1px solid "+urgColor+"40" }}>
                {localLead.etapa}
              </span>
            )}
            {localLead.op     && <span style={{ fontSize:11, color:"#8AAECC" }}>{localLead.op}</span>}
            {localLead.origen && <span style={{ fontSize:11, color:"#6A8AAE" }}>via {localLead.origen}</span>}
            {localLead.tel    && <span style={{ fontSize:11, color:"#8AAECC" }}>Tel: {localLead.tel}</span>}
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ marginLeft:"auto", padding:"5px 14px", borderRadius:6,
                  background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
                  color:"#25D366", fontSize:12, textDecoration:"none", fontWeight:600 }}>WhatsApp</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
