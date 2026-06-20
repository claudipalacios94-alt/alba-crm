// ══════════════════════════════════════════════════════════════
// ALBA CRM — LlamaHoyCard v3
// Click en nota → panel inline con historial + agregar + borrar
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../../data/constants.js";
import { parsearNotas, serializarNotas, crearNota, TIPO_NOTA } from "../../domain/nota.js";
import { supabase } from "../../hooks/supabaseClient.js";

export default function LlamaHoyCard({ lead, onContactado }) {
  const [loading,      setLoading]      = useState(false);
  const [notaOpen,     setNotaOpen]     = useState(false);
  const [notaLocal,    setNotaLocal]    = useState(lead.nota);
  const [nuevoTexto,   setNuevoTexto]   = useState("");
  const [nuevoTipo,    setNuevoTipo]    = useState("seguimiento");
  const [savingNota,   setSavingNota]   = useState(false);

  const ag     = AG[lead.ag];
  const waLink = lead.tel ? "https://wa.me/" + lead.tel.replace(/\D/g, "") : null;

  const urgColor =
    lead.etapa === "Negociación" ? B.ok
    : lead.dias === null         ? B.muted
    : lead.dias <= 2             ? B.hot
    : lead.dias <= 5             ? B.warm
    :                              B.accentL;

  const notas    = parsearNotas(notaLocal);
  const lastNota = notas.length > 0 ? [...notas].sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0))[0] : null;

  const diasLabel =
    lead.dias === null ? null
    : lead.dias === 0  ? "Contactado hoy"
    : `+${lead.dias}d sin contacto`;

  const yaContactado = lead.dias === 0;

  async function handleContactado() {
    if (loading || yaContactado) return;
    setLoading(true);
    const { error } = await supabase.from("leads")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", lead.id);
    setLoading(false);
    if (error) {
      console.error("handleContactado error:", error);
      alert("No se pudo registrar el contacto. Revisá la conexión e intentá de nuevo.");
      return;
    }
    if (onContactado) onContactado(lead.id);
  }

  async function guardarNota() {
    const txt = nuevoTexto.trim();
    if (!txt) return;
    setSavingNota(true);
    const nuevas = [...notas, crearNota(txt, nuevoTipo)];
    const serialized = serializarNotas(nuevas);
    await supabase.from("leads").update({ nota: serialized }).eq("id", lead.id);
    setNotaLocal(serialized);
    setNuevoTexto("");
    setNuevoTipo("seguimiento");
    setSavingNota(false);
  }

  async function borrarNota(id) {
    const nuevas = notas.filter(n => n.id !== id);
    const serialized = serializarNotas(nuevas);
    await supabase.from("leads").update({ nota: serialized }).eq("id", lead.id);
    setNotaLocal(serialized);
  }

  return (
    <div style={{
      background: "#0C1527",
      border: "1px solid #1E293B",
      borderRadius: 10,
      overflow: "hidden",
      minWidth: 0,
    }}>
      {/* ── Cuerpo principal ─────────────────────────────────── */}
      <div style={{ padding: "11px 14px" }}>

        {/* Fila 1: nombre | días */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.nombre}
            </span>
            {ag && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
                background: ag.bg || "rgba(42,91,173,0.25)", color: ag.c,
                border: "1px solid " + ag.c + "40", flexShrink: 0 }}>
                {ag.n}
              </span>
            )}
          </div>
          {diasLabel && (
            <span style={{ fontSize: 11, fontWeight: 700, color: urgColor, flexShrink: 0, whiteSpace: "nowrap" }}>
              {diasLabel}
            </span>
          )}
        </div>

        {/* Fila 2: etapa · zona · tipo · presup */}
        <div style={{ fontSize: 11, color: "#64748B", marginBottom: 5 }}>
          <span style={{ color: urgColor + "CC", fontWeight: 600 }}>{lead.etapa}</span>
          {lead.zona && <span> · {lead.zona}</span>}
          {lead.tipo && <span> · {lead.tipo}</span>}
          {lead.presup && (
            <span style={{ color: "#4A8AE8", fontFamily: "Georgia,serif", fontWeight: 700 }}>
              {" · USD "}{Number(lead.presup).toLocaleString()}
            </span>
          )}
        </div>

        {/* Fila 3: última nota — clickeable para expandir */}
        <div
          onClick={() => setNotaOpen(o => !o)}
          style={{
            fontSize: 11, marginBottom: 8, cursor: "pointer",
            padding: "5px 8px", borderRadius: 6,
            background: notaOpen ? "#1E293B" : "rgba(255,255,255,0.03)",
            border: "1px solid " + (notaOpen ? "#334155" : "transparent"),
            transition: "background 0.15s",
          }}
        >
          {lastNota ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(() => {
                const cfg = TIPO_NOTA[lastNota.tipo] || TIPO_NOTA.seguimiento;
                return <span style={{ fontSize: 10, color: cfg.color, flexShrink: 0 }}>{cfg.emoji}</span>;
              })()}
              <span style={{
                flex: 1, color: "#94A3B8",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {lastNota.texto}
              </span>
              <span style={{ fontSize: 10, color: "#374151", flexShrink: 0 }}>
                {notas.length > 1 ? `+${notas.length - 1} más` : ""} {notaOpen ? "▲" : "▼"}
              </span>
            </div>
          ) : (
            <span style={{ color: "#374151", fontStyle: "italic" }}>
              Sin notas · click para agregar {notaOpen ? "▲" : "▼"}
            </span>
          )}
        </div>

        {/* Acciones: WA + ✓ */}
        <div style={{ display: "flex", gap: 8 }}>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, textAlign: "center",
                background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
                color: "#25D366", fontSize: 12, textDecoration: "none", fontWeight: 700 }}>
              WA
            </a>
          )}
          <button onClick={handleContactado} disabled={loading || yaContactado}
            style={{ padding: "6px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700,
              cursor: loading || yaContactado ? "default" : "pointer",
              background: yaContactado ? "rgba(74,222,128,0.10)" : "rgba(255,255,255,0.05)",
              border: yaContactado ? "1px solid rgba(74,222,128,0.3)" : "1px solid #1E293B",
              color: yaContactado ? "#4ADE80" : "#64748B",
              opacity: loading ? 0.5 : 1, flexShrink: 0 }}>
            ✓
          </button>
        </div>
      </div>

      {/* ── Panel de notas expandido ─────────────────────────── */}
      {notaOpen && (
        <div style={{
          borderTop: "1px solid #1E293B",
          background: "#080F1E",
          padding: "12px 14px",
        }}>

          {/* Historial */}
          {notas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {[...notas]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .map((nota, i) => {
                  const cfg = TIPO_NOTA[nota.tipo] || TIPO_NOTA.seguimiento;
                  return (
                    <div key={nota.id || i} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "6px 10px", borderRadius: 7,
                      background: "#0C1527",
                      borderLeft: `2px solid ${cfg.color}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 700 }}>
                            {cfg.emoji} {cfg.label}
                          </span>
                          {nota.createdAt && (
                            <span style={{ fontSize: 10, color: "#475569" }}>
                              {new Date(nota.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#C8D8E8", lineHeight: 1.4 }}>
                          {nota.texto}
                        </div>
                      </div>
                      {nota.id && nota.id !== "legacy" && (
                        <button onClick={() => borrarNota(nota.id)} style={{
                          background: "transparent", border: "none",
                          color: "#374151", cursor: "pointer",
                          fontSize: 12, padding: "0 2px", flexShrink: 0,
                        }}>
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Input nueva nota */}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={nuevoTexto}
              onChange={e => setNuevoTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guardarNota()}
              placeholder="Nueva nota..."
              style={{
                flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11,
                background: "#0C1527", border: "1px solid #1E293B",
                color: "#C8D8E8", outline: "none",
              }}
            />
            <button
              onClick={guardarNota}
              disabled={savingNota || !nuevoTexto.trim()}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: savingNota || !nuevoTexto.trim() ? "default" : "pointer",
                background: "rgba(74,138,232,0.12)", border: "1px solid rgba(74,138,232,0.3)",
                color: "#4A8AE8", opacity: savingNota ? 0.5 : 1,
              }}
            >
              {savingNota ? "..." : "+ Nota"}
            </button>
          </div>

          {/* Selector de tipo */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>
            {Object.entries(TIPO_NOTA).map(([key, cfg]) => (
              <button key={key} onClick={() => setNuevoTipo(key)} style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                border: `1px solid ${cfg.color}`,
                background: nuevoTipo === key ? cfg.color : "transparent",
                color: nuevoTipo === key ? "#fff" : cfg.color,
                cursor: "pointer",
              }}>
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
