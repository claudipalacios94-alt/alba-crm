// ══════════════════════════════════════════════════════════════
// ALBA CRM — LlamaHoyCard
// Card operativa para LLAMA HOY. Extiende lógica de BriefingLeadCard
// sin modificarla. Orden: transparente por etapa + días.
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../../data/constants.js";
import { parsearNotas } from "../../domain/nota.js";
import { supabase } from "../../hooks/supabaseClient.js";

export default function LlamaHoyCard({ lead, onContactado }) {
  const [loading, setLoading] = useState(false);

  const ag     = AG[lead.ag];
  const waLink = lead.tel ? "https://wa.me/" + lead.tel.replace(/\D/g, "") : null;

  const urgColor =
    lead.etapa === "Negociación" ? B.ok
    : lead.dias === null         ? B.muted
    : lead.dias <= 2             ? B.hot
    : lead.dias <= 5             ? B.warm
    :                              B.accentL;

  // Última nota — solo contexto visual, no altera orden
  const notas     = parsearNotas(lead.nota);
  const ultimaNota = notas.length > 0 ? notas[notas.length - 1] : null;

  // Días sin contacto
  const diasLabel =
    lead.dias === null              ? null
    : lead.dias === 0               ? "Contactado hoy"
    : `+${lead.dias}d sin contacto`;

  async function handleContactado() {
    if (loading || lead.dias === 0) return;
    setLoading(true);
    await supabase
      .from("leads")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", lead.id);
    setLoading(false);
    if (onContactado) onContactado(lead.id);
  }

  const yaContactado = lead.dias === 0;

  return (
    <div style={{
      background: B.card,
      border: "1px solid " + urgColor + "30",
      borderLeft: "3px solid " + urgColor,
      borderRadius: 10,
      padding: "11px 14px",
      overflow: "hidden",
      minWidth: 0,
    }}>

      {/* Fila 1: nombre + agente + etapa */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FA" }}>
          {lead.nombre}
        </span>
        {ag && (
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
            background: ag.bg || "rgba(42,91,173,0.25)", color: ag.c,
            border: "1px solid " + ag.c + "40",
          }}>{ag.n}</span>
        )}
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 700,
          background: urgColor + "18", color: urgColor,
          padding: "1px 7px", borderRadius: 10,
        }}>
          {lead.etapa}
        </span>
      </div>

      {/* Fila 2: zona · tipo · presupuesto */}
      <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 5 }}>
        {[lead.zona, lead.tipo].filter(Boolean).join(" · ")}
        {lead.presup && (
          <span style={{ color: B.accentL, fontFamily: "Georgia,serif", fontWeight: 700 }}>
            {" · USD "}{Number(lead.presup).toLocaleString()}
          </span>
        )}
      </div>

      {/* Fila 3: última nota como contexto */}
      {ultimaNota && (
        <div style={{
          fontSize: 11, color: "#4A6A90", marginBottom: 6,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {ultimaNota.texto}
        </div>
      )}

      {/* Fila 4: días */}
      {diasLabel && (
        <div style={{ fontSize: 10, color: urgColor, fontWeight: 700, marginBottom: 8 }}>
          {diasLabel}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8 }}>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, padding: "7px 0", borderRadius: 7, textAlign: "center",
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
              color: "#25D366", fontSize: 12, textDecoration: "none", fontWeight: 700,
            }}
          >
            WA
          </a>
        )}
        <button
          onClick={handleContactado}
          disabled={loading || yaContactado}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 700,
            cursor: loading || yaContactado ? "default" : "pointer",
            background: yaContactado ? "rgba(74,222,128,0.08)" : "rgba(74,173,232,0.10)",
            border: yaContactado ? "1px solid rgba(74,222,128,0.3)" : `1px solid ${B.accentL}40`,
            color: yaContactado ? "#4ADE80" : B.accentL,
            opacity: loading ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "..." : yaContactado ? "✓ Hoy" : "✓ Hoy"}
        </button>
      </div>
    </div>
  );
}
