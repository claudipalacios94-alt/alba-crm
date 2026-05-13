// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CAPTACIÓN DE ZONAS
// Sistema semanal por barrio: farming, seguimiento, contenido
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B } from "../data/constants.js";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

const BARRIOS = [
  "La Perla","Constitución","Centro","Punta Mogotes",
  "Chauvin","Playa Grande","San Carlos","San José",
  "Pompeya","Don Bosco","San Juan"
];

const ACCIONES_SEMANA = [
  { dia:"Lunes",    icono:"📞", label:"5 propietarios particulares de ZonaProp", key:"contactos" },
  { dia:"Miércoles",icono:"🚶", label:"Recorrida del barrio — fotos de carteles", key:"recorrida" },
  { dia:"Viernes",  icono:"📸", label:"Carrusel Instagram del barrio",            key:"contenido" },
];

function getLunes() {
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  lunes.setHours(0,0,0,0);
  return lunes.toISOString().slice(0,10);
}

function semanaLabel(iso) {
  const d = new Date(iso);
  const fin = new Date(d); fin.setDate(d.getDate() + 6);
  return `${d.getDate()}/${d.getMonth()+1} — ${fin.getDate()}/${fin.getMonth()+1}`;
}

// ── Panel semana activa ───────────────────────────────────────
function SemanaActiva({ semana, supabase, onUpdate }) {
  const mobile = useIsMobile(768);
  const [propietarios, setPropietarios] = useState(semana.propietarios_contactados || 0);
  const [captadas,     setCaptadas]     = useState(semana.propiedades_captadas || 0);
  const [nota,         setNota]         = useState(semana.nota || "");
  const [saving,       setSaving]       = useState(false);
  const acciones = semana.acciones_completadas || {};

  async function toggleAccion(key) {
    const nuevas = { ...acciones, [key]: !acciones[key] };
    await supabase.from("captacion_zonas").update({ acciones_completadas: nuevas }).eq("id", semana.id);
    onUpdate({ ...semana, acciones_completadas: nuevas });
  }

  async function guardarNumeros() {
    setSaving(true);
    await supabase.from("captacion_zonas").update({
      propietarios_contactados: propietarios,
      propiedades_captadas: captadas,
      nota,
    }).eq("id", semana.id);
    onUpdate({ ...semana, propietarios_contactados: propietarios, propiedades_captadas: captadas, nota });
    setSaving(false);
  }

  const completadas = Object.values(acciones).filter(Boolean).length;
  const pct = Math.round((completadas / ACCIONES_SEMANA.length) * 100);
  const pctColor = pct === 100 ? B.ok : pct >= 33 ? B.warm : B.hot;

  const inp = { background:B.bg, border:`1px solid ${B.border}`, borderRadius:6, padding: mobile ? "8px 12px" : "6px 10px", color:B.text, fontSize: mobile ? 13 : 12, outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 10 : 12 }}>

      {/* Header barrio */}
      <div style={{ background:`linear-gradient(135deg, ${B.accent}22, ${B.accent}08)`, border:`1px solid ${B.accentL}40`, borderRadius: mobile ? 10 : 12, padding: mobile ? "14px 16px" : "16px 18px" }}>
        <div style={{ fontSize: mobile ? 10 : 11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:4 }}>BARRIO ACTIVO</div>
        <div style={{ fontSize: mobile ? 20 : 24, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>{semana.barrio}</div>
        <div style={{ fontSize: mobile ? 11 : 12, color:"#8AAECC", marginTop:2 }}>Semana {semanaLabel(semana.semana_inicio)}</div>

        {/* Barra progreso */}
        <div style={{ marginTop: mobile ? 10 : 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize: mobile ? 10 : 11, color:"#8AAECC" }}>Progreso semanal</span>
            <span style={{ fontSize: mobile ? 10 : 11, color:pctColor, fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ height: mobile ? 5 : 6, background:B.border, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:pct+"%", background:pctColor, borderRadius:3, transition:"width 0.4s" }} />
          </div>
        </div>
      </div>

      {/* Acciones de la semana */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 10 : 12, overflow:"hidden" }}>
        <div style={{ padding: mobile ? "8px 12px" : "10px 14px", borderBottom:`1px solid ${B.border}` }}>
          <span style={{ fontSize: mobile ? 10 : 11, fontWeight:700, color:B.accentL, letterSpacing:"0.8px" }}>ACCIONES DE LA SEMANA</span>
        </div>
        {ACCIONES_SEMANA.map(a => (
          <div key={a.key} onClick={()=>toggleAccion(a.key)}
            style={{ display:"flex", alignItems:"center", gap: mobile ? 10 : 12, padding: mobile ? "10px 12px" : "12px 14px",
              borderBottom:`1px solid ${B.border}`, cursor:"pointer",
              background: acciones[a.key] ? "rgba(46,158,106,0.08)" : "transparent" }}>
            <span style={{ fontSize: mobile ? 18 : 20 }}>{acciones[a.key] ? "✅" : "⬜"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize: mobile ? 13 : 12, fontWeight:600, color: acciones[a.key] ? "#2E9E6A" : B.text }}>{a.icono} {a.dia}</div>
              <div style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC" }}>{a.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Métricas */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }}>
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 8 : 10, padding: mobile ? "10px 12px" : "12px 14px" }}>
          <div style={{ fontSize: mobile ? 9 : 10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom: mobile ? 5 : 6 }}>PROPIETARIOS CONTACTADOS</div>
          <input type="number" value={propietarios} onChange={e=>setPropietarios(Number(e.target.value))}
            style={{ ...inp, fontSize: mobile ? 18 : 20, fontWeight:700, color:B.accentL, textAlign:"center" }} />
        </div>
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 8 : 10, padding: mobile ? "10px 12px" : "12px 14px" }}>
          <div style={{ fontSize: mobile ? 9 : 10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom: mobile ? 5 : 6 }}>PROPIEDADES CAPTADAS</div>
          <input type="number" value={captadas} onChange={e=>setCaptadas(Number(e.target.value))}
            style={{ ...inp, fontSize: mobile ? 18 : 20, fontWeight:700, color:"#2E9E6A", textAlign:"center" }} />
        </div>
      </div>

      {/* Nota */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 8 : 10, padding: mobile ? "10px 12px" : "12px 14px" }}>
        <div style={{ fontSize: mobile ? 9 : 10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom: mobile ? 5 : 6 }}>NOTA DE LA SEMANA</div>
        <textarea value={nota} onChange={e=>setNota(e.target.value)} rows={3}
          placeholder="ej: Hay muchos carteles particulares en Catamarca..."
          style={{ ...inp, resize:"none", lineHeight:1.6 }} />
      </div>

      <button onClick={guardarNumeros} disabled={saving}
        style={{ padding: mobile ? "12px" : "10px", borderRadius:9, cursor:saving?"default":"pointer",
          background:saving?B.border:B.accent, border:`1px solid ${saving?B.border:B.accentL}`,
          color:saving?"#8AAECC":"#fff", fontSize: mobile ? 14 : 13, fontWeight:700 }}>
        {saving ? "Guardando..." : "Guardar semana"}
      </button>
    </div>
  );
}

