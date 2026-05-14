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
 
function InsightPanel({ leads, properties }) {
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  // Señales reales de alarma
  const sinAsignar     = activos.filter(l => !l.ag);
  const calientes      = activos.filter(l => l.dias <= 2);
  const enNegociacion  = activos.filter(l => l.etapa === "Negociación");
  const frios          = activos.filter(l => l.dias > 15 && l.etapa !== "Negociación");
  const sinAccion      = activos.filter(l => !l.proxAccion && l.dias > 3);
  const propsSinInteresados = (properties || []).filter(p => {
    const matches = activos.filter(l => {
      const zona = (l.zona||"").toLowerCase();
      const pZona = (p.zona||"").toLowerCase();
      const zonas = zona.split(/[,\/]|\s+y\s+/).map(z => z.trim());
      return zonas.some(z => pZona.includes(z) || z.includes(pZona));
    });
    return matches.length === 0;
  });

  // Embudo simplificado — solo lo que importa
  const visitas      = activos.filter(l => l.etapa === "Visita").length;
  const negociacion  = activos.filter(l => l.etapa === "Negociación").length;
  const pipeline     = enNegociacion.reduce((s, l) => s + (l.presup||0), 0);
  const convRate     = activos.length > 0 ? Math.round((negociacion / activos.length) * 100) : 0;

  const alarmas = [
    sinAsignar.length > 0 && { texto: `${sinAsignar.length} lead${sinAsignar.length>1?"s":""} sin agente`, color:"#CC2233", urgente:true },
    sinAccion.length > 0  && { texto: `${sinAccion.length} sin proxima accion (+3d)`, color:"#E8A830", urgente:false },
    frios.length > 0      && { texto: `${frios.length} frio${frios.length>1?"s":""} (+15 dias sin contacto)`, color:"#4A8ABE", urgente:false },
    propsSinInteresados.length > 0 && { texto: `${propsSinInteresados.length} propiedad${propsSinInteresados.length>1?"es":""} sin interesados`, color:"#9B6DC8", urgente:false },
  ].filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* KPIs clave */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { label:"En negociación", val:negociacion, color:B.ok, sub: pipeline > 0 ? "USD "+pipeline.toLocaleString() : "Sin monto" },
          { label:"Visitas", val:visitas, color:B.warm, sub: activos.length+" activos" },
          { label:"Calientes hoy", val:calientes.length, color:B.hot, sub:"Hasta 2 dias sin contacto" },
          { label:"Conversion", val:convRate+"%", color:B.accentL, sub:"A negociacion" },
        ].map(k => (
          <div key={k.label} style={{ background:B.card, borderRadius:8, padding:"10px 12px",
            border:"1px solid " + B.border }}>
            <div style={{ fontSize:18, fontWeight:700, color:k.color, fontFamily:"Georgia,serif", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#E8F0FA", fontWeight:500, marginTop:3 }}>{k.label}</div>
            <div style={{ fontSize:10, color:"#6A8AAE", marginTop:1 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alarmas accionables */}
      {alarmas.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <div style={{ fontSize:10, color:"#4A6A90", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:2 }}>Requieren atencion</div>
          {alarmas.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
              background:a.color+"12", border:"1px solid "+a.color+"30", borderRadius:8 }}>
              <span style={{ fontSize:12, color:a.urgente ? "#E8F0FA" : "#8AAECC", fontWeight:a.urgente?600:400 }}>{a.texto}</span>
              {a.urgente && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4, background:a.color+"30", color:a.color, fontWeight:700, marginLeft:"auto" }}>AHORA</span>}
            </div>
          ))}
        </div>
      )}
      {alarmas.length === 0 && (
        <div style={{ fontSize:12, color:"#2E9E6A", textAlign:"center", padding:"8px 0", fontWeight:500 }}>Todo en orden</div>
      )}
    </div>
  );
}
 
const PREGUNTAS = [
  { key:'q_visitas_previas',   label:'¿Cuánto tiempo llevás buscando?',         placeholder:'ej: 2 semanas, 6 meses...' },
  { key:'q_freno',             label:'¿Qué te frenó en propiedades anteriores?', placeholder:'ej: precio, ubicación...' },
  { key:'q_tiene_para_vender', label:'¿Tenés algo para vender o permutar?',     placeholder:'ej: depto en Centro' },
  { key:'q_fecha_limite',      label:'¿Hay una fecha límite para decidir?',     placeholder:'ej: vence alquiler en agosto' },
];

