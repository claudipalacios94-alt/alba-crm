import React, { useMemo, useState } from "react";
import { B, AG, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
 
function Gauge({ value, max, label, sublabel, color, prefix = "", suffix = "" }) {
  const pct = Math.min(value / (max || 1), 1);
  const fmt = v => {
    if (prefix === "USD") {
      if (v >= 1000000) return "USD " + (v/1000000).toFixed(1) + "M";
      if (v >= 1000) return "USD " + (v/1000).toFixed(0) + "k";
      return "USD " + v.toLocaleString();
    }
    return prefix + v + suffix;
  };
  return (
    <div style={{ flex:1, minWidth:120, padding:"14px 16px", background:"#0A1525",
      borderRadius:10, border:"1px solid #1A2F50", display:"flex", flexDirection:"column",
      gap:6, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:color, opacity:0.8 }} />
      <div style={{ fontSize:11, color:"#3A5A7A", fontWeight:500 }}>
        {label}{sublabel && <span style={{ color:"#2A3A50", marginLeft:4 }}>· {sublabel}</span>}
      </div>
      <div style={{ fontSize:28, fontWeight:700, color, fontFamily:"'Cormorant Garamond',Georgia,serif",
        lineHeight:1, letterSpacing:"-0.5px" }}>{fmt(value)}</div>
      <div style={{ height:3, background:"#1A2F50", borderRadius:2 }}>
        <div style={{ height:"100%", width:(pct*100)+"%", background:color,
          borderRadius:2, opacity:0.6 }} />
      </div>
    </div>
  );
}
 
function PipelineBar({ leads }) {
  const etapas = ["Nuevo Contacto","Calificado","Visita","Negociación"];
  const colors  = [B.dim, B.accentL, B.warm, B.ok];
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const total   = activos.length || 1;
  return (
    <div>
      <div style={{ fontSize:10, color:"#2A4060", fontWeight:600, letterSpacing:"1px", marginBottom:10, textTransform:"uppercase" }}>EMBUDO COMERCIAL</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {etapas.map((e, i) => {
          const n = activos.filter(l => l.etapa === e).length;
          const pct = (n / total) * 100;
          const isCuello = i > 0 && n < activos.filter(l => l.etapa === etapas[i-1]).length * 0.3 && n > 0;
          return (
            <div key={e} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:10, color:B.muted, width:110, textAlign:"right", flexShrink:0 }}>{e}</div>
              <div style={{ flex:1, height:8, background:"#1A2F50", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", background:colors[i], borderRadius:4, transition:"width .6s ease" }} />
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:colors[i], width:28, flexShrink:0 }}>{n}</div>
              {isCuello && <div style={{ fontSize:9, color:B.hot }}>⚠️</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function LeadCard({ lead }) {
  const ag = AG[lead.ag];
  const waLink = lead.tel ? "https://wa.me/" + lead.tel.replace(/\D/g, "") : null;
  const urgColor = lead.etapa === "Negociación" ? B.ok : lead.dias <= 2 ? B.hot : lead.dias <= 5 ? B.warm : B.accentL;
  const razon = lead.etapa === "Negociación" ? "En negociación" : lead.dias === 0 ? "Nuevo hoy" : lead.dias <= 2 ? `${lead.dias}d — Caliente` : lead.dias <= 5 ? `${lead.dias}d — Tibio` : `${lead.dias}d sin contacto`;
  return (
    <div style={{ background:B.card, border:"1px solid " + urgColor + "40", borderLeft:"3px solid " + urgColor, borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#C8D8EE" }}>{lead.nombre}</span>
          {ag && <span style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:ag.bg||"rgba(42,91,173,0.25)", color:ag.c, fontWeight:700, border:"1px solid "+ag.c+"40" }}>{ag.n}</span>}
        </div>
        <div style={{ fontSize:10, color:B.muted }}>{lead.zona} · {lead.tipo} · {lead.presup ? "USD " + lead.presup.toLocaleString() : "—"}</div>
        {lead.nota && <div style={{ fontSize:10, color:"#4A6A8A", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>{lead.nota}</div>}
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
        <div style={{ fontSize:10, color:urgColor, fontWeight:700 }}>{razon}</div>
        {lead.etapa && <div style={{ fontSize:9, padding:"2px 8px", borderRadius:10, background:urgColor+"22", color:urgColor, fontWeight:600, border:"1px solid "+urgColor+"40" }}>{lead.etapa}</div>}
        {waLink && <a href={waLink} target="_blank" rel="noreferrer" style={{ padding:"4px 10px", borderRadius:6, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)", color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>💬 WA</a>}
      </div>
    </div>
  );
}
 
export default function Briefing({ leads, properties }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);
 
  const pipeline = filtrados.filter(l => l.etapa === "Negociación" || l.etapa === "Visita").reduce((s, l) => s + (l.presup || 0), 0);
  const calientes = filtrados.filter(l => { const s = (l.scoring || "").toLowerCase(); return s.includes("caliente") || l.etapa === "Negociación" || l.dias <= 2; }).length;
  const propsActivas = (properties || []).filter(p => p.activa !== false).length;
  const leadsNuevosMes = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;
  const pipelineMes = filtrados.filter(l => l.created_at && new Date(l.created_at) >= inicioMes && (l.etapa === "Negociación" || l.etapa === "Visita")).reduce((s, l) => s + (l.presup || 0), 0);
 
  const urgentes = useMemo(() => {
    return filtrados.map(l => {
      let score = 0;
      if (l.etapa === "Negociación") score += 100;
      if (l.etapa === "Visita")      score += 70;
      if (l.dias === 0)              score += 50;
      if (l.dias <= 2)               score += 40;
      if (l.dias <= 5)               score += 20;
      if ((l.prob || 0) >= 60)       score += 30;
      return { ...l, _score: score };
    }).sort((a, b) => b._score - a._score).slice(0, 4);
  }, [filtrados]);
 
  // Matches del día
  const matchesHoy = useMemo(() => {
    const props = properties || [];
    return filtrados
      .map(l => ({ lead: l, matches: matchLeadProps(l, props) }))
      .filter(m => m.matches.length > 0)
      .slice(0, 6);
  }, [filtrados, properties]);
 
  const chipAg = a => ({
    padding:"4px 11px", borderRadius:20, fontSize:11, cursor:"pointer",
    border:"1px solid " + (filtroAg === a ? B.accentL : B.border),
    background: filtroAg === a ? B.accentL + "18" : "transparent",
    color: filtroAg === a ? B.accentL : B.muted,
  });
 
  return (
    <div style={{ maxWidth:900 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:600, color:"#D0DDEE", margin:0, fontFamily:"Cormorant Garamond,Georgia,serif", letterSpacing:"0.5px" }}>{saludo} ✦</h1>
          <div style={{ fontSize:11, color:B.muted, marginTop:3 }}>{hoy.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["Todos","C","A","F","L"].map(a => (
            <button key={a} onClick={() => setFiltroAg(a)} style={chipAg(a)}>
              {a === "Todos" ? "Todos" : AG[a]?.n || a}
            </button>
          ))}
        </div>
      </div>
 
      {/* Gauges */}
      <div style={{ background:"transparent", border:"none", borderRadius:14, padding:"0", marginBottom:14, display:"flex", gap:10 }}>
        <Gauge value={pipeline} max={Math.max(pipeline * 2, 1000000)} label="Pipeline activo" sublabel="Visita + Negociación" color={B.accentL} prefix="USD" />
        <Gauge value={pipelineMes} max={Math.max(pipeline, 100000)} label="Pipeline este mes" sublabel={hoy.toLocaleDateString("es-AR",{month:"long"})} color="#2E9E6A" prefix="USD" />
        <Gauge value={calientes} max={Math.max(activos.length * 0.4, 10)} label="Leads calientes" color={B.hot} />
        <Gauge value={leadsNuevosMes} max={30} label="Leads nuevos" sublabel="Este mes" color={B.warm} />
        <Gauge value={propsActivas} max={50} label="Propiedades" sublabel="En cartera" color="#9B6DC8" />
      </div>
 
      {/* Dos columnas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        {/* Llamar hoy */}
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:10, color:"#2A4060", fontWeight:600, letterSpacing:"1px", marginBottom:12, textTransform:"uppercase" }}>🔥 LLAMAR HOY</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {urgentes.length === 0 && <div style={{ textAlign:"center", padding:"20px 0", color:B.dim, fontSize:12 }}>Sin leads urgentes</div>}
            {urgentes.map(l => <LeadCard key={l.id} lead={l} />)}
          </div>
        </div>
 
        {/* Pipeline */}
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16, display:"flex", flexDirection:"column", gap:20 }}>
          <PipelineBar leads={filtrados} />
          <div>
            <div style={{ fontSize:10, color:"#2A4060", fontWeight:600, letterSpacing:"1px", marginBottom:10, textTransform:"uppercase" }}>RESUMEN RÁPIDO</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { label:"Sin asignar",       val: activos.filter(l=>!l.ag).length,          color:B.hot  },
                { label:"Sin próx. acción",  val: activos.filter(l=>!l.proxAccion).length,   color:B.warm },
                { label:"Prob. alta (≥70%)", val: activos.filter(l=>(l.prob||0)>=70).length, color:B.ok   },
                { label:"Fríos (+15 días)",  val: activos.filter(l=>l.dias>15).length,        color:B.dim  },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:B.muted }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
 
      {/* Matches del día */}
      {matchesHoy.length > 0 && (
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:10, color:"#2A4060", fontWeight:600, letterSpacing:"1px", marginBottom:12, textTransform:"uppercase" }}>
            📌 MATCHES DEL DÍA — propiedades en cartera que encajan con tus leads
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {matchesHoy.map(({ lead, matches }) => (
              <div key={lead.id} style={{ background:B.card, border:"1px solid " + B.border, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                  {lead.nombre}
                  <span style={{ fontSize:10, color:B.muted, fontWeight:400, marginLeft:8 }}>
                    busca {lead.tipo} en {lead.zona} · USD {(lead.presup||0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {matches.slice(0, 2).map(prop => {
                    const msg = genMsgWhatsApp(lead, prop);
                    const wa = lead.tel ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}` : null;
                    return (
                      <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:10, background:B.bg, borderRadius:7, padding:"8px 10px" }}>
                        <div style={{ flex:1, fontSize:11, color:B.muted }}>
                          <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                          {" · "}{prop.zona}
                          {" · "}<span style={{ color:B.accentL, fontFamily:"Georgia,serif" }}>USD {(prop.precio||0).toLocaleString()}</span>
                          {prop.dir && <span style={{ color:B.dim }}> · {prop.dir}</span>}
                        </div>
                        {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap", background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)", color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>💬 WA listo</a>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
