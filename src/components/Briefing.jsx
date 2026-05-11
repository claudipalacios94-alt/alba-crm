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
    sinAsignar.length > 0 && { texto: `${sinAsignar.length} lead${sinAsignar.length>1?"s":""} sin agente`, color:"#CC2233", icono:"⚠", urgente:true },
    sinAccion.length > 0  && { texto: `${sinAccion.length} sin próxima acción (+3d)`, color:"#E8A830", icono:"⏰", urgente:false },
    frios.length > 0      && { texto: `${frios.length} frío${frios.length>1?"s":""} (+15 días sin contacto)`, color:"#4A8ABE", icono:"❄", urgente:false },
    propsSinInteresados.length > 0 && { texto: `${propsSinInteresados.length} propiedad${propsSinInteresados.length>1?"es":""} sin interesados`, color:"#9B6DC8", icono:"🏠", urgente:false },
  ].filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* KPIs clave */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { label:"En negociación", val:negociacion, color:B.ok, sub: pipeline > 0 ? "USD "+pipeline.toLocaleString() : "sin monto" },
          { label:"Visitas", val:visitas, color:B.warm, sub: activos.length+" activos" },
          { label:"Calientes hoy", val:calientes.length, color:B.hot, sub:"≤2 días sin contacto" },
          { label:"Conversión", val:convRate+"%", color:B.accentL, sub:"a negociación" },
        ].map(k => (
          <div key={k.label} style={{ background:B.card, borderRadius:10, padding:"10px 12px",
            border:"1px solid " + k.color + "30", borderLeft:"3px solid " + k.color }}>
            <div style={{ fontSize:18, fontWeight:700, color:k.color, fontFamily:"Georgia,serif", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#E8F0FA", fontWeight:500, marginTop:3 }}>{k.label}</div>
            <div style={{ fontSize:10, color:"#6A8AAE", marginTop:1 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alarmas accionables */}
      {alarmas.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <div style={{ fontSize:10, color:"#5A7A9A", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:2 }}>Requieren atención</div>
          {alarmas.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
              background:a.color+"12", border:"1px solid "+a.color+"30", borderRadius:8 }}>
              <span style={{ fontSize:13 }}>{a.icono}</span>
              <span style={{ fontSize:12, color:a.urgente ? "#E8F0FA" : "#8AAECC", fontWeight:a.urgente?600:400 }}>{a.texto}</span>
              {a.urgente && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4, background:a.color+"30", color:a.color, fontWeight:700, marginLeft:"auto" }}>AHORA</span>}
            </div>
          ))}
        </div>
      )}
      {alarmas.length === 0 && (
        <div style={{ fontSize:12, color:"#2E9E6A", textAlign:"center", padding:"8px 0" }}>✓ Todo en orden</div>
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
          {/* Calificación rápida visible siempre */}
          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:calColor+'22', color:calColor, border:'1px solid '+calColor+'40', fontWeight:700 }}>
            {respondidas}/{PREGUNTAS.length} calificado
          </span>
          <span style={{ fontSize:11, color:urgColor, fontWeight:700, marginLeft:'auto' }}>{razon} {open ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontSize:12, color:'#8AAECC', marginBottom:4 }}>{lead.zona} · {lead.tipo} · {lead.presup ? 'USD ' + lead.presup.toLocaleString() : '—'}</div>
        {/* Barra de calificación */}
        <div style={{ height:3, background:B.border, borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:pct+'%', background:calColor, borderRadius:2, transition:'width 0.3s' }} />
        </div>
      </div>
      {open && (
        <div style={{ borderTop:'1px solid ' + urgColor + '30', padding:'12px 14px', background:'rgba(10,21,37,0.5)', display:'flex', flexDirection:'column', gap:10 }}>
          {lead.nota && <div style={{ fontSize:13, color:'#A8C8E8', lineHeight:1.6, fontStyle:'italic' }}>{lead.nota}</div>}
          {lead.proxAccion && <div style={{ fontSize:12, color:'#8AAECC' }}><span style={{ color:'#5A8AAE', fontWeight:600, fontSize:11 }}>PRÓXIMA ACCIÓN: </span>{lead.proxAccion}</div>}
          {lead.notaImp && <div style={{ fontSize:12, color:B.warm }}><span style={{ fontWeight:600 }}>⚠ </span>{lead.notaImp}</div>}

          {/* Checklist calificación */}
          <div style={{ background:'rgba(10,21,37,0.4)', borderRadius:8, padding:'10px 12px', border:'1px solid '+B.border }}>
            <div style={{ fontSize:10, fontWeight:700, color:B.accentL, letterSpacing:'0.8px', marginBottom:8 }}>CALIFICACIÓN DEL LEAD</div>
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
                      style={{ padding:'4px 8px', borderRadius:5, cursor:'pointer', background:'transparent', border:'1px solid '+B.border, color:'#8AAECC', fontSize:11 }}>✕</button>
                  </div>
                ) : (
                  <div onClick={()=>{ setEditQ(p.key); setValQ(lead[p.key]||''); }}
                    style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'3px 6px', borderRadius:5, background: lead[p.key]?'rgba(46,158,106,0.08)':'rgba(204,34,51,0.06)' }}>
                    <span style={{ fontSize:13, flexShrink:0 }}>{lead[p.key] ? '✅' : '⬜'}</span>
                    <span style={{ fontSize:11, color:'#8AAECC', flex:1 }}>{p.label}</span>
                    {lead[p.key]
                      ? <span style={{ fontSize:11, color:'#A8C8E8', fontStyle:'italic' }}>{lead[p.key]}</span>
                      : <span style={{ fontSize:10, color:B.hot }}>sin dato — tocá para completar</span>}
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
  const [tareas,  setTareas]  = React.useState([]);
  const [vistaM,  setVistaM]  = React.useState(false); // false=semana, true=mes
  const [mesBase, setMesBase] = React.useState(new Date());
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const DIAS    = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
  const MESES   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const PRIO_COLOR = { urgente:"#CC2233", importante:"#E8A830", normal:"#4A8ABE" };

  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });

  // Mes completo
  const primerDiaMes = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const diasEnMes = new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0).getDate();
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7; // lunes=0
  const celdas = Array.from({ length: offsetInicio + diasEnMes }, (_, i) => {
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
    if (!dia) return <div />;
    const isHoy = dia.toDateString() === hoy.toDateString();
    const td = tareasDelDia(dia);
    return (
      <div>
        <div style={{ textAlign:"center", marginBottom: mini ? 2 : 6 }}>
          <div style={{ fontSize: mini ? 10 : 14, fontWeight: isHoy ? 700 : 400,
            color: isHoy ? "#fff" : "#8AAECC",
            background: isHoy ? B.accentL : "transparent",
            borderRadius:"50%", width: mini ? 20 : 26, height: mini ? 20 : 26,
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
            {dia.getDate()}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:2, minHeight: mini ? 28 : 44, height: mini ? 28 : 44, overflow:"hidden" }}>
          {td.length === 0
            ? <div style={{ height:2, borderRadius:2, background:B.border, opacity:0.2, margin:"3px 0" }} />
            : td.slice(0, mini ? 2 : 99).map(t => (
              <div key={t.id} title={t.titulo}
                style={{ fontSize: mini ? 8 : 9, padding:"1px 3px", borderRadius:3,
                  background:(PRIO_COLOR[t.prioridad]||"#4A8ABE")+"20",
                  color:PRIO_COLOR[t.prioridad]||"#4A8ABE",
                  border:"1px solid "+(PRIO_COLOR[t.prioridad]||"#4A8ABE")+"40",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.4 }}>
                {t.titulo}
              </div>
            ))}
          {mini && td.length > 2 && <div style={{ fontSize:8, color:"#4A6A90" }}>+{td.length-2}</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header con toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {vistaM && (
            <>
              <button onClick={()=>setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()-1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>‹</button>
              <span style={{ fontSize:12, fontWeight:600, color:B.text }}>{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</span>
              <button onClick={()=>setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>›</button>
            </>
          )}
          {!vistaM && <span style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px" }}>📅 ESTA SEMANA</span>}
        </div>
        <div style={{ display:"flex", gap:4, background:B.card, borderRadius:6, padding:2, border:`1px solid ${B.border}` }}>
          {["Semana","Mes"].map((v,i) => (
            <button key={v} onClick={()=>setVistaM(i===1)}
              style={{ padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:10, fontWeight:600, border:"none",
                background: vistaM===(i===1) ? B.accent : "transparent",
                color: vistaM===(i===1) ? "#fff" : "#8AAECC" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Vista semana */}
      {!vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6 }}>
          {DIAS.map((d,i) => (
            <div key={i} style={{ textAlign:"center", fontSize:10, color:"#6A8AAE", marginBottom:4 }}>{d}</div>
          ))}
          {semana.map((dia, i) => <DiaCell key={i} dia={dia} mini={false} />)}
        </div>
      )}

      {/* Vista mes */}
      {vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4 }}>
          {DIAS.map((d,i) => (
            <div key={i} style={{ textAlign:"center", fontSize:9, color:"#6A8AAE", marginBottom:4 }}>{d}</div>
          ))}
          {celdas.map((dia, i) => <DiaCell key={i} dia={dia} mini={true} />)}
        </div>
      )}

      {tareas.length === 0 && (
        <div style={{ textAlign:"center", fontSize:12, color:"#4A6A90", marginTop:8 }}>
          Sin tareas {vistaM ? "este mes" : "esta semana"}
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
    { key:"contactos", dia:"Lunes",    icono:"📞", label:"5 propietarios en ZonaProp" },
    { key:"recorrida", dia:"Miércoles",icono:"🚶", label:"Recorrida del barrio" },
    { key:"contenido", dia:"Viernes",  icono:"📸", label:"Carrusel Instagram" },
  ];

  React.useEffect(() => {
    if (!supabase) return;
    supabase.from("captacion_zonas").select("*").eq("semana_inicio", getLunes()).limit(1)
      .then(({ data }) => { setSemana(data?.[0] || null); setLoaded(true); });
  }, []);

  if (!loaded) return null;

  return (
    <div style={{ background:B.sidebar, border:"1px solid " + B.border, borderRadius:14, padding:16 }}>
      <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>🏘 CAPTACIÓN DE ZONAS — ESTA SEMANA</div>
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
                  <div style={{ fontSize:14 }}>{done ? "✅" : a.icono}</div>
                  <div style={{ fontSize:9, color: done ? "#2E9E6A" : "#8AAECC", marginTop:2 }}>{a.dia}</div>
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

function MicBtn({ onTranscript }) {
  const [escuchando, setEscuchando] = React.useState(false);
  const [nivel,      setNivel]      = React.useState([0,0,0,0,0]);
  const reconRef  = React.useRef(null);
  const animRef   = React.useRef(null);
  const analyserRef = React.useRef(null);
  const streamRef = React.useRef(null);

  function animarOndas() {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const slice = Math.floor(data.length / 5);
      setNivel([0,1,2,3,4].map(i => Math.min(1, data[i*slice] / 128)));
    }
    animRef.current = requestAnimationFrame(animarOndas);
  }

  async function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Usá Chrome para el micrófono."); return; }
    if (escuchando) {
      reconRef.current?.stop();
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setEscuchando(false); setNivel([0,0,0,0,0]); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      animarOndas();
    } catch(e) {}

    const recon = new SR();
    recon.lang = "es-AR"; recon.continuous = false; recon.interimResults = false;
    recon.onresult = e => { onTranscript(e.results[0][0].transcript); };
    recon.onend = () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setEscuchando(false); setNivel([0,0,0,0,0]);
    };
    recon.onerror = () => {
      cancelAnimationFrame(animRef.current);
      setEscuchando(false); setNivel([0,0,0,0,0]);
    };
    reconRef.current = recon;
    recon.start();
    setEscuchando(true);
  }

  const heights = [14,22,30,22,14];

  return (
    <button onClick={toggleMic}
      style={{ position:"relative", width:44, height:36, borderRadius:8, cursor:"pointer", flexShrink:0,
        background: escuchando ? "rgba(204,34,51,0.15)" : "rgba(42,91,173,0.12)",
        border: `1px solid ${escuchando?"#CC2233":B.border}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:2,
        transition:"all 0.2s" }}>
      {escuchando ? (
        nivel.map((n, i) => (
          <div key={i} style={{
            width:3, borderRadius:2,
            height: heights[i] * (0.3 + n * 0.7) + "px",
            background:"#CC2233",
            transition:"height 0.08s ease",
            minHeight:3,
          }} />
        ))
      ) : (
        <span style={{ fontSize:16 }}>🎙</span>
      )}
    </button>
  );
}

function BriefingIA({ leads, properties, rentals, captaciones, supabase, onConsumo }) {
  const [mensajes,  setMensajes]  = React.useState([]);
  const [input,     setInput]     = React.useState("");
  const [loading,   setLoading]   = React.useState(false);
  const [iniciado,  setIniciado]  = React.useState(false);
  const [accionPendiente, setAccionPendiente] = React.useState(null);
  const chatRef = React.useRef(null);

  // Contexto base del CRM
  function buildContexto() {
    const hoy = new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
    const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
    const calientes = activos.filter(l => l.dias <= 3).slice(0, 10);
    const negociacion = activos.filter(l => l.etapa === "Negociación");
    const caps = (captaciones||[]).slice(0, 30);
    const capResumen = caps.map(c => `${c.tipo||"Prop"} ${c.zona||"?"} USD${c.precio||"?"} [${c.tipo_captacion||"?"}]${c.direccion?" dir:"+c.direccion:""}${c.nombre_propietario?" prop:"+c.nombre_propietario:""}`).join(" | ");
    const propsResumen = (properties||[]).slice(0,10).map(p => `${p.tipo||"Prop"} ${p.zona||"?"} USD${p.precio||"?"}`).join(" | ");
    const rentResumen = (rentals||[]).slice(0,5).map(r => `${r.tipo||"Prop"} ${r.zona||"?"} $${r.precio||"?"}/mes`).join(" | ");
    return `Hoy es ${hoy}. Inmobiliaria Alba Inversiones, Mar del Plata. Sos el asistente de Claudi (dueña).
LEADS negociación (${negociacion.length}): ${negociacion.map(l=>`${l.nombre} ${l.zona} USD${l.presup||"?"}`).join(", ")||"ninguno"}
LEADS calientes (${calientes.length}): ${calientes.map(l=>`${l.nombre}(${l.dias}d,${l.etapa},${l.zona},USD${l.presup||"?"})`).join(" | ")}
PROPIEDADES en venta (${(properties||[]).length}): ${propsResumen||"ninguna"}
ALQUILERES (${(rentals||[]).length}): ${rentResumen||"ninguno"}
CAPTACIONES pendientes (${caps.length}): ${capResumen||"ninguna"}
REGLAS: Español rioplatense, directo y conciso. Si algo implica modificar datos del CRM, preguntás antes. Tenés visión completa del mapa, captaciones, propiedades y leads.`;
  }

  // Cargar historial de hoy desde Supabase
  React.useEffect(() => {
    if (!supabase) return;
    const hoy = new Date().toISOString().slice(0,10);
    supabase.from("briefing_chat").select("*")
      .gte("created_at", hoy + "T00:00:00")
      .order("created_at", { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMensajes(data.map(d => ({ role: d.role, content: d.content, id: d.id })));
          setIniciado(true);
        }
      });
  }, []);

  // Auto scroll
  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  async function guardarMensaje(role, content) {
    if (!supabase) return;
    await supabase.from("briefing_chat").insert([{ role, content }]);
  }

  async function enviar(texto) {
    if (!texto.trim() || loading) return;
    const userMsg = { role:"user", content: texto };
    const nuevosMensajes = [...mensajes, userMsg];
    setMensajes(nuevosMensajes);
    setInput("");
    setLoading(true);
    setIniciado(true);
    await guardarMensaje("user", texto);

    // Últimos 10 mensajes para contexto
    const historial = nuevosMensajes.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: buildContexto(),
          messages: historial,
        })
      });
      const data = await res.json();
      const respuesta = data.content?.[0]?.text || "Sin respuesta";
      setMensajes(p => [...p, { role:"assistant", content: respuesta }]);
      await guardarMensaje("assistant", respuesta);
      if (onConsumo) onConsumo(800, 150);
    } catch(e) {
      setMensajes(p => [...p, { role:"assistant", content: "Error al conectar. Verificá los créditos." }]);
    }
    setLoading(false);
  }

  async function arrancarDia() {
    await enviar("¿Qué hago primero hoy para avanzar en ventas?");
  }

  const inp = {
    flex:1, background:B.bg, border:`1px solid ${B.border}`, borderRadius:8,
    padding:"8px 12px", color:B.text, fontSize:12, outline:"none",
  };

  return (
    <div style={{ background:B.sidebar, border:`1px solid ${B.accentL}30`, borderRadius:14, overflow:"hidden", marginBottom:14 }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, color:B.accentL, fontWeight:700, letterSpacing:"1px" }}>✨ ASISTENTE ALBA</span>
        {iniciado && (
          <button onClick={()=>{ setMensajes([]); setIniciado(false); }}
            style={{ fontSize:10, color:"#4A6A90", background:"transparent", border:"none", cursor:"pointer" }}>
            Nueva conversación
          </button>
        )}
      </div>

      {/* Chat */}
      {!iniciado ? (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:"#8AAECC", fontStyle:"italic" }}>
            Contame cómo arrancó el día, qué tenés en mente, o preguntame qué hacer.
          </div>
          <button onClick={arrancarDia}
            style={{ padding:"9px", borderRadius:8, cursor:"pointer",
              background:B.accent, border:`1px solid ${B.accentL}`,
              color:"#fff", fontSize:12, fontWeight:700 }}>
            ¿Qué hago hoy?
          </button>
        </div>
      ) : (
        <div ref={chatRef} style={{ maxHeight:320, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          {mensajes.map((m, i) => (
            <div key={i} style={{
              display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                maxWidth:"85%", padding:"8px 12px", borderRadius: m.role==="user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: m.role==="user" ? B.accent : "rgba(42,91,173,0.12)",
                border: m.role==="user" ? "none" : `1px solid ${B.border}`,
                fontSize:12, color: m.role==="user" ? "#fff" : "#C8D8E8",
                lineHeight:1.6, whiteSpace:"pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", justifyContent:"flex-start" }}>
              <div style={{ padding:"8px 12px", borderRadius:"12px 12px 12px 2px",
                background:"rgba(42,91,173,0.12)", border:`1px solid ${B.border}`,
                fontSize:12, color:"#4A6A90", fontStyle:"italic" }}>
                Pensando...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input — siempre visible */}
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${B.border}`, display:"flex", gap:8, alignItems:"center" }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
          placeholder={iniciado ? "Escribí o dictá..." : "Preguntame qué hacer hoy..."}
          style={inp} />
        <MicBtn onTranscript={t=>setInput(p=>p?p+" "+t:t)} />
        {!iniciado && (
          <button onClick={arrancarDia}
            style={{ padding:"8px 14px", borderRadius:8, cursor:"pointer",
              background:B.accent, border:`1px solid ${B.accentL}`,
              color:"#fff", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
            ¿Qué hago hoy?
          </button>
        )}
        {iniciado && (
          <button onClick={()=>enviar(input)} disabled={loading || !input.trim()}
            style={{ padding:"8px 14px", borderRadius:8, cursor:loading||!input.trim()?"default":"pointer",
              background:loading||!input.trim()?B.border:B.accent,
              border:"none", color:"#fff", fontSize:12, fontWeight:700 }}>
            →
          </button>
        )}
      </div>
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
    <div style={{ background:"rgba(10,21,37,0.6)", border:`1px solid ${B.border}`, borderRadius:14, padding:18, marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>📊 Inteligencia de mercado</div>
          <div style={{ fontSize:11, color:"#4A6A90", marginTop:2 }}>Demanda vs oferta por zona · identifica dónde captar</div>
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
          return (
            <div key={zona} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:6, alignItems:"center" }}>
              <div style={{ fontSize:11, color, fontWeight:600, textAlign:"right", paddingRight:8 }}>{zona}</div>
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
        💡 <strong style={{ color:B.accentL }}>Cómo leerlo:</strong> Si la barra azul (demanda) supera la verde (oferta) en una zona — hay oportunidad de captación. Priorizá captar en zonas con más leads buscando que propiedades disponibles.
      </div>
    </div>
  );
}

export default function Briefing({ leads, properties, rentals, captaciones, supabase, onConsumo }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);
 
  // Gauge 1: Leads en negociación — el número más importante del día
  const enNegociacion = filtrados.filter(l => l.etapa === "Negociación").length;

  // Gauge 2: Leads nuevos este mes
  const leadsNuevosMes = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;

  // Gauge 3: Calientes hoy
  const nCalientes = filtrados.filter(l => l.dias <= 2 || l.etapa === "Negociación").length;

  // Gauge 4: Propiedades en cartera
  const propsActivas = (properties || []).filter(p => p.activa !== false).length;

  // Gauge 5: Leads activos totales
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
 
  const STATS = [
    { label:"En negociación", value:enNegociacion, sub:"cierres potenciales", color:"#E8A830", icon:"◆" },
    { label:"Calientes hoy",  value:nCalientes,    sub:"≤2 días sin contacto", color:"#CC2233", icon:"●" },
    { label:"Leads nuevos",   value:leadsNuevosMes,sub:"este mes",            color:B.accentL,  icon:"↑" },
    { label:"En cartera",     value:propsActivas,  sub:"propiedades activas", color:"#2E9E6A",  icon:"⬡" },
    { label:"Pipeline total", value:activos.length,sub:`de ${leads.length} leads`, color:"#8AAECC", icon:"≡" },
  ];

  const card = { background:"rgba(10,21,37,0.6)", border:`1px solid ${B.border}`, borderRadius:12, padding:16 };
  const secTit = (txt, badge) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
      <div style={{ width:3, height:14, background:B.accentL, borderRadius:2 }} />
      <span style={{ fontSize:11, color:"#C8D8E8", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase" }}>{txt}</span>
      {badge > 0 && <span style={{ marginLeft:"auto", fontSize:10, padding:"2px 8px", borderRadius:10,
        background:"rgba(204,34,51,0.15)", color:"#CC2233", border:"1px solid rgba(204,34,51,0.3)", fontWeight:700 }}>{badge}</span>}
    </div>
  );

  return (
    <div style={{ width:"100%", maxWidth:"100%", minWidth:0, overflowX:"hidden", display:"flex", flexDirection:"column", gap:12 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", paddingBottom:16, borderBottom:`1px solid ${B.border}` }}>
        <div>
          <div style={{ fontSize:11, color:"#4A6A90", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6, fontWeight:500 }}>
            {hoy.toLocaleDateString("es-AR", { weekday:"long" }).toUpperCase()} · {hoy.toLocaleDateString("es-AR", { day:"numeric", month:"long", year:"numeric" })}
          </div>
          <h1 style={{ fontSize:28, fontWeight:400, color:"#E8F0FA", margin:0,
            fontFamily:"Georgia, 'Times New Roman', serif", letterSpacing:"-0.5px", lineHeight:1.1 }}>
            {saludo}, <span style={{ fontStyle:"italic", color:B.accentL }}>Claudi</span>
          </h1>
        </div>
        <div style={{ display:"flex", gap:4, background:"rgba(10,21,37,0.6)", borderRadius:10, padding:4, border:`1px solid ${B.border}` }}>
          {["Todos","C","A","F","L"].map(a => {
            const ag = AG[a];
            const active = filtroAg === a;
            return (
              <button key={a} onClick={() => setFiltroAg(a)}
                style={{ padding:"5px 12px", borderRadius:7, fontSize:11, cursor:"pointer", border:"none", fontWeight:600, transition:"all 0.15s",
                  background: active ? (ag?.bg || B.accent) : "transparent",
                  color: active ? (ag?.c || "#fff") : "#4A6A90" }}>
                {a === "Todos" ? "Todos" : ag?.n || a}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fila 1: Asistente IA — ancho completo ──────────── */}
      <BriefingIA leads={leads} properties={properties} rentals={rentals} captaciones={captaciones} supabase={supabase} onConsumo={onConsumo} />

      {/* ── Fila 2: Tareas | Calendario ────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={card}>
          {secTit("Tareas")}
          <Tareas supabase={supabase} />
        </div>
        <div style={card}>
          <CalendarioSemanal supabase={supabase} />
        </div>
      </div>

      {/* ── Fila 3: Llamar hoy | Resumen ───────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={card}>
          {secTit("Llamar hoy", urgentes.length)}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {urgentes.length === 0 && (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#4A6A90", fontSize:12 }}>Sin leads urgentes hoy ✓</div>
            )}
            {urgentes.map(l => <LeadCard key={l.id} lead={l} updateLead={async (id, upd) => { await supabase.from("leads").update(upd).eq("id", id); }} />)}
          </div>
        </div>
        <div style={card}>
          {secTit("Resumen")}
          <InsightPanel leads={filtrados} properties={properties} />
        </div>
      </div>

      {/* ── Fila 4: Captación zonas | Inteligencia ─────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={card}>
          <ResumenCaptacionZonas supabase={supabase} />
        </div>
        <div style={{ ...card, padding:16 }}>
          <InteligenciaMercado leads={leads} properties={properties} captaciones={captaciones} />
        </div>
      </div>

    </div>
  );
}
