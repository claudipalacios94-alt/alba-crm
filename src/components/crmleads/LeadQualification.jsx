// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadQualification
// Bloque de calificación estructural dentro de LeadCard.
// Sin conexión directa a Supabase — usa onUpdate del padre.
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";
import { getQualificationScore } from "../../domain/lead.js";

const SENALES = [
  { key: "q_visitas_previas",   label: "¿Cuánto lleva buscando?",  placeholder: "ej: 3 meses, desde enero...", icon: "🕐" },
  { key: "q_freno",             label: "¿Qué le frenó antes?",     placeholder: "ej: precio, ubicación...",   icon: "🚧" },
  { key: "q_tiene_para_vender", label: "¿Tiene algo para vender?", placeholder: "ej: no / depto en Centro...",icon: "🔄" },
  { key: "q_fecha_limite",      label: "¿Hay fecha límite?",       placeholder: "ej: vence alquiler agosto...",icon: "📅" },
];

export default function LeadQualification({ lead, onUpdate }) {
  const [editando, setEditando] = useState(null);
  const [val,      setVal]      = useState("");
  const [saving,   setSaving]   = useState(false);

  const respondidas = SENALES.filter(s => lead[s.key]).length;
  const qScore      = getQualificationScore(lead);
  const pct         = Math.round((respondidas / SENALES.length) * 100);
  const barColor    = respondidas <= 1 ? "#CC2233" : respondidas <= 2 ? "#E8A830" : respondidas <= 3 ? "#4A8ABE" : "#2E9E6A";

  async function guardar(key) {
    if (!val.trim()) { setEditando(null); return; }
    setSaving(true);
    await onUpdate(lead.id, { [key]: val.trim() });
    setEditando(null);
    setSaving(false);
  }

  async function borrar(key) {
    await onUpdate(lead.id, { [key]: null });
  }

  return (
    <div style={{ marginBottom: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#4A6A90", letterSpacing: "0.8px", textTransform: "uppercase" }}>
          Calificación
        </span>
        <div style={{ flex: 1, height: 3, background: B.border, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 10, color: barColor, fontWeight: 700, flexShrink: 0 }}>{respondidas}/{SENALES.length}</span>
        {qScore > 0 && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4,
            background: "#2E9E6A18", color: "#2E9E6A", border: "1px solid #2E9E6A30", fontWeight: 700 }}>
            +{qScore}pts
          </span>
        )}
      </div>

      {/* Señales */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SENALES.map(s => {
          const tieneValor = !!lead[s.key];
          const enEdicion  = editando === s.key;

          return (
            <div key={s.key}>
              {enEdicion ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{s.icon}</span>
                  <input autoFocus value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") guardar(s.key); if (e.key === "Escape") setEditando(null); }}
                    placeholder={s.placeholder}
                    style={{ flex: 1, background: B.bg, border: `1px solid ${B.accentL}`,
                      borderRadius: 5, padding: "4px 8px", color: B.text, fontSize: 11, outline: "none" }} />
                  <button onClick={() => guardar(s.key)} disabled={saving}
                    style={{ padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                      background: B.accent, border: "none", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    {saving ? "..." : "OK"}
                  </button>
                  <button onClick={() => setEditando(null)}
                    style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                      background: "transparent", border: `1px solid ${B.border}`, color: "#4A6A90", fontSize: 11 }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div onClick={() => { setEditando(s.key); setVal(lead[s.key] || ""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                    borderRadius: 6, cursor: "pointer",
                    background: tieneValor ? "rgba(46,158,106,0.06)" : "rgba(204,34,51,0.04)",
                    border: `1px solid ${tieneValor ? "#2E9E6A20" : "#CC223318"}` }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, color: "#6A8AAE", whiteSpace: "nowrap" }}>{s.label}</span>
                  {tieneValor ? (
                    <>
                      <span style={{ fontSize: 11, color: "#A8C8E8", flex: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>
                        {lead[s.key]}
                      </span>
                      <button onClick={e => { e.stopPropagation(); borrar(s.key); }}
                        style={{ background: "transparent", border: "none",
                          color: "#2A3A5A", cursor: "pointer", fontSize: 11, padding: "0 2px", flexShrink: 0 }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: "#4A3040", flex: 1, textAlign: "right" }}>sin dato</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
