// ══════════════════════════════════════════════════════════════
// ALBA CRM — HoyHome
// Compromisos del día: visitas, tareas vencidas, tareas de hoy.
// Input directo para nueva tarea. Sin IA, sin análisis.
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B } from "../../data/constants.js";
import { useTareas } from "../../hooks/useTareas.js";
import { supabase } from "../../hooks/supabaseClient.js";
import { useAppContext } from "../../context/SupabaseContext.jsx";

function toISO(d) {
  return d.toISOString().split("T")[0];
}

function esVisita(tarea) {
  const t = (tarea.titulo || "").toLowerCase();
  const tipo = (tarea.tipo || "").toLowerCase();
  return t.includes("visita") || t.includes("reunión") || t.includes("reunion")
    || tipo.includes("visita") || tipo.includes("reunión");
}

export default function HoyHome() {
  const { agent } = useAppContext();

  const hoy       = new Date();
  const hoyISO    = toISO(hoy);
  const hace14    = new Date(hoy); hace14.setDate(hoy.getDate() - 14);
  const hace14ISO = toISO(hace14);

  const { tareas: tareasDb } = useTareas(hace14ISO, hoyISO);

  const [tareas,   setTareas]   = useState([]);
  const [nuevaTxt, setNuevaTxt] = useState("");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    setTareas(tareasDb);
  }, [tareasDb]);

  const vencidas = tareas.filter(t => t.fecha && t.fecha < hoyISO);
  const deHoy    = tareas.filter(t => t.fecha === hoyISO);
  const visitas  = deHoy.filter(esVisita);
  const resto    = deHoy.filter(t => !esVisita(t));

  async function completar(id) {
    setTareas(prev => prev.filter(t => t.id !== id));
    await supabase.from("tareas").update({ completada: true }).eq("id", id);
  }

  async function agregarTarea() {
    const titulo = nuevaTxt.trim();
    if (!titulo) return;
    setSaving(true);
    const { data } = await supabase
      .from("tareas")
      .insert({ titulo, fecha: hoyISO, completada: false, ag: agent || null })
      .select()
      .single();
    if (data) setTareas(prev => [...prev, data]);
    setNuevaTxt("");
    setSaving(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") agregarTarea();
  }

  const empty = vencidas.length === 0 && deHoy.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Visitas del día — destacadas */}
      {visitas.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#E8A830",
            textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
            Visitas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {visitas.map(t => (
              <TareaRow key={t.id} tarea={t} onCompletar={completar} accent="#E8A830" />
            ))}
          </div>
        </div>
      )}

      {/* Tareas vencidas */}
      {vencidas.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CC2233",
            textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
            Vencidas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {vencidas.map(t => (
              <TareaRow key={t.id} tarea={t} onCompletar={completar} accent="#CC2233" />
            ))}
          </div>
        </div>
      )}

      {/* Tareas de hoy (sin visitas) */}
      {resto.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: B.dim,
            textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
            Hoy
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {resto.map(t => (
              <TareaRow key={t.id} tarea={t} onCompletar={completar} accent={B.accentL} />
            ))}
          </div>
        </div>
      )}

      {/* Vacío */}
      {empty && (
        <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "8px 0" }}>
          Sin compromisos para hoy
        </div>
      )}

      {/* Nueva tarea */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={nuevaTxt}
          onChange={e => setNuevaTxt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ Nueva tarea..."
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 7, fontSize: 12,
            background: B.surface, border: `1px solid ${B.border}`,
            color: "#C8D8E8", outline: "none",
          }}
        />
        <button
          onClick={agregarTarea}
          disabled={saving || !nuevaTxt.trim()}
          style={{
            padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700,
            cursor: saving || !nuevaTxt.trim() ? "default" : "pointer",
            background: "rgba(74,173,232,0.12)", border: `1px solid ${B.accentL}40`,
            color: B.accentL, opacity: saving ? 0.5 : 1, transition: "opacity 0.15s",
          }}
        >
          {saving ? "..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}

// ── Fila de tarea ─────────────────────────────────────────────
function TareaRow({ tarea, onCompletar, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 10px", borderRadius: 7,
      background: accent + "08", border: `1px solid ${accent}20`,
    }}>
      <button
        onClick={() => onCompletar(tarea.id)}
        title="Completar"
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${accent}60`, background: "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 9, color: accent }}>✓</span>
      </button>
      <span style={{
        flex: 1, fontSize: 12, color: "#C8D8E8",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {tarea.titulo}
      </span>
      {tarea.fecha && tarea.fecha < new Date().toISOString().split("T")[0] && (
        <span style={{ fontSize: 10, color: "#CC2233", flexShrink: 0 }}>
          {tarea.fecha.slice(5)}
        </span>
      )}
    </div>
  );
}