// ── Historial ─────────────────────────────────────────────────
function Historial({ items }) {
  const mobile = useIsMobile(768);
  if (items.length === 0) return null;
  return (
    <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 10 : 12, overflow:"hidden" }}>
      <div style={{ padding: mobile ? "8px 12px" : "10px 14px", borderBottom:`1px solid ${B.border}` }}>
        <span style={{ fontSize: mobile ? 10 : 11, fontWeight:700, color:B.accentL, letterSpacing:"0.8px" }}>HISTORIAL DE BARRIOS</span>
      </div>
      {items.map(s => {
        const acc = s.acciones_completadas || {};
        const completadas = Object.values(acc).filter(Boolean).length;
        const pct = Math.round((completadas / ACCIONES_SEMANA.length) * 100);
        const pctColor = pct === 100 ? B.ok : pct >= 33 ? B.warm : B.hot;
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 12, padding: mobile ? "8px 12px" : "10px 14px", borderBottom:`1px solid ${B.border}`, flexWrap: mobile ? "wrap" : "nowrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize: mobile ? 14 : 13, fontWeight:600, color:B.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.barrio}</div>
              <div style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC" }}>{semanaLabel(s.semana_inicio)}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize: mobile ? 14 : 16, fontWeight:700, color:B.accentL }}>{s.propietarios_contactados || 0}</div>
              <div style={{ fontSize: mobile ? 10 : 9, color:"#8AAECC" }}>contactados</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize: mobile ? 14 : 16, fontWeight:700, color:"#2E9E6A" }}>{s.propiedades_captadas || 0}</div>
              <div style={{ fontSize: mobile ? 10 : 9, color:"#8AAECC" }}>captadas</div>
            </div>
            <div style={{ width: mobile ? 36 : 40, textAlign:"center" }}>
              <div style={{ fontSize: mobile ? 11 : 12, fontWeight:700, color:pctColor }}>{pct}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function CaptacionZonas({ supabase }) {
  const mobile = useIsMobile(768);
  const [semanas,     setSemanas]     = useState([]);
  const [loaded,      setLoaded]      = useState(false);
  const [barrioNuevo, setBarrioNuevo] = useState(BARRIOS[0]);
  const [creando,     setCreando]     = useState(false);

  useEffect(() => {
    supabase.from("captacion_zonas").select("*").order("semana_inicio", { ascending: false })
      .then(({ data }) => { setSemanas(data || []); setLoaded(true); });
  }, []);

  const semanaActual = semanas.find(s => s.semana_inicio === getLunes());
  const historial    = semanas.filter(s => s.semana_inicio !== getLunes());

  async function crearSemana() {
    setCreando(true);
    const { data } = await supabase.from("captacion_zonas").insert([{
      barrio: barrioNuevo,
      semana_inicio: getLunes(),
      acciones_completadas: {},
      propietarios_contactados: 0,
      propiedades_captadas: 0,
    }]).select().single();
    if (data) setSemanas(p => [data, ...p]);
    setCreando(false);
  }

  function updateSemana(updated) {
    setSemanas(p => p.map(s => s.id === updated.id ? updated : s));
  }

  return (
    <div style={{ overflowY:"auto", maxWidth: mobile ? "100%" : 680, display:"flex", flexDirection:"column", gap: mobile ? 12 : 16 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: mobile ? 18 : 20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Captación de zonas</h1>
        <p style={{ fontSize: mobile ? 11 : 12, color:"#8AAECC", margin:"3px 0 0" }}>Un barrio por semana — sistemático, medible, sin pensar</p>
      </div>

      {!loaded && <div style={{ textAlign:"center", color:"#8AAECC", fontSize: mobile ? 13 : 12 }}>Cargando...</div>}

      {/* Semana activa o selector */}
      {loaded && !semanaActual && (
        <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius: mobile ? 10 : 12, padding: mobile ? 14 : 16, display:"flex", flexDirection:"column", gap: mobile ? 8 : 10 }}>
          <div style={{ fontSize: mobile ? 14 : 13, fontWeight:600, color:B.text }}>¿Qué barrio trabajamos esta semana?</div>
          <select value={barrioNuevo} onChange={e=>setBarrioNuevo(e.target.value)}
            style={{ background:B.bg, border:`1px solid ${B.border}`, borderRadius:7, padding: mobile ? "10px 12px" : "8px 12px", color:B.text, fontSize: mobile ? 14 : 13, outline:"none" }}>
            {BARRIOS.map(b => <option key={b}>{b}</option>)}
          </select>
          <button onClick={crearSemana} disabled={creando}
            style={{ padding: mobile ? "12px" : "10px", borderRadius:9, cursor:creando?"default":"pointer",
              background:creando?B.border:B.accent, border:`1px solid ${creando?B.border:B.accentL}`,
              color:creando?"#8AAECC":"#fff", fontSize: mobile ? 14 : 13, fontWeight:700 }}>
            {creando ? "Creando..." : "Arrancar semana →"}
          </button>
        </div>
      )}

      {loaded && semanaActual && (
        <SemanaActiva semana={semanaActual} supabase={supabase} onUpdate={updateSemana} />
      )}

      <Historial items={historial} />
    </div>
  );
}
