import React, { useMemo, useState } from "react";
import { B, AG, matchLeadProps, genMsgWhatsApp } from "../data/constants.js";
import Tareas from "./Tareas.jsx";
 
function Gauge({ value, max, label, sublabel, color, prefix = "", suffix = "" }) {
  const canvasRef = React.useRef(null);
  const pct = Math.min(value / (max || 1), 1);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.78;
    const r = W * 0.38;
    const startAngle = Math.PI * 0.85;
    const endAngle   = Math.PI * 2.15;
    const totalArc   = endAngle - startAngle;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = "#0F1E35";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();
    if (pct > 0) {
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, color + "66");
      grad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalArc * pct);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    const angle = startAngle + totalArc * pct;
    const nx = cx + (r - 3) * Math.cos(angle);
    const ny = cy + (r - 3) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0F1E35";
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
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, minWidth:0 }}>
      <canvas ref={canvasRef} width={120} height={80} style={{ width:100, height:68 }} />
      <div style={{ fontSize:18, fontWeight:600, color, fontFamily:"'Cormorant Garamond',Georgia,serif",
        marginTop:-8, letterSpacing:"0.5px", lineHeight:1 }}>{fmt(value)}</div>
      <div style={{ fontSize:11, color:"#A8C8E8", fontWeight:500, marginTop:4, textAlign:"center", lineHeight:1.3 }}>{label}</div>
      {sublabel && <div style={{ fontSize:12, color:"#4A6A9A", marginTop:2 }}>{sublabel}</div>}
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
      <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:10, textTransform:"uppercase" }}>EMBUDO COMERCIAL</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {etapas.map((e, i) => {
          const n = activos.filter(l => l.etapa === e).length;
          const pct = (n / total) * 100;
          const isCuello = i > 0 && n < activos.filter(l => l.etapa === etapas[i-1]).length * 0.3 && n > 0;
          return (
            <div key={e} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:12, color:"#8AAECC", width:110, textAlign:"right", flexShrink:0 }}>{e}</div>
              <div style={{ flex:1, height:8, background:"#4A6A90", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", background:colors[i], borderRadius:4, transition:"width .6s ease" }} />
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:colors[i], width:28, flexShrink:0 }}>{n}</div>
              {isCuello && <div style={{ fontSize:11, color:B.hot }}>⚠️</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function LeadCard({ lead }) {
  const [open, setOpen] = React.useState(false);
  const ag = AG[lead.ag];
  const waLink = lead.tel ? 'https://wa.me/' + lead.tel.replace(/\D/g, '') : null;
  const urgColor = lead.etapa === 'Negociación' ? B.ok : lead.dias <= 2 ? B.hot : lead.dias <= 5 ? B.warm : B.accentL;
  const razon = lead.etapa === 'Negociación' ? 'En negociación' : lead.dias === 0 ? 'Nuevo hoy' : lead.dias <= 2 ? lead.dias+'d — Caliente' : lead.dias <= 5 ? lead.dias+'d — Tibio' : lead.dias+'d sin contacto';
  return (
    <div style={{ background:B.card, border:'1px solid ' + urgColor + '40', borderLeft:'3px solid ' + urgColor, borderRadius:10, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding:'12px 14px', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#E8F0FA' }}>{lead.nombre}</span>
          {ag && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:ag.bg||'rgba(42,91,173,0.25)', color:ag.c, fontWeight:700, border:'1px solid '+ag.c+'40' }}>{ag.n}</span>}
          <span style={{ fontSize:11, color:urgColor, fontWeight:700, marginLeft:'auto' }}>{razon} {open ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontSize:12, color:'#8AAECC' }}>{lead.zona} · {lead.tipo} · {lead.presup ? 'USD ' + lead.presup.toLocaleString() : '—'}</div>
        {!open && lead.nota && <div style={{ fontSize:12, color:'#6A8AAE', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:'italic' }}>{lead.nota}</div>}
      </div>
      {open && (
        <div style={{ borderTop:'1px solid ' + urgColor + '30', padding:'12px 14px', background:'rgba(10,21,37,0.5)', display:'flex', flexDirection:'column', gap:10 }}>
          {lead.nota && <div style={{ fontSize:13, color:'#A8C8E8', lineHeight:1.6, fontStyle:'italic' }}>{lead.nota}</div>}
          {lead.proxAccion && <div style={{ fontSize:12, color:'#8AAECC' }}><span style={{ color:'#5A8AAE', fontWeight:600, fontSize:11 }}>PROXIMA ACCION: </span>{lead.proxAccion}</div>}
          {lead.notaImp && <div style={{ fontSize:12, color:B.warm }}><span style={{ fontWeight:600 }}>⚠ </span>{lead.notaImp}</div>}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {lead.etapa && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:10, background:urgColor+'22', color:urgColor, fontWeight:600, border:'1px solid '+urgColor+'40' }}>{lead.etapa}</span>}
            {lead.op && <span style={{ fontSize:11, color:'#8AAECC' }}>{lead.op}</span>}
            {lead.origen && <span style={{ fontSize:11, color:'#6A8AAE' }}>via {lead.origen}</span>}
            {lead.tel && <span style={{ fontSize:11, color:'#8AAECC' }}>Tel: {lead.tel}</span>}
            {waLink && <a href={waLink} target='_blank' rel='noreferrer' style={{ marginLeft:'auto', padding:'5px 14px', borderRadius:6, background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', fontSize:12, textDecoration:'none', fontWeight:600 }}>WhatsApp</a>}
          </div>
        </div>
      )}
    </div>
  );
}



function CalendarioSemanal({ supabase }) {
  const [tareas, setTareas] = React.useState([]);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d;
  });
  const DIAS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
  const PRIO_COLOR = { urgente:"#CC2233", importante:"#E8A830", normal:"#4A8ABE" };

  React.useEffect(() => {
    if (!supabase) return;
    const desde = lunes.toISOString().slice(0,10);
    const hasta = new Date(lunes.getTime() + 6*86400000).toISOString().slice(0,10);
    supabase.from("tareas").select("*").eq("completada", false)
      .gte("fecha", desde).lte("fecha", hasta)
      .then(({ data }) => setTareas(data || []));
  }, []);

  const tareasDelDia = (d) => tareas.filter(t => t.fecha === d.toISOString().slice(0,10));
  const totalSemana = tareas.length;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase" }}>📅 Esta semana</span>
        {totalSemana > 0 && <span style={{ fontSize:11, color:B.accentL, background:B.accentL+"18", padding:"1px 7px", borderRadius:8, fontWeight:600 }}>{totalSemana} tareas</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6 }}>
        {semana.map((dia, i) => {
          const isHoy = dia.toDateString() === hoy.toDateString();
          const td = tareasDelDia(dia);
          return (
            <div key={i}>
              <div style={{ textAlign:"center", marginBottom:6 }}>
                <div style={{ fontSize:10, color: isHoy ? B.accentL : "#6A8AAE", fontWeight: isHoy ? 700 : 400 }}>{DIAS[i]}</div>
                <div style={{ fontSize:16, fontWeight: isHoy ? 700 : 400,
                  color: isHoy ? "#fff" : "#8AAECC",
                  background: isHoy ? B.accentL : "transparent",
                  borderRadius:"50%", width:28, height:28,
                  display:"flex", alignItems:"center", justifyContent:"center", margin:"2px auto" }}>
                  {dia.getDate()}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:2, minHeight:40 }}>
                {td.length === 0 ? (
                  <div style={{ height:3, borderRadius:2, background:B.border, opacity:0.3, margin:"4px 0" }} />
                ) : td.map(t => (
                  <div key={t.id} title={t.titulo}
                    style={{ fontSize:9, padding:"2px 4px", borderRadius:3,
                      background: (PRIO_COLOR[t.prioridad]||"#4A8ABE") + "20",
                      color: PRIO_COLOR[t.prioridad]||"#4A8ABE",
                      border: "1px solid " + (PRIO_COLOR[t.prioridad]||"#4A8ABE") + "40",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      lineHeight:1.4 }}>
                    {t.titulo}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {totalSemana === 0 && (
        <div style={{ textAlign:"center", fontSize:12, color:"#4A6A90", marginTop:8 }}>
          Sin tareas esta semana
        </div>
      )}
    </div>
  );
}

export default function Briefing({ leads, properties, supabase }) {
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
    <div style={{ width:"100%", maxWidth:"100%", minWidth:0, overflowX:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:600, color:"#D0DDEE", margin:0, fontFamily:"Cormorant Garamond,Georgia,serif", letterSpacing:"0.5px" }}>{saludo} ✦</h1>
          <div style={{ fontSize:11, color:"#8AAECC", marginTop:3 }}>{hoy.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
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
      <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:"16px 8px", marginBottom:14, display:"flex", justifyContent:"space-between", gap:4, overflowX:"auto" }}>
        <Gauge value={pipeline} max={Math.max(pipeline * 2, 1000000)} label="Pipeline activo" sublabel="Visita + Neg." color={B.accentL} prefix="USD" />
        <Gauge value={pipelineMes} max={Math.max(pipeline, 100000)} label="Pipeline mes" sublabel={hoy.toLocaleDateString("es-AR",{month:"long"})} color="#2E9E6A" prefix="USD" />
        <Gauge value={calientes} max={Math.max(activos.length * 0.4, 10)} label="Calientes" color={B.hot} />
        <Gauge value={leadsNuevosMes} max={30} label="Leads nuevos" sublabel="Este mes" color={B.warm} />
        <Gauge value={propsActivas} max={50} label="Propiedades" sublabel="En cartera" color="#9B6DC8" />
      </div>

      {/* Fila 1: Insights | Calendario */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16, display:"flex", flexDirection:"column", gap:20 }}>
          <PipelineBar leads={filtrados} />
          <div>
            <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:10, textTransform:"uppercase" }}>Resumen rápido</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { label:"Sin asignar",       val: activos.filter(l=>!l.ag).length,          color:B.hot  },
                { label:"Sin próx. acción",  val: activos.filter(l=>!l.proxAccion).length,   color:B.warm },
                { label:"Prob. alta (≥70%)", val: activos.filter(l=>(l.prob||0)>=70).length, color:B.ok   },
                { label:"Fríos (+15 días)",  val: activos.filter(l=>l.dias>15).length,        color:B.dim  },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#7A9ABE" }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
          <CalendarioSemanal supabase={supabase} />
        </div>
      </div>

      {/* Fila 2: Tareas */}
      <div style={{ marginBottom:14 }}>
        <Tareas supabase={supabase} />
      </div>

      {/* Fila 3: Llamar hoy */}
      <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:12, textTransform:"uppercase" }}>🔥 Llamar hoy</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {urgentes.length === 0 && <div style={{ textAlign:"center", padding:"20px 0", color:B.dim, fontSize:12 }}>Sin leads urgentes</div>}
          {urgentes.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      </div>

      {/* Fila 4: Matches del día */}
      {matchesHoy.length > 0 && (
        <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:12, textTransform:"uppercase" }}>
            📌 Matches del día — propiedades que encajan con tus leads
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {matchesHoy.map(({ lead, matches }) => (
              <div key={lead.id} style={{ background:B.card, border:"1px solid " + B.border, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:B.text, marginBottom:8 }}>
                  {lead.nombre}
                  <span style={{ fontSize:12, color:"#8AAECC", fontWeight:400, marginLeft:8 }}>
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
                          {prop.dir && <span style={{ color:B.muted }}> · {prop.dir}</span>}
                        </div>
                        {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap", background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)", color:"#25D366", fontSize:12, textDecoration:"none", fontWeight:600 }}>💬 WA listo</a>}
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
