// ══════════════════════════════════════════════════════════════
// ALBA CRM — DASHBOARD PRINCIPAL
// Gauges animados + leads urgentes + pipeline por etapa
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useEffect, useRef, useState } from "react";
import { B, AG, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
 
// ── Gauge animado ─────────────────────────────────────────────
function Gauge({ value, max, label, sublabel, color, prefix = "", suffix = "" }) {
  const canvasRef = useRef(null);
  const pct = Math.min(value / (max || 1), 1);
 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.72;
    const r = W * 0.38;
    const startAngle = Math.PI * 0.85;
    const endAngle   = Math.PI * 2.15;
    const totalArc   = endAngle - startAngle;
 
    ctx.clearRect(0, 0, W, H);
 
    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = "#1A2F50";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();
 
    // Fill
    if (pct > 0) {
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, color + "88");
      grad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalArc * pct);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();
    }
 
    // Needle
    const angle = startAngle + totalArc * pct;
    const nx = cx + (r - 4) * Math.cos(angle);
    const ny = cy + (r - 4) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(nx, ny, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
 
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#1A2F50";
    ctx.fill();
 
  }, [pct, color]);
 
  const fmt = v => {
    if (prefix === "USD") {
      if (v >= 1000000) return "USD " + (v/1000000).toFixed(1) + "M";
      if (v >= 1000) return "USD " + (v/1000).toFixed(0) + "k";
      return "USD " + v.toLocaleString();
    }
    return prefix + v + suffix;
  };
 
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, minWidth:130 }}>
      <canvas ref={canvasRef} width={160} height={110} style={{ width:130, height:90 }} />
      <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"Georgia,serif",
        marginTop:-8, letterSpacing:"-0.5px" }}>
        {fmt(value)}
      </div>
      <div style={{ fontSize:11, color:B.text, fontWeight:600, marginTop:2 }}>{label}</div>
      {sublabel && <div style={{ fontSize:9, color:B.dim, marginTop:1 }}>{sublabel}</div>}
 
      {/* Matches del día */}
      {(() => {
        const props = properties || [];
        const matchesHoy = activos
          .filter(l => filtroAg === "Todos" || l.ag === filtroAg)
          .map(l => ({ lead: l, matches: matchLeadProps(l, props) }))
          .filter(m => m.matches.length > 0)
          .slice(0, 6);
 
        if (!matchesHoy.length) return null;
 
        return (
          <div style={{ marginTop:14, background:B.sidebar, border:`1px solid ${B.border}`,
            borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
              📌 MATCHES DEL DÍA — propiedades en cartera que encajan con tus leads
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {matchesHoy.map(({ lead, matches }) => (
                <div key={lead.id} style={{ background:B.card, border:`1px solid ${B.border}`,
                  borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                    {lead.nombre}
                    <span style={{ fontSize:10, color:B.muted, fontWeight:400, marginLeft:8 }}>
                      busca {lead.tipo} en {lead.zona} · USD {(lead.presup||0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {matches.slice(0, 2).map(prop => {
                      const msg = genMsgWhatsApp(lead, prop);
                      const wa = lead.tel
                        ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
                        : null;
                      return (
                        <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:10,
                          background:B.bg, borderRadius:7, padding:"8px 10px" }}>
                          <div style={{ flex:1, fontSize:11, color:B.muted }}>
                            <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                            {" · "}{prop.zona}
                            {" · "}<span style={{ color:B.accentL, fontFamily:"Georgia,serif" }}>
                              USD {(prop.precio||0).toLocaleString()}
                            </span>
                            {prop.dir && <span style={{ color:B.dim }}> · {prop.dir}</span>}
                          </div>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer"
                              style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap",
                                background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                              💬 WA listo
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
 
    </div>
  );
}
 
// ── Pipeline bar ──────────────────────────────────────────────
function PipelineBar({ leads }) {
  const etapas = ["Nuevo Contacto","Calificado","Visita","Negociación"];
  const colors  = [B.dim, B.accentL, B.warm, B.ok];
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const total   = activos.length || 1;
 
  return (
    <div>
      <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:10 }}>
        EMBUDO COMERCIAL
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {etapas.map((e, i) => {
          const n   = activos.filter(l => l.etapa === e).length;
          const pct = (n / total) * 100;
          const isCuello = i > 0 && n < activos.filter(l => l.etapa === etapas[i-1]).length * 0.3 && n > 0;
          return (
            <div key={e} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:10, color:B.muted, width:110, textAlign:"right", flexShrink:0 }}>{e}</div>
              <div style={{ flex:1, height:8, background:"#1A2F50", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", background:colors[i],
                  borderRadius:4, transition:"width .6s ease" }} />
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:colors[i], width:28, flexShrink:0 }}>{n}</div>
              {isCuello && <div style={{ fontSize:9, color:B.hot }}>⚠️ cuello</div>}
            </div>
          );
        })}
      </div>
 
      {/* Matches del día */}
      {(() => {
        const props = properties || [];
        const matchesHoy = activos
          .filter(l => filtroAg === "Todos" || l.ag === filtroAg)
          .map(l => ({ lead: l, matches: matchLeadProps(l, props) }))
          .filter(m => m.matches.length > 0)
          .slice(0, 6);
 
        if (!matchesHoy.length) return null;
 
        return (
          <div style={{ marginTop:14, background:B.sidebar, border:`1px solid ${B.border}`,
            borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
              📌 MATCHES DEL DÍA — propiedades en cartera que encajan con tus leads
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {matchesHoy.map(({ lead, matches }) => (
                <div key={lead.id} style={{ background:B.card, border:`1px solid ${B.border}`,
                  borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                    {lead.nombre}
                    <span style={{ fontSize:10, color:B.muted, fontWeight:400, marginLeft:8 }}>
                      busca {lead.tipo} en {lead.zona} · USD {(lead.presup||0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {matches.slice(0, 2).map(prop => {
                      const msg = genMsgWhatsApp(lead, prop);
                      const wa = lead.tel
                        ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
                        : null;
                      return (
                        <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:10,
                          background:B.bg, borderRadius:7, padding:"8px 10px" }}>
                          <div style={{ flex:1, fontSize:11, color:B.muted }}>
                            <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                            {" · "}{prop.zona}
                            {" · "}<span style={{ color:B.accentL, fontFamily:"Georgia,serif" }}>
                              USD {(prop.precio||0).toLocaleString()}
                            </span>
                            {prop.dir && <span style={{ color:B.dim }}> · {prop.dir}</span>}
                          </div>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer"
                              style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap",
                                background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                              💬 WA listo
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
 
    </div>
  );
}
 
// ── Lead urgente ──────────────────────────────────────────────
function LeadCard({ lead }) {
  const ag = AG[lead.ag];
  const waLink = lead.tel
    ? "https://wa.me/" + lead.tel.replace(/\D/g, "")
    : null;
 
  const urgColor =
    lead.etapa === "Negociación" ? B.ok :
    lead.dias   <= 2             ? B.hot :
    lead.dias   <= 5             ? B.warm : B.accentL;
 
  const razon =
    lead.etapa === "Negociación" ? "En negociación" :
    lead.dias   === 0            ? "Nuevo hoy" :
    lead.dias   <= 2             ? `${lead.dias}d — Caliente` :
    lead.dias   <= 5             ? `${lead.dias}d — Tibio` :
    `${lead.dias}d sin contacto`;
 
  return (
    <div style={{ background:B.card, border:"1px solid " + urgColor + "40",
      borderLeft:"3px solid " + urgColor, borderRadius:10, padding:"12px 14px",
      display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:700, color:B.text }}>{lead.nombre}</span>
          {ag && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3,
            background:ag.bg || "#1A2F50", color:ag.c, fontWeight:700 }}>{ag.n}</span>}
        </div>
        <div style={{ fontSize:10, color:B.muted }}>
          {lead.zona} · {lead.tipo} · {lead.presup ? "USD " + lead.presup.toLocaleString() : "—"}
        </div>
        {lead.nota && (
          <div style={{ fontSize:9, color:B.dim, marginTop:3, fontStyle:"italic",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {lead.nota}
          </div>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
        <div style={{ fontSize:9, color:urgColor, fontWeight:700 }}>{razon}</div>
        {lead.etapa && (
          <div style={{ fontSize:9, padding:"2px 7px", borderRadius:12,
            background:urgColor+"18", color:urgColor }}>{lead.etapa}</div>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            style={{ padding:"4px 10px", borderRadius:6, background:"rgba(37,211,102,0.12)",
              border:"1px solid rgba(37,211,102,0.3)", color:"#25D366",
              fontSize:10, textDecoration:"none", fontWeight:600 }}>
            💬 WA
          </a>
        )}
      </div>
 
      {/* Matches del día */}
      {(() => {
        const props = properties || [];
        const matchesHoy = activos
          .filter(l => filtroAg === "Todos" || l.ag === filtroAg)
          .map(l => ({ lead: l, matches: matchLeadProps(l, props) }))
          .filter(m => m.matches.length > 0)
          .slice(0, 6);
 
        if (!matchesHoy.length) return null;
 
        return (
          <div style={{ marginTop:14, background:B.sidebar, border:`1px solid ${B.border}`,
            borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
              📌 MATCHES DEL DÍA — propiedades en cartera que encajan con tus leads
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {matchesHoy.map(({ lead, matches }) => (
                <div key={lead.id} style={{ background:B.card, border:`1px solid ${B.border}`,
                  borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                    {lead.nombre}
                    <span style={{ fontSize:10, color:B.muted, fontWeight:400, marginLeft:8 }}>
                      busca {lead.tipo} en {lead.zona} · USD {(lead.presup||0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {matches.slice(0, 2).map(prop => {
                      const msg = genMsgWhatsApp(lead, prop);
                      const wa = lead.tel
                        ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
                        : null;
                      return (
                        <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:10,
                          background:B.bg, borderRadius:7, padding:"8px 10px" }}>
                          <div style={{ flex:1, fontSize:11, color:B.muted }}>
                            <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                            {" · "}{prop.zona}
                            {" · "}<span style={{ color:B.accentL, fontFamily:"Georgia,serif" }}>
                              USD {(prop.precio||0).toLocaleString()}
                            </span>
                            {prop.dir && <span style={{ color:B.dim }}> · {prop.dir}</span>}
                          </div>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer"
                              style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap",
                                background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                              💬 WA listo
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
 
    </div>
  );
}
 
// ── Main ──────────────────────────────────────────────────────
export default function Briefing({ leads, properties }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
 
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);
 
  // ── Métricas totales ────────────────────────────────────────
  const pipeline = filtrados
    .filter(l => l.etapa === "Negociación" || l.etapa === "Visita")
    .reduce((s, l) => s + (l.presup || 0), 0);
 
  const calientes = filtrados.filter(l => {
    const s = (l.scoring || "").toLowerCase();
    return s.includes("caliente") || l.etapa === "Negociación";
  }).length;
 
  const propsActivas = (properties || []).filter(p => p.activa !== false).length;
 
  const leadsNuevosMes = leads.filter(l => {
    if (!l.created_at) return false;
    return new Date(l.created_at) >= inicioMes;
  }).length;
 
  const pipelineMes = filtrados
    .filter(l => {
      const enMes = l.created_at && new Date(l.created_at) >= inicioMes;
      return enMes && (l.etapa === "Negociación" || l.etapa === "Visita");
    })
    .reduce((s, l) => s + (l.presup || 0), 0);
 
  // ── Leads urgentes ──────────────────────────────────────────
  const urgentes = useMemo(() => {
    return filtrados
      .map(l => {
        let score = 0;
        if (l.etapa === "Negociación") score += 100;
        if (l.etapa === "Visita")      score += 70;
        if (l.dias === 0)              score += 50;
        if (l.dias <= 2)               score += 40;
        if (l.dias <= 5)               score += 20;
        if ((l.prob || 0) >= 60)       score += 30;
        const s = (l.scoring || "").toLowerCase();
        if (s.includes("caliente"))    score += 25;
        return { ...l, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);
  }, [filtrados]);
 
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
          <h1 style={{ fontSize:22, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>
            {saludo} ☀️
          </h1>
          <div style={{ fontSize:11, color:B.muted, marginTop:3 }}>
            {hoy.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>
        </div>
        {/* Filtro agente */}
        <div style={{ display:"flex", gap:5 }}>
          {["Todos","C","A","F","L"].map(a => (
            <button key={a} onClick={() => setFiltroAg(a)} style={chipAg(a)}>
              {a === "Todos" ? "Todos" : AG[a]?.n || a}
            </button>
          ))}
        </div>
      </div>
 
      {/* Gauges */}
      <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14,
        padding:"20px 16px", marginBottom:16,
        display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:16 }}>
        <Gauge value={pipeline} max={Math.max(pipeline * 2, 1000000)}
          label="Pipeline activo" sublabel="Visita + Negociación"
          color={B.accentL} prefix="USD" />
        <Gauge value={pipelineMes} max={Math.max(pipeline, 100000)}
          label="Pipeline este mes" sublabel={hoy.toLocaleDateString("es-AR",{month:"long"})}
          color="#2E9E6A" prefix="USD" />
        <Gauge value={calientes} max={Math.max(activos.length * 0.4, 10)}
          label="Leads calientes" sublabel="Caliente + Negociación"
          color={B.hot} suffix="" />
        <Gauge value={leadsNuevosMes} max={30}
          label="Leads nuevos" sublabel="Este mes"
          color={B.warm} suffix="" />
        <Gauge value={propsActivas} max={50}
          label="Propiedades" sublabel="En cartera activa"
          color="#9B6DC8" suffix="" />
      </div>
 
      {/* Dos columnas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
 
        {/* Leads urgentes */}
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
            🔥 LLAMAR HOY
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {urgentes.length === 0 && (
              <div style={{ textAlign:"center", padding:"20px 0", color:B.dim, fontSize:12 }}>
                Sin leads urgentes — ¡buen trabajo!
              </div>
            )}
            {urgentes.map(l => <LeadCard key={l.id} lead={l} />)}
          </div>
        </div>
 
        {/* Pipeline */}
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16,
          display:"flex", flexDirection:"column", gap:20 }}>
          <PipelineBar leads={filtrados} />
 
          {/* Resumen rápido */}
          <div>
            <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:10 }}>
              RESUMEN RÁPIDO
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { label:"Sin asignar", val: activos.filter(l=>!l.ag).length, color:B.hot },
                { label:"Sin próx. acción", val: activos.filter(l=>!l.proxAccion).length, color:B.warm },
                { label:"Prob. alta (≥70%)", val: activos.filter(l=>(l.prob||0)>=70).length, color:B.ok },
                { label:"Fríos (+15 días)", val: activos.filter(l=>l.dias>15).length, color:B.dim },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                  fontSize:11, color:B.muted }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
 
 
      {/* Matches del día */}
      {(() => {
        const props = properties || [];
        const matchesHoy = activos
          .filter(l => filtroAg === "Todos" || l.ag === filtroAg)
          .map(l => ({ lead: l, matches: matchLeadProps(l, props) }))
          .filter(m => m.matches.length > 0)
          .slice(0, 6);
 
        if (!matchesHoy.length) return null;
 
        return (
          <div style={{ marginTop:14, background:B.sidebar, border:`1px solid ${B.border}`,
            borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
              📌 MATCHES DEL DÍA — propiedades en cartera que encajan con tus leads
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {matchesHoy.map(({ lead, matches }) => (
                <div key={lead.id} style={{ background:B.card, border:`1px solid ${B.border}`,
                  borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                    {lead.nombre}
                    <span style={{ fontSize:10, color:B.muted, fontWeight:400, marginLeft:8 }}>
                      busca {lead.tipo} en {lead.zona} · USD {(lead.presup||0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {matches.slice(0, 2).map(prop => {
                      const msg = genMsgWhatsApp(lead, prop);
                      const wa = lead.tel
                        ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
                        : null;
                      return (
                        <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:10,
                          background:B.bg, borderRadius:7, padding:"8px 10px" }}>
                          <div style={{ flex:1, fontSize:11, color:B.muted }}>
                            <span style={{ color:B.text, fontWeight:600 }}>{prop.tipo}</span>
                            {" · "}{prop.zona}
                            {" · "}<span style={{ color:B.accentL, fontFamily:"Georgia,serif" }}>
                              USD {(prop.precio||0).toLocaleString()}
                            </span>
                            {prop.dir && <span style={{ color:B.dim }}> · {prop.dir}</span>}
                          </div>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer"
                              style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap",
                                background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                color:"#25D366", fontSize:10, textDecoration:"none", fontWeight:600 }}>
                              💬 WA listo
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
 
    </div>
  );
}
