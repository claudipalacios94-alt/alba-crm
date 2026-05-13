// ══════════════════════════════════════════════════════════════
// ALBA CRM — TAREAS + AGENDA SEMANAL
// Bloque del Briefing: tareas con prioridad + vista semanal
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B, AG } from "../data/constants.js";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

const PRIO = {
  urgente:   { label: "Urgente",   color: "#CC2233" },
  importante:{ label: "Importante",color: "#E8A830" },
  normal:    { label: "Normal",     color: "#4A8ABE" },
};

function fmtFecha(dateStr) {
  if (!dateStr) return "";
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - hoy) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  if (diff > 1 && diff < 7) return d.toLocaleDateString("es-AR", { weekday:"short" });
  return d.toLocaleDateString("es-AR", { day:"numeric", month:"short" });
}

function fechaColor(dateStr) {
  if (!dateStr) return "#4A6A90";
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - hoy) / 86400000);
  if (diff < 0) return "#CC2233";
  if (diff === 0) return "#E8A830";
  if (diff === 1) return "#2E9E6A";
  return "#4A8ABE";
}

export default function Tareas({ supabase }) {
  const mobile = useIsMobile(768);
  const [tareas,    setTareas]    = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [input,     setInput]     = useState("");
  const [prio,      setPrio]      = useState("normal");
  const [fecha,     setFecha]     = useState("");
  const [ag,        setAg]        = useState("");
  const [saving,    setSaving]    = useState(false);
  const [vistaAg,   setVistaAg]   = useState("Todos");
  const [modoAgenda,setModoAgenda]= useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("tareas")
      .select("*")
      .eq("completada", false)
      .order("fecha", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => { setTareas(data || []); setLoaded(true); });
  }, []);

  async function agregar() {
    if (!input.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("tareas").insert([{
      titulo:    input.trim(),
      prioridad: prio,
      fecha:     fecha || null,
      ag:        ag || null,
      completada: false,
    }]).select().single();
    if (!error && data) {
      setTareas(prev => [...prev, data].sort((a, b) => {
        if (!a.fecha && !b.fecha) return 0;
        if (!a.fecha) return 1;
        if (!b.fecha) return -1;
        return a.fecha.localeCompare(b.fecha);
      }));
      setInput(""); setFecha(""); setPrio("normal"); setAg("");
    }
    setSaving(false);
  }

  async function completar(id) {
    await supabase.from("tareas").update({ completada: true }).eq("id", id);
    setTareas(prev => prev.filter(t => t.id !== id));
  }

  // Semana actual
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i);
    return d;
  });

  const tareasFiltradas = vistaAg === "Todos" ? tareas : tareas.filter(t => t.ag === vistaAg);

  const tareasDelDia = (fecha) => tareasFiltradas.filter(t => {
    if (!t.fecha) return false;
    return t.fecha === fecha.toISOString().slice(0, 10);
  });

  const tareasSinFecha = tareasFiltradas.filter(t => !t.fecha);
  const tareasConFecha = tareasFiltradas.filter(t => t.fecha);
  const tareasVencidas = tareasConFecha.filter(t => {
    const d = new Date(t.fecha + "T00:00:00"); return d < hoy;
  });

  const inp = {
    background: B.card, border: "1px solid " + B.border, borderRadius: 7,
    padding: mobile ? "9px 12px" : "7px 10px", color: B.text, fontSize: mobile ? 13 : 12, outline: "none",
  };

  const DIAS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

  return (
    <div style={{ background: B.sidebar, border: "1px solid " + B.border, borderRadius: mobile ? 12 : 14, padding: mobile ? 14 : 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: mobile ? 12 : 14, flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 8 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 10, flexWrap:"wrap" }}>
          <span style={{ fontSize: mobile ? 13 : 12, fontWeight: 600, color: "#8AAECC", letterSpacing: "1px", textTransform: "uppercase" }}>
            📋 Tareas
          </span>
          {tareasFiltradas.length > 0 && (
            <span style={{ fontSize: mobile ? 12 : 11, background: B.accentL + "20", color: B.accentL,
              padding: mobile ? "2px 8px" : "1px 7px", borderRadius: 8, fontWeight: 600 }}>
              {tareasFiltradas.length}
            </span>
          )}
          {tareasVencidas.length > 0 && (
            <span style={{ fontSize: mobile ? 12 : 11, background: "#CC223320", color: "#CC2233",
              padding: mobile ? "2px 8px" : "1px 7px", borderRadius: 8, fontWeight: 600 }}>
              {tareasVencidas.length} vencida{tareasVencidas.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: mobile ? 8 : 6 }}>
          <button onClick={() => setModoAgenda(false)}
            style={{ padding: mobile ? "5px 12px" : "3px 10px", borderRadius: 6, fontSize: mobile ? 12 : 11, cursor: "pointer",
              background: !modoAgenda ? B.accentL + "20" : "transparent",
              border: "1px solid " + (!modoAgenda ? B.accentL : B.border),
              color: !modoAgenda ? B.accentL : "#8AAECC" }}>
            Lista
          </button>
          <button onClick={() => setModoAgenda(true)}
            style={{ padding: mobile ? "5px 12px" : "3px 10px", borderRadius: 6, fontSize: mobile ? 12 : 11, cursor: "pointer",
              background: modoAgenda ? B.accentL + "20" : "transparent",
              border: "1px solid " + (modoAgenda ? B.accentL : B.border),
              color: modoAgenda ? B.accentL : "#8AAECC" }}>
            Semana
          </button>
        </div>
      </div>

      {/* Input nueva tarea */}
      <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 8 : 7, marginBottom: mobile ? 12 : 14,
        background: B.card, borderRadius: 10, padding: mobile ? 10 : 12, border: "1px solid " + B.border }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && agregar()}
          placeholder="Nueva tarea... (Enter para guardar)"
          style={{ ...inp, width: "100%", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: mobile ? 8 : 6, flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
          <select value={prio} onChange={e => setPrio(e.target.value)}
            style={{ ...inp, flex: mobile ? 1 : 1, minWidth: mobile ? "100%" : 120 }}>
            <option value="urgente">🔴 Urgente</option>
            <option value="importante">🟡 Importante</option>
            <option value="normal">⚪ Normal</option>
          </select>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ ...inp, flex: mobile ? 1 : 1, minWidth: mobile ? "100%" : 130, colorScheme: "dark" }} />
          <select value={ag} onChange={e => setAg(e.target.value)}
            style={{ ...inp, flex: mobile ? 1 : 1, minWidth: mobile ? "100%" : 100 }}>
            <option value="">Sin agente</option>
            {Object.entries(AG).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
          <button onClick={agregar} disabled={!input.trim() || saving}
            style={{ padding: mobile ? "9px 16px" : "7px 14px", borderRadius: 7, cursor: input.trim() ? "pointer" : "default",
              background: input.trim() ? B.accent : "transparent",
              border: "1px solid " + (input.trim() ? B.accentL : B.border),
              color: input.trim() ? "#fff" : "#8AAECC", fontSize: mobile ? 13 : 12, fontWeight: 700 }}>
            {saving ? "..." : "+ Añadir"}
          </button>
        </div>
      </div>

      {/* Filtro agente */}
      {tareas.length > 0 && (
        <div style={{ display: "flex", gap: mobile ? 6 : 5, marginBottom: mobile ? 10 : 12, flexWrap: "wrap" }}>
          {["Todos", ...Object.keys(AG)].map(k => (
            <button key={k} onClick={() => setVistaAg(k)}
              style={{ padding: mobile ? "5px 11px" : "3px 9px", borderRadius: 12, fontSize: mobile ? 12 : 11, cursor: "pointer",
                background: vistaAg === k ? (AG[k]?.bg || B.accentL + "20") : "transparent",
                border: "1px solid " + (vistaAg === k ? (AG[k]?.c || B.accentL) : B.border),
                color: vistaAg === k ? (AG[k]?.c || B.accentL) : "#8AAECC" }}>
              {k === "Todos" ? "Todos" : AG[k].n}
            </button>
          ))}
        </div>
      )}

      {!loaded && <div style={{ fontSize: mobile ? 13 : 12, color: "#8AAECC", textAlign: "center", padding: mobile ? "14px 0" : "12px 0" }}>Cargando...</div>}

      {/* Vista Lista */}
      {loaded && !modoAgenda && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Vencidas */}
          {tareasVencidas.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "#CC2233", fontWeight: 600, letterSpacing: "0.8px", marginBottom: 5 }}>VENCIDAS</div>
              {tareasVencidas.map(t => <TareaItem key={t.id} t={t} onCompletar={completar} />)}
            </div>
          )}
          {/* Con fecha (hoy y futuras) */}
          {tareasConFecha.filter(t => new Date(t.fecha + "T00:00:00") >= hoy).map(t => <TareaItem key={t.id} t={t} onCompletar={completar} />)}
          {/* Sin fecha */}
          {tareasSinFecha.length > 0 && (
            <div style={{ marginTop: tareasConFecha.filter(t => new Date(t.fecha + "T00:00:00") >= hoy).length > 0 ? 8 : 0 }}>
              {tareasSinFecha.length > 0 && tareasConFecha.filter(t => new Date(t.fecha+"T00:00:00") >= hoy).length > 0 && (
                <div style={{ fontSize: 10, color: "#4A6A90", fontWeight: 600, letterSpacing: "0.8px", marginBottom: 5 }}>SIN FECHA</div>
              )}
              {tareasSinFecha.map(t => <TareaItem key={t.id} t={t} onCompletar={completar} />)}
            </div>
          )}
          {tareasFiltradas.length === 0 && (
            <div style={{ fontSize: 12, color: "#4A6A90", textAlign: "center", padding: "16px 0" }}>
              Sin tareas pendientes ✓
            </div>
          )}
        </div>
      )}

      {/* Vista Agenda Semanal */}
      {loaded && modoAgenda && (
        <div style={{ display: mobile ? "flex" : "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: mobile ? 8 : 6, overflowX: mobile ? "auto" : "visible", paddingBottom: mobile ? 8 : 0 }}>
          {semana.map((dia, i) => {
            const isHoy = dia.toDateString() === hoy.toDateString();
            const tareasDia = tareasDelDia(dia);
            const fechaStr = dia.toISOString().slice(0, 10);
            return (
              <div key={i} style={{ minHeight: mobile ? 60 : 80, minWidth: mobile ? 100 : "auto", flex: mobile ? "0 0 100px" : "auto" }}>
                <div style={{ textAlign: "center", fontSize: mobile ? 12 : 11, fontWeight: isHoy ? 700 : 400,
                  color: isHoy ? B.accentL : "#6A8AAE", marginBottom: mobile ? 6 : 5,
                  background: isHoy ? B.accentL + "15" : "transparent",
                  borderRadius: 6, padding: mobile ? "5px 0" : "3px 0" }}>
                  <div>{DIAS[i]}</div>
                  <div style={{ fontSize: mobile ? 14 : 13 }}>{dia.getDate()}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 4 : 3 }}>
                  {tareasDia.map(t => (
                    <div key={t.id}
                      onClick={() => completar(t.id)}
                      title={t.titulo}
                      style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "4px 6px" : "3px 5px", borderRadius: 4,
                        background: PRIO[t.prioridad]?.color + "20",
                        border: "1px solid " + PRIO[t.prioridad]?.color + "40",
                        color: PRIO[t.prioridad]?.color,
                        cursor: "pointer", lineHeight: 1.3,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.titulo}
                    </div>
                  ))}
                  {tareasDia.length === 0 && (
                    <div style={{ height: mobile ? 6 : 4, borderRadius: 2, background: B.border, opacity: 0.3 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TareaItem({ t, onCompletar }) {
  const mobile = useIsMobile(768);
  const agObj = AG[t.ag];
  const prioData = PRIO[t.prioridad] || PRIO.normal;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: mobile ? 12 : 10, padding: mobile ? "11px 14px" : "9px 12px",
      background: B.card, borderRadius: mobile ? 10 : 9, border: "1px solid " + B.border,
      borderLeft: "3px solid " + prioData.color }}>
      <button onClick={() => onCompletar(t.id)}
        style={{ width: mobile ? 22 : 18, height: mobile ? 22 : 18, borderRadius: "50%", border: "2px solid " + prioData.color,
          background: "transparent", cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: mobile ? 10 : 8, height: mobile ? 10 : 8, borderRadius: "50%", background: "transparent",
          transition: "background .15s" }}
          onMouseOver={e => e.target.style.background = prioData.color}
          onMouseOut={e => e.target.style.background = "transparent"} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: mobile ? 14 : 13, color: B.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.titulo}
        </div>
        <div style={{ display: "flex", gap: mobile ? 10 : 8, marginTop: mobile ? 3 : 2, alignItems: "center", flexWrap:"wrap" }}>
          {t.fecha && (
            <span style={{ fontSize: mobile ? 12 : 11, color: fechaColor(t.fecha), fontWeight: 600 }}>
              {fmtFecha(t.fecha)}
            </span>
          )}
          {agObj && (
            <span style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "2px 6px" : "1px 5px", borderRadius: 4,
              background: agObj.bg, color: agObj.c, fontWeight: 600 }}>
              {agObj.n}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
