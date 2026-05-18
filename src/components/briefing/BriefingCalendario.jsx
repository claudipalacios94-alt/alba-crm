// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingCalendario
// Vista semanal/mensual de tareas. Queries via useTareas hook.
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";
import { useTareas } from "../../hooks/useTareas.js";

const DIAS  = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const PRIO_COLOR = { urgente:"#CC2233", importante:"#E8A830", normal:"#4A8ABE" };

function getLunes(base) {
  const l = new Date(base);
  l.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  l.setHours(0,0,0,0);
  return l;
}

export default function BriefingCalendario() {
  const [vistaM,   setVistaM]   = useState(false);
  const [mesBase,  setMesBase]  = useState(new Date());
  const [diaPopup, setDiaPopup] = useState(null);

  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const lunes = getLunes(hoy);
  const semana = Array.from({ length:7 }, (_,i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate()+i); return d;
  });

  const primerDiaMes  = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const diasEnMes     = new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0).getDate();
  const offsetInicio  = (primerDiaMes.getDay() + 6) % 7;
  const celdas = Array.from({ length: offsetInicio + diasEnMes }, (_,i) => {
    if (i < offsetInicio) return null;
    return new Date(mesBase.getFullYear(), mesBase.getMonth(), i - offsetInicio + 1);
  });

  const desde = vistaM
    ? new Date(mesBase.getFullYear(), mesBase.getMonth(), 1).toISOString().slice(0,10)
    : lunes.toISOString().slice(0,10);
  const hasta = vistaM
    ? new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0).toISOString().slice(0,10)
    : new Date(lunes.getTime() + 6*86400000).toISOString().slice(0,10);

  const { tareas } = useTareas(desde, hasta);

  const tareasDelDia = d => d
    ? tareas.filter(t => t.fecha === d.toISOString().slice(0,10))
    : [];

  function DiaCell({ dia, mini }) {
    if (!dia) return <div style={{ background:"transparent" }} />;
    const isHoy = dia.toDateString() === hoy.toDateString();
    const td = tareasDelDia(dia);
    const cellH = mini ? 56 : 70;
    return (
      <div onClick={() => setDiaPopup({ dia, tareas: td })}
        style={{ height:cellH, borderRadius:6, cursor:"pointer", padding:"4px 3px",
          background: isHoy ? "rgba(42,91,173,0.15)" : "rgba(10,21,37,0.3)",
          border:`1px solid ${isHoy ? B.accentL+"60" : B.border}`,
          display:"flex", flexDirection:"column", gap:2, overflow:"hidden" }}>
        <div style={{ fontSize: mini ? 10 : 12, fontWeight: isHoy ? 700 : 400,
          color: isHoy ? "#fff" : "#8AAECC", textAlign:"center",
          background: isHoy ? B.accentL : "transparent",
          borderRadius:"50%", width:18, height:18, lineHeight:"18px", margin:"0 auto 2px" }}>
          {dia.getDate()}
        </div>
        {td.slice(0,2).map(t => (
          <div key={t.id} style={{ fontSize:8, padding:"1px 3px", borderRadius:2, lineHeight:1.4,
            background:(PRIO_COLOR[t.prioridad]||"#4A8ABE")+"25",
            color:PRIO_COLOR[t.prioridad]||"#4A8ABE",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {t.titulo}
          </div>
        ))}
        {td.length > 2 && <div style={{ fontSize:8, color:"#4A6A90", textAlign:"center" }}>+{td.length-2}</div>}
        {td.length === 0 && <div style={{ flex:1, borderBottom:`1px solid ${B.border}`, opacity:0.2, margin:"4px 4px 0" }} />}
      </div>
    );
  }

  return (
    <div style={{ position:"relative" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {vistaM ? (
            <>
              <button onClick={() => setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()-1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>‹</button>
              <span style={{ fontSize:12, fontWeight:600, color:B.text }}>{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</span>
              <button onClick={() => setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 1))}
                style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:5, color:"#8AAECC", cursor:"pointer", padding:"2px 8px", fontSize:12 }}>›</button>
            </>
          ) : (
            <span style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px" }}>ESTA SEMANA</span>
          )}
        </div>
        <div style={{ display:"flex", gap:3, background:B.card, borderRadius:6, padding:2, border:`1px solid ${B.border}` }}>
          {["Semana","Mes"].map((v,i) => (
            <button key={v} onClick={() => setVistaM(i===1)}
              style={{ padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:10, fontWeight:600, border:"none",
                background: vistaM===(i===1) ? B.accent : "transparent",
                color: vistaM===(i===1) ? "#fff" : "#8AAECC" }}>
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

      {!vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
          {semana.map((dia,i) => <DiaCell key={i} dia={dia} mini={false} />)}
        </div>
      )}
      {vistaM && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {celdas.map((dia,i) => <DiaCell key={i} dia={dia} mini={true} />)}
        </div>
      )}

      {/* Popup día */}
      {diaPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={() => setDiaPopup(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.accentL}40`, borderRadius:14, padding:20, minWidth:280, maxWidth:360 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:B.text }}>
                {diaPopup.dia.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}
              </div>
              <button onClick={() => setDiaPopup(null)}
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