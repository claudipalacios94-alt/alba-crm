// ══════════════════════════════════════════════════════════════
// ALBA CRM — NotaLead
// Widget para agregar y ver notas tipadas en un lead comprador
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";
import { TIPO_NOTA, parsearNotas, serializarNotas, crearNota } from "../../domain/nota.js";

export default function NotaLead({ lead, onGuardar }) {
  const notas = parsearNotas(lead.nota);
  const [texto, setTexto] = useState("");
  const [tipo,  setTipo]  = useState("seguimiento");

  async function guardar() {
    if (!texto.trim()) return;
    const nuevas = [...notas, crearNota(texto, tipo)];
    await onGuardar(lead, serializarNotas(nuevas));
    setTexto("");
    setTipo("seguimiento");
  }

  async function borrar(id) {
    const nuevas = notas.filter(n => n.id !== id);
    await onGuardar(lead, serializarNotas(nuevas));
  }

  return (
    <div style={{ marginTop: 8, marginBottom: 10 }}>

      {/* Input */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") guardar(); }}
          placeholder="Agregar nota..."
          style={{
            flex: 1, background: B.bg, border: `1px solid ${B.border}`,
            borderRadius: 6, padding: "6px 10px", color: B.text,
            fontSize: 11, outline: "none",
          }}
        />
        <button onClick={guardar} style={{
          padding: "6px 12px", borderRadius: 6, cursor: "pointer",
          background: `${B.accentL}18`, border: `1px solid ${B.accentL}40`,
          color: B.accentL, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
        }}>
          + Nota
        </button>
      </div>

      {/* Selector de tipo */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
        {Object.entries(TIPO_NOTA).map(([key, cfg]) => (
          <button key={key} onClick={() => setTipo(key)} style={{
            padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
            border: `1px solid ${cfg.color}`,
            background: tipo === key ? cfg.color : "transparent",
            color: tipo === key ? "#fff" : cfg.color,
            cursor: "pointer",
          }}>
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* Historial */}
      {notas.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {[...notas]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .map((nota, i) => {
              const cfg = TIPO_NOTA[nota.tipo] || TIPO_NOTA.seguimiento;
              return (
                <div key={nota.id || i} style={{
                  display: "flex", alignItems: "flex-start", gap: 6,
                  background: "rgba(10,21,37,0.5)", borderRadius: 5,
                  padding: "5px 8px", marginBottom: 4,
                  borderLeft: `2px solid ${cfg.color}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, color: cfg.color, fontWeight: 700 }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    {nota.createdAt && (
                      <span style={{ fontSize: 10, color: "#475569", marginLeft: 6 }}>
                        {new Date(nota.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "short",
                        })}
                      </span>
                    )}
                    <div style={{ fontSize: 11, color: "#C8D8E8", marginTop: 2 }}>
                      {nota.texto}
                    </div>
                  </div>
                  {nota.id && nota.id !== "legacy" && (
                    <button onClick={() => borrar(nota.id)} style={{
                      background: "transparent", border: "none",
                      color: "#475569", cursor: "pointer", fontSize: 12,
                      padding: "0 2px", lineHeight: 1, flexShrink: 0,
                    }} title="Borrar nota">
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
