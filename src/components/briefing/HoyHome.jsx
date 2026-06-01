// ══════════════════════════════════════════════════════════════
// ALBA CRM — HoyHome v2
// Resumen de conteos: vencidas, hoy, visitas, pendientes.
// Input para nueva tarea al pie.
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

  useEffect(() => { setTareas(tareasDb); }, [tareasDb]);

  const vencidas  = tareas.filter(t => t.fecha && t.fecha < hoyISO);
  const deHoy     = tareas.filter(t => t.fecha === hoyISO);
  const visitasHoy = deHoy.filter(esVisita);
  const pendientes = tareas.filter(t => !t.completada);

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

  const filas = [
    { icon: "⏰", label: "Tareas vencidas", count: vencidas.length,  color: "#EF4444" },
    { icon: "📋", label: "Tareas de hoy",   count: deHoy.length,     color: "#4A8AE8" },
    { icon: "🏠", label: "Visitas de hoy",  count: visitasHoy.length, color: "#E8A830" },
    { icon: "⏳", label: "Pendientes",      count: pendientes.length, color: "#64748B" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Filas de conteo */}
      <div style={{
        display: "flex", flexDirection: "column",
        border: "1px solid #1E293B", borderRadius: 10,
        overflow: "hidden", marginBottom: 10,
      }}>
        {filas.map((f, i) => (
          <div key={f.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px",
            borderTop: i > 0 ? "1px solid #1E293B" : "none",
            background: "#0C1527",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: "#C8D8E8", fontWeight: 500 }}>
              {f.label}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 700, color: f.count > 0 ? f.color : "#374151",
              minWidth: 20, textAlign: "right",
            }}>
              {f.count}
            </span>
          </div>
        ))}
      </div>

      {/* Nueva tarea */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={nuevaTxt}
          onChange={e => setNuevaTxt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && agregarTarea()}
          placeholder="+ Nueva tarea..."
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 7, fontSize: 12,
            background: B.surface, border: `1px solid ${B.border}`,
            color: "#C8D8E8", outline: "none",
          }}
        />
        <button
          onClick={agregarTarea}
          disabled={saving || !nuevaTxt.trim()}
          style={{
            padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700,
            cursor: saving || !nuevaTxt.trim() ? "default" : "pointer",
            background: "rgba(74,138,232,0.12)", border: "1px solid rgba(74,138,232,0.3)",
            color: "#4A8AE8", opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}