function LeadCard({ lead, updateLead }) {
  const [open,      setOpen]      = React.useState(false);
  const [editQ,     setEditQ]     = React.useState(null);
  const [valQ,      setValQ]      = React.useState('');
  const [savingQ,   setSavingQ]   = React.useState(false);
  const ag = AG[lead.ag];
  const waLink = lead.tel ? 'https://wa.me/' + lead.tel.replace(/\D/g, '') : null;
  const urgColor = lead.etapa === 'Negociación' ? B.ok : lead.dias <= 2 ? B.hot : lead.dias <= 5 ? B.warm : B.accentL;
  const razon = lead.etapa === 'Negociación' ? 'En negociación' : lead.dias === 0 ? 'Nuevo hoy' : lead.dias <= 2 ? lead.dias+'d — Caliente' : lead.dias <= 5 ? lead.dias+'d — Tibio' : lead.dias+'d sin contacto';

  const respondidas = PREGUNTAS.filter(p => lead[p.key]).length;
  const pct = Math.round((respondidas / PREGUNTAS.length) * 100);
  const calColor = respondidas <= 1 ? B.hot : respondidas <= 3 ? B.warm : B.ok;

  async function guardarPregunta(key) {
    setSavingQ(true);
    if (updateLead) await updateLead(lead.id, { [key]: valQ });
    lead[key] = valQ;
    setEditQ(null);
    setSavingQ(false);
  }

  return (
    <div style={{ background:B.card, border:'1px solid ' + urgColor + '40', borderLeft:'3px solid ' + urgColor, borderRadius:10, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding:'12px 14px', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#E8F0FA' }}>{lead.nombre}</span>
          {ag && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:ag.bg||'rgba(42,91,173,0.25)', color:ag.c, fontWeight:700, border:'1px solid '+ag.c+'40' }}>{ag.n}</span>}
          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:calColor+'22', color:calColor, border:'1px solid '+calColor+'40', fontWeight:700 }}>
            {respondidas}/{PREGUNTAS.length} calificado
          </span>
          <span style={{ fontSize:11, color:urgColor, fontWeight:700, marginLeft:'auto' }}>{razon}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginLeft:4, verticalAlign:'middle', transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M4 6L8 10L12 6" stroke={urgColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        <div style={{ fontSize:12, color:'#8AAECC', marginBottom:4 }}>{lead.zona} · {lead.tipo} · {lead.presup ? 'USD ' + lead.presup.toLocaleString() : '—'}</div>
        <div style={{ height:3, background:B.border, borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:pct+'%', background:calColor, borderRadius:2, transition:'width 0.3s' }} />
        </div>
      </div>
      {open && (
        <div style={{ borderTop:'1px solid ' + urgColor + '30', padding:'12px 14px', background:'rgba(10,21,37,0.5)', display:'flex', flexDirection:'column', gap:10 }}>
          {lead.nota && <div style={{ fontSize:13, color:'#A8C8E8', lineHeight:1.6, fontStyle:'italic' }}>{lead.nota}</div>}
          {lead.proxAccion && <div style={{ fontSize:12, color:'#8AAECC' }}><span style={{ color:'#5A8AAE', fontWeight:600, fontSize:11 }}>PROXIMA ACCION: </span>{lead.proxAccion}</div>}
          {lead.notaImp && <div style={{ fontSize:12, color:B.warm, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={B.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.77 3h16.82a2 2 0 0 0 1.77-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {lead.notaImp}
          </div>}

          <div style={{ background:'rgba(10,21,37,0.4)', borderRadius:8, padding:'10px 12px', border:'1px solid '+B.border }}>
            <div style={{ fontSize:10, fontWeight:700, color:B.accentL, letterSpacing:'0.8px', marginBottom:8 }}>CALIFICACION DEL LEAD</div>
            {PREGUNTAS.map(p => (
              <div key={p.key} style={{ marginBottom:6 }}>
                {editQ === p.key ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <input autoFocus value={valQ} onChange={e=>setValQ(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') guardarPregunta(p.key); if(e.key==='Escape') setEditQ(null); }}
                      placeholder={p.placeholder}
                      style={{ flex:1, background:B.bg, border:'1px solid '+B.accentL, borderRadius:5, padding:'4px 8px', color:B.text, fontSize:11, outline:'none' }} />
                    <button onClick={()=>guardarPregunta(p.key)} disabled={savingQ}
                      style={{ padding:'4px 10px', borderRadius:5, cursor:'pointer', background:B.accent, border:'none', color:'#fff', fontSize:11, fontWeight:700 }}>
                      {savingQ?'...':'OK'}
                    </button>
                    <button onClick={()=>setEditQ(null)}
                      style={{ padding:'4px 8px', borderRadius:5, cursor:'pointer', background:'transparent', border:'1px solid '+B.border, color:'#8AAECC', fontSize:11 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8AAECC" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <div onClick={()=>{ setEditQ(p.key); setValQ(lead[p.key]||''); }}
                    style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'3px 6px', borderRadius:5, background: lead[p.key]?'rgba(46,158,106,0.08)':'rgba(204,34,51,0.06)' }}>
                    <span style={{ fontSize:13, flexShrink:0, color: lead[p.key] ? '#2E9E6A' : '#4A6A90' }}>
                      {lead[p.key] ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6A90" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                      )}
                    </span>
                    <span style={{ fontSize:11, color:'#8AAECC', flex:1 }}>{p.label}</span>
                    {lead[p.key]
                      ? <span style={{ fontSize:11, color:'#A8C8E8', fontStyle:'italic' }}>{lead[p.key]}</span>
                      : <span style={{ fontSize:10, color:B.hot }}>Sin dato — click para completar</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

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
  const [tareas,    setTareas]    = React.useState([]);
  const [vistaM,    setVistaM]    = React.useState(false);
  const [mesBase,   setMesBase]   = React.useState(new Date());
  const [diaPopup,  setDiaPopup]  = React.useState(null); // { dia, tareas }
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const DIAS  = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const PRIO_COLOR = { urgente:"#CC2233", importante:"#E8A830", normal:"#4A8ABE" };

  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semana = Array.from({ length:7 }, (_,i) => { const d = new Date(lunes); d.setDate(lunes.getDate()+i); return d; });

  const primerDiaMes = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const diasEnMes = new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0).getDate();
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7;
  const celdas = Array.from({ length: offsetInicio + diasEnMes }, (_,i) => {
    if (i < offsetInicio) return null;
    return new Date(mesBase.getFullYear(), mesBase.getMonth(), i - offsetInicio + 1);
  });

  React.useEffect(() => {
    if (!supabase) return;
    const desde = vistaM
      ? new Date(mesBase.getFullYear(), mesBase.getMonth(), 1).toISOString().slice(0,10)
      : lunes.toISOString().slice(0,10);
    const hasta = vistaM
      ? new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0).toISOString().slice(0,10)
      : new Date(lunes.getTime() + 6*86400000).toISOString().slice(0,10);
    supabase.from("tareas").select("*").eq("completada", false)
      .gte("fecha", desde).lte("fecha", hasta)
      .then(({ data }) => setTareas(data || []));
  }, [vistaM, mesBase.getMonth()]);

  const tareasDelDia = (d) => d ? tareas.filter(t => t.fecha === d.toISOString().slice(0,10)) : [];

  const DiaCell = ({ dia, mini }) => {
    if (!dia) return <div style={{ background:"transparent" }} />;
    const isHoy = dia.toDateString() === hoy.toDateString();
    const td = tareasDelDia(dia);
    const cellH = mini ? 56 : 70;

    return (
      <div onClick={() => setDiaPopup({ dia, tareas: td })}
        style={{ height:cellH, borderRadius:6, cursor:"pointer", padding:"4px 3px",
          background: isHoy ? "rgba(42,91,173,0.15)" : "rgba(10,21,37,0.3)",
          border:`1px solid ${isHoy ? B.accentL+"60" : B.border}`,
          display:"flex", flexDirection:"column", gap:2, overflow:"hidden",
          transition:"background 0.15s" }}>
        {/* Número del día */}
        <div style={{ fontSize: mini ? 10 : 12, fontWeight: isHoy ? 700 : 400,
          color: isHoy ? "#fff" : "#8AAECC", textAlign:"center",
          background: isHoy ? B.accentL : "transparent",
          borderRadius:"50%", width:18, height:18, lineHeight:"18px",
          margin:"0 auto 2px" }}>
          {dia.getDate()}
        </div>
        {/* Tareas del día */}
        {td.slice(0, 2).map(t => (
          <div key={t.id}
            style={{ fontSize:8, padding:"1px 3px", borderRadius:2, lineHeight:1.4,
              background:(PRIO_COLOR[t.prioridad]||"#4A8ABE")+"25",
              color:PRIO_COLOR[t.prioridad]||"#4A8ABE",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {t.titulo}
          </div>
        ))}
        {td.length > 2 && (
          <div style={{ fontSize:8, color:"#4A6A90", textAlign:"center" }}>+{td.length-2}</div>
        )}
        {td.length === 0 && (
          <div style={{ flex:1, borderBottom:`1px solid ${B.border}`, opacity:0.2, margin:"4px 4px 0" }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ position:"relative" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {vistaM ? (
            <>
              <button onClick={()=>setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()-1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>‹</button>
              <span style={{ fontSize:12, fontWeight:600, color:B.text }}>{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</span>
              <button onClick={()=>setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>›</button>
            </>
          ) : (
            <span style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px" }}>ESTA SEMANA</span>
          )}
        </div>
        <div style={{ display:"flex", gap:3, background:B.card, borderRadius:6, padding:2, border:`1px solid ${B.border}` }}>
          {["Semana","Mes"].map((v,i) => (
            <button key={v} onClick={()=>setVistaM(i===1)}
              style={{ padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:10, fontWeight:600, border:"none",
                background:vistaM===(i===1)?B.accent:"transparent",
                color:vistaM===(i===1)?"#fff":"#8AAECC" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Headers días */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap: vistaM?3:5, marginBottom: vistaM?3:5 }}>
        {DIAS.map((d,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:9, color:"#6A8AAE", fontWeight:600 }}>{d}</div>
        ))}
      </div>

      {/* Grid semana */}
      {!vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
          {semana.map((dia,i) => <DiaCell key={i} dia={dia} mini={false} />)}
        </div>
      )}

      {/* Grid mes */}
      {vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {celdas.map((dia,i) => <DiaCell key={i} dia={dia} mini={true} />)}
        </div>
      )}

      {/* Popup día */}
      {diaPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={()=>setDiaPopup(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.accentL}40`, borderRadius:14, padding:20, minWidth:280, maxWidth:360 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:B.text }}>
                {diaPopup.dia.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}
              </div>
              <button onClick={()=>setDiaPopup(null)}
                style={{ background:"transparent", border:"none", color:"#4A6A90", cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
            {diaPopup.tareas.length === 0 ? (
              <div style={{ fontSize:12, color:"#4A6A90", textAlign:"center", padding:"16px 0" }}>Sin tareas este día</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {diaPopup.tareas.map(t => {
                  const col = PRIO_COLOR[t.prioridad] || "#4A8ABE";
                  return (
                    <div key={t.id} style={{ padding:"10px 12px", borderRadius:8,
                      background:col+"15", border:`1px solid ${col}40`, borderLeft:`3px solid ${col}` }}>
                      <div style={{ fontSize:13, fontWeight:600, color:B.text }}>{t.titulo}</div>
                      {t.nota && <div style={{ fontSize:11, color:"#8AAECC", marginTop:4 }}>{t.nota}</div>}
                      <div style={{ fontSize:10, color:"#4A6A90", marginTop:4, display:"flex", gap:8 }}>
                        <span>{t.prioridad}</span>
                        {t.ag && <span>· {t.ag}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenCaptacionZonas({ supabase }) {
  const [semana, setSemana] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  const getLunes = () => {
    const hoy = new Date();
    const l = new Date(hoy);
    l.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return l.toISOString().slice(0,10);
  };

  const ACCIONES = [
    { key:"contactos", dia:"Lunes",    label:"5 propietarios en ZonaProp" },
    { key:"recorrida", dia:"Miercoles",label:"Recorrida del barrio" },
    { key:"contenido", dia:"Viernes",  label:"Carrusel Instagram" },
  ];

  React.useEffect(() => {
    if (!supabase) return;
    supabase.from("captacion_zonas").select("*").eq("semana_inicio", getLunes()).limit(1)
      .then(({ data }) => { setSemana(data?.[0] || null); setLoaded(true); });
  }, []);

  if (!loaded) return null;

  return (
    <div>
      <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>CAPTACION DE ZONAS — ESTA SEMANA</div>
      {!semana ? (
        <div style={{ textAlign:"center", padding:"12px 0", color:"#4A6A90", fontSize:12 }}>
          Sin barrio activo esta semana —{" "}
          <span style={{ color:B.accentL, cursor:"pointer" }}
            onClick={()=>window.dispatchEvent(new CustomEvent("alba-nav", { detail:"zonas" }))}>
            Ir a Captación zonas →
          </span>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <span style={{ fontSize:16, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>{semana.barrio}</span>
              <span style={{ fontSize:11, color:"#8AAECC", marginLeft:8 }}>barrio activo</span>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:B.accentL }}>{semana.propietarios_contactados || 0}</div>
                <div style={{ fontSize:9, color:"#8AAECC" }}>contactados</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#2E9E6A" }}>{semana.propiedades_captadas || 0}</div>
                <div style={{ fontSize:9, color:"#8AAECC" }}>captadas</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {ACCIONES.map(a => {
              const done = (semana.acciones_completadas || {})[a.key];
              return (
                <div key={a.key} style={{ flex:1, padding:"6px 8px", borderRadius:7, textAlign:"center",
                  background: done ? "rgba(46,158,106,0.1)" : "rgba(42,91,173,0.08)",
                  border: `1px solid ${done ? "#2E9E6A40" : B.border}` }}>
                  <div style={{ fontSize:11, color: done ? "#2E9E6A" : "#8AAECC", fontWeight:600 }}>{done ? "Completada" : a.dia}</div>
                  <div style={{ fontSize:10, color:"#6A8AAE", marginTop:2 }}>{a.label}</div>
                </div>
              );
            })}
          </div>
          {semana.nota && (
            <div style={{ fontSize:11, color:"#6A8AAE", fontStyle:"italic", borderLeft:`2px solid ${B.border}`, paddingLeft:8 }}>
              {semana.nota}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Canales de captación ─────────────────────────────────────
const CANAL_CONFIG = {
  "facebook":          { label:"Facebook",     color:"#1877F2" },
  "instagram":         { label:"Instagram",    color:"#E1306C" },
  "zonaprop":          { label:"ZonaProp",     color:"#FF6B35" },
  "cartel":            { label:"Cartel",       color:"#E8A830" },
  "referido":          { label:"Referido",     color:"#2E9E6A" },
  "whatsapp":          { label:"WhatsApp",     color:"#25D366" },
  "whatsapp / referido":{ label:"WA/Referido", color:"#25D366" },
  "otro":              { label:"Otro",         color:"#8AAECC" },
};

function CanalesCaptacion({ leads }) {
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const total   = leads.length;

  // Agrupar por origen
  const conteo = {};
  leads.forEach(l => {
    const key = (l.origen||"otro").toLowerCase().trim();
    conteo[key] = (conteo[key]||0) + 1;
  });

  // Tasa de conversión por canal (cuántos llegaron a Negociación o Cerrado)
  const conversion = {};
  leads.forEach(l => {
    const key = (l.origen||"otro").toLowerCase().trim();
    if (l.etapa === "Negociación" || l.etapa === "Cerrado") {
      conversion[key] = (conversion[key]||0) + 1;
    }
  });

  const canales = Object.entries(conteo)
    .sort((a,b) => b[1]-a[1])
    .map(([key, cnt]) => {
      const cfg = CANAL_CONFIG[key] || { label:key, color:"#8AAECC" };
      const conv = conversion[key] || 0;
      const pct  = Math.round((cnt/total)*100);
      const convPct = Math.round((conv/cnt)*100);
      return { key, cfg, cnt, pct, conv, convPct };
    });

  const maxCnt = Math.max(...canales.map(c=>c.cnt), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:10, color:"#4A6A90", lineHeight:1.5 }}>
        La barra muestra volumen de leads. El porcentaje verde es conversion a negociacion/cierre.
      </div>

      {canales.map(({ key, cfg, cnt, pct, conv, convPct }) => (
        <div key={key}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:B.text }}>{cfg.label}</span>
              <span style={{ fontSize:11, color:"#4A6A90" }}>{cnt} leads · {pct}%</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              {conv > 0 && (
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
                  background:"rgba(46,158,106,0.15)", color:"#2E9E6A",
                  border:"1px solid rgba(46,158,106,0.3)", fontWeight:700 }}>
                  {convPct}% conv.
                </span>
              )}
            </div>
          </div>
          {/* Barra */}
          <div style={{ height:8, background:"rgba(10,21,37,0.5)", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(cnt/maxCnt)*100}%`,
              background:`linear-gradient(90deg, ${cfg.color}CC, ${cfg.color}88)`,
              borderRadius:4, transition:"width 0.4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Zonas agrupadas ──────────────────────────────────────────
const ZONAS_GRUPO = {
  "Costa Norte":  ["la perla","chauvin","playa grande","constitución","constitucion"],
  "Centro":       ["centro","microcentro","mitre","plaza colon","plaza colón","güemes","guemes","san juan"],
  "Costa Sur":    ["punta mogotes","alfar","divino rostro","peralta ramos"],
  "San Carlos":   ["san carlos","bosque grande","floresta","libertad","pompeya"],
  "Oeste":        ["don bosco","san josé","san jose","las heras","camet","villa primera"],
  "Norte":        ["los pinares","santa rosa","santa monica","parque luro","parque palermo"],
};

function getGrupo(zona) {
  if (!zona) return "Otros";
  const z = zona.toLowerCase();
  for (const [grupo, barrios] of Object.entries(ZONAS_GRUPO)) {
    if (barrios.some(b => z.includes(b))) return grupo;
  }
  return "Otros";
}

// Velocímetro — usa strokeDasharray para arco limpio
function Velocimetro({ value, max, label, sublabel, color }) {
  const pct = Math.min(1, value / Math.max(max, 1));
  const r = 34, cx = 50, cy = 54;
  const circum = 2 * Math.PI * r;
  // Mostramos 75% del círculo (270°)
  const trackLen = circum * 0.75;
  const valueLen = trackLen * pct;
  // Rotar para que empiece abajo-izquierda (135°)
  const rotate = 135;

  // Aguja
  const needleAngle = rotate + pct * 270;
  const nx = cx + (r - 8) * Math.cos((needleAngle - 90) * Math.PI / 180);
  const ny = cy + (r - 8) * Math.sin((needleAngle - 90) * Math.PI / 180);

  return (
    <div style={{ textAlign:"center", flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width="100" height="80" viewBox="0 0 100 80">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#1E3A5F" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${trackLen} ${circum}`}
          transform={`rotate(${rotate} ${cx} ${cy})`} />
        {/* Value */}
        {pct > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${valueLen} ${circum}`}
            transform={`rotate(${rotate} ${cx} ${cy})`} />
        )}
        {/* Aguja */}
        <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
          stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3.5" fill={color} />
        {/* Valor */}
        <text x={cx} y={cy+6} textAnchor="middle" fill={color}
          fontSize="16" fontWeight="700" fontFamily="Georgia,serif">{value}</text>
      </svg>
      <div style={{ fontSize:11, fontWeight:600, color:"#C8D8E8" }}>{label}</div>
      <div style={{ fontSize:10, color:"#4A6A90", marginTop:2 }}>{sublabel}</div>
    </div>
  );
}

function InteligenciaMercado({ leads, properties, captaciones }) {
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && !l.inversor);
  const calientes = activos.filter(l => l.dias <= 2).length;
  const tibios    = activos.filter(l => l.dias > 2 && l.dias <= 7).length;
  const frios     = activos.filter(l => l.dias > 7).length;

  // Propiedades
  const propsMias   = (properties||[]).filter(p => p.activa !== false).length;
  const capsActivas = (captaciones||[]).filter(c=>!c.convertida).length;
  const totalOferta = propsMias + capsActivas;

  // Demanda vs Oferta por zona
  const zonas = Object.keys(ZONAS_GRUPO);
  const demanda = {}, oferta = {};
  zonas.forEach(z => { demanda[z] = 0; oferta[z] = 0; });

  activos.forEach(l => {
    // Un lead puede buscar en múltiples zonas
    const partes = (l.zona||"").split(/[,/]|\s+y\s+/).map(z=>z.trim());
    const grupos = new Set(partes.map(getGrupo));
    grupos.forEach(g => { if (demanda[g] !== undefined) demanda[g]++; });
  });

  (properties||[]).filter(p=>p.activa!==false).forEach(p => {
    const g = getGrupo(p.zona);
    if (oferta[g] !== undefined) oferta[g]++;
  });
  (captaciones||[]).forEach(c => {
    const g = getGrupo(c.zona);
    if (oferta[g] !== undefined) oferta[g]++;
  });

  const maxBar = Math.max(...zonas.map(z => Math.max(demanda[z], oferta[z])), 1);

  const ZONA_COLORS = {
    "Costa Norte": "#3A8BC4",
    "Centro":      "#9B6DC8",
    "Costa Sur":   "#2E9E6A",
    "San Carlos":  "#E8A830",
    "Oeste":       "#CC2233",
    "Norte":       "#4A8ABE",
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>Inteligencia de mercado</div>
          <div style={{ fontSize:11, color:"#4A6A90", marginTop:2 }}>Demanda vs oferta por zona — identifica donde captar</div>
        </div>
      </div>

      {/* Velocímetros */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20,
        background:"rgba(7,14,28,0.4)", borderRadius:10, padding:"14px 8px" }}>
        <Velocimetro value={leads.length} max={150} label="Leads totales" sublabel="en el sistema" color={B.accentL} />
        <Velocimetro value={activos.length} max={80} label="Leads activos" sublabel={`${calientes}🔴 ${tibios}🟡 ${frios}🔵`} color="#E8A830" />
        <Velocimetro value={totalOferta} max={50} label="Oferta total" sublabel={`${propsMias} propias · ${capsActivas} captadas`} color="#2E9E6A" />
      </div>

      {/* Barras demanda vs oferta */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:6, marginBottom:4 }}>
          <div />
          <div style={{ fontSize:9, color:"#3A8BC4", fontWeight:700, letterSpacing:"0.8px", textAlign:"center" }}>DEMANDA (leads)</div>
          <div style={{ fontSize:9, color:"#2E9E6A", fontWeight:700, letterSpacing:"0.8px", textAlign:"center" }}>OFERTA (props)</div>
        </div>
        {zonas.map(zona => {
          const d = demanda[zona] || 0;
          const o = oferta[zona] || 0;
          const gap = d - o;
          const color = ZONA_COLORS[zona] || B.accentL;
          const barrios = ZONAS_GRUPO[zona]?.map(b => b.charAt(0).toUpperCase()+b.slice(1)).join(", ") || "";
          return (
            <div key={zona} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:6, alignItems:"center" }}>
              <div title={barrios}
                style={{ fontSize:11, color, fontWeight:600, textAlign:"right", paddingRight:8, cursor:"help", position:"relative" }}
                onMouseEnter={e=>{ const t = e.currentTarget.querySelector(".tz"); if(t) t.style.display="block"; }}
                onMouseLeave={e=>{ const t = e.currentTarget.querySelector(".tz"); if(t) t.style.display="none"; }}>
                {zona}
                <div className="tz" style={{ display:"none", position:"absolute", right:"100%", top:"50%", transform:"translateY(-50%)",
                  background:"#0A1525", border:`1px solid ${color}40`, borderRadius:8, padding:"6px 10px",
                  fontSize:10, color:"#C8D8E8", whiteSpace:"nowrap", zIndex:100, marginRight:6,
                  boxShadow:"0 4px 12px rgba(0,0,0,0.5)", lineHeight:1.6 }}>
                  <div style={{ fontWeight:700, color, marginBottom:3 }}>{zona}</div>
                  {barrios}
                </div>
              </div>
              {/* Barra demanda */}
              <div style={{ position:"relative", height:22, background:"rgba(58,139,196,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(d/maxBar)*100}%`, background:"#3A8BC4", borderRadius:4, transition:"width 0.4s",
                  display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:6 }}>
                  {d > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{d}</span>}
                </div>
                {d === 0 && <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#4A6A90" }}>0</span>}
              </div>
              {/* Barra oferta */}
              <div style={{ position:"relative", height:22, background:"rgba(46,158,106,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(o/maxBar)*100}%`, background:"#2E9E6A", borderRadius:4, transition:"width 0.4s",
                  display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:6 }}>
                  {o > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{o}</span>}
                </div>
                {o === 0 && <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#4A6A90" }}>0</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(42,91,173,0.08)", borderRadius:8,
        border:`1px solid ${B.border}`, fontSize:11, color:"#8AAECC", lineHeight:1.6 }}>
        Si la barra azul (demanda) supera la verde (oferta) en una zona, hay oportunidad de captacion. Prioriza captar en zonas con mas leads buscando que propiedades disponibles.
      </div>
    </div>
  );
}

// ── Hook responsive ──────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  React.useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

// ── Collapsible section ──────────────────────────────────────
function Collapsible({ title, badge, summary, color, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, overflow:"hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", cursor:"pointer",
          background: open ? "rgba(74,138,232,0.04)" : "transparent", transition:"background 0.2s" }}>
        <span style={{ fontSize:12, fontWeight:600, color:"#C8D8E8", letterSpacing:"0.8px", flex:1 }}>{title}</span>
        {badge > 0 && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
          background:"rgba(204,34,51,0.12)", color:"#CC2233", fontWeight:600 }}>{badge}</span>}
        {summary && !open && <span style={{ fontSize:11, color:"#4A6A90", marginRight:6 }}>{summary}</span>}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, transition:"transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4 6L8 10L12 6" stroke="#4A6A90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${B.border}` }}>
          <div style={{ paddingTop:16 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

export default function Briefing({ leads, properties, rentals, captaciones, supabase }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const mobile = useIsMobile(768);
  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);
 
  const enNegociacion = filtrados.filter(l => l.etapa === "Negociación").length;
  const leadsNuevosMes = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;
  const nCalientes = filtrados.filter(l => l.dias <= 2 || l.etapa === "Negociación").length;
  const propsActivas = (properties || []).filter(p => p.activa !== false).length;
  const totalProps = (properties || []).length;
 
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

  const alarmas = useMemo(() => {
    const sinAsignar     = filtrados.filter(l => !l.ag);
    const frios          = filtrados.filter(l => l.dias > 15 && l.etapa !== "Negociación");
    const sinAccion      = filtrados.filter(l => !l.proxAccion && l.dias > 3);
    const propsSinInteresados = (properties || []).filter(p => {
      const matches = filtrados.filter(l => {
        const zona = (l.zona||"").toLowerCase();
        const pZona = (p.zona||"").toLowerCase();
        const zonas = zona.split(/[,\/]|\s+y\s+/).map(z => z.trim());
        return zonas.some(z => pZona.includes(z) || z.includes(pZona));
      });
      return matches.length === 0;
    });
    return [
      sinAsignar.length > 0 && { texto: `${sinAsignar.length} lead${sinAsignar.length>1?"s":""} sin agente`, color:"#CC2233", urgente:true },
      sinAccion.length > 0  && { texto: `${sinAccion.length} sin próxima acción (+3d)`, color:"#E8A830", urgente:false },
      frios.length > 0      && { texto: `${frios.length} frío${frios.length>1?"s":""} (+15 días sin contacto)`, color:"#4A8ABE", urgente:false },
      propsSinInteresados.length > 0 && { texto: `${propsSinInteresados.length} propiedad${propsSinInteresados.length>1?"es":""} sin interesados`, color:"#9B6DC8", urgente:false },
    ].filter(Boolean);
  }, [filtrados, properties]);
 
  return (
    <div style={{ width:"100%", maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", gap: mobile ? 12 : 16, paddingBottom:40 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "flex-start" : "flex-end", justifyContent:"space-between", paddingBottom:16, borderBottom:`1px solid ${B.border}`, gap: mobile ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: mobile ? 10 : 11, color:"#4A6A90", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6, fontWeight:500 }}>
            {hoy.toLocaleDateString("es-AR", { weekday:"long" }).toUpperCase()} · {hoy.toLocaleDateString("es-AR", { day:"numeric", month:"long" })}
          </div>
          <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight:500, color:"#E8F0FA", margin:0,
            letterSpacing:"-0.3px", lineHeight:1.1 }}>
            {saludo}
          </h1>
        </div>
        <div style={{ display:"flex", gap:3, background:B.card, borderRadius:8, padding:3, border:`1px solid ${B.border}` }}>
          {["Todos","C","A","F","L","Lu"].map(a => {
            const ag = AG[a];
            const active = filtroAg === a;
            return (
              <button key={a} onClick={() => setFiltroAg(a)}
                style={{ padding: mobile ? "4px 8px" : "5px 12px", borderRadius:6, fontSize: mobile ? 10 : 11, cursor:"pointer", border:"none", fontWeight:600, transition:"all 0.15s",
                  background: active ? (ag?.bg || B.accent) : "transparent",
                  color: active ? (ag?.c || "#fff") : "#4A6A90" }}>
                {a === "Todos" ? "Todos" : ag?.n || a}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPIs principales ───────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: mobile ? 8 : 12 }}>
        {[
          { label:"En negociación", value:enNegociacion, sub:"Cierres potenciales" },
          { label:"Calientes hoy",  value:nCalientes,    sub:"Hasta 2 días sin contacto" },
          { label:"Leads nuevos",   value:leadsNuevosMes,sub:"Este mes" },
          { label:"En cartera",     value:propsActivas,  sub:"Propiedades activas" },
          { label:"Pipeline",       value:activos.length,sub:`De ${leads.length} leads` },
        ].map(k => (
          <div key={k.label} style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding: mobile ? "12px 10px" : "16px 14px" }}>
            <div style={{ fontSize: mobile ? 22 : 28, fontWeight:700, color:"#E8F0FA", lineHeight:1,
              fontFamily:"Georgia, 'Times New Roman', serif" }}>{k.value}</div>
            <div style={{ fontSize: mobile ? 11 : 12, color:"#C8D8E8", fontWeight:500, marginTop:4 }}>{k.label}</div>
            <div style={{ fontSize: mobile ? 10 : 11, color:"#4A6A90", marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Alarmas ─────────────────────────────────────────── */}
      {alarmas.length > 0 && (
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontSize:11, color:"#4A6A90", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:10 }}>Requieren atención</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {alarmas.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                background:a.color+"08", borderLeft:`2px solid ${a.urgente ? a.color : a.color+"60"}`, borderRadius:6 }}>
                <span style={{ fontSize:12, color:a.urgente ? "#E8F0FA" : "#8AAECC", fontWeight:a.urgente?600:400, flex:1 }}>{a.texto}</span>
                {a.urgente && <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:a.color+"20", color:a.color, fontWeight:700, letterSpacing:"0.5px" }}>URGENTE</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {alarmas.length === 0 && (
        <div style={{ fontSize:12, color:"#2E9E6A", textAlign:"center", padding:"8px 0", fontWeight:500 }}>Todo en orden</div>
      )}

      {/* ── Llamar hoy ─────────────────────────────────────── */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:12, color:"#C8D8E8", fontWeight:600, letterSpacing:"0.8px", flex:1 }}>Llamar hoy</span>
          {urgentes.length > 0 && <span style={{ fontSize:11, color:"#4A6A90" }}>{urgentes.length} leads</span>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {urgentes.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px 0", color:"#4A6A90", fontSize:12 }}>Sin leads urgentes hoy</div>
          )}
          {urgentes.map(l => <LeadCard key={l.id} lead={l} updateLead={async (id, upd) => { await supabase.from("leads").update(upd).eq("id", id); }} />)}
        </div>
      </div>

      {/* ── Secciones colapsables ──────────────────────────── */}

      {/* Tareas + Calendario */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:12 }}>
        <Collapsible title="Tareas" color="#4A8ABE">
          <Tareas supabase={supabase} />
        </Collapsible>
        <Collapsible title="Calendario" color="#4A8ABE">
          <CalendarioSemanal supabase={supabase} />
        </Collapsible>
      </div>

      {/* Captación zonas */}
      <Collapsible title="Captación de zonas" color="#2E9E6A">
        <ResumenCaptacionZonas supabase={supabase} />
      </Collapsible>

      {/* Inteligencia de mercado */}
      <Collapsible title="Inteligencia de mercado" color="#9B6DC8">
        <InteligenciaMercado leads={leads} properties={properties} captaciones={captaciones} />
      </Collapsible>

      {/* Canales de captación */}
      <Collapsible title="Canales de captación" color="#E8A830">
        <CanalesCaptacion leads={leads} />
      </Collapsible>

    </div>
  );
}
