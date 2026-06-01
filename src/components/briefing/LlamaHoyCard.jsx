// ══════════════════════════════════════════════════════════════
// ALBA CRM — LlamaHoyCard v2
// Días inline con el nombre (derecha). Nota truncada. WA + ✓
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

  const notas    = parsearNotas(lead.nota);
  const lastNota = notas.length > 0 ? notas[notas.length - 1] : null;

  const diasLabel =
    lead.dias === null ? null
    : lead.dias === 0  ? "Contactado hoy"
    : `+${lead.dias}d sin contacto`;

  const yaContactado = lead.dias === 0;

  async function handleContactado() {
    if (loading || yaContactado) return;
    setLoading(true);
    await supabase.from("leads")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", lead.id);
    setLoading(false);
    if (onContactado) onContactado(lead.id);
  }

  return (
    <div style={{
      background: "#0C1527",
      border: "1px solid #1E293B",
      borderRadius: 10,
      padding: "12px 14px",
      overflow: "hidden", minWidth: 0,
    }}>

      {/* Fila 1: nombre | días (derecha) */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9",
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
          <span style={{ fontSize: 11, fontWeight: 700, color: urgColor,
            flexShrink: 0, whiteSpace: "nowrap" }}>
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

      {/* Fila 3: última nota */}
      {lastNota && (
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 10,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {lastNota.texto}
        </div>
      )}

      {/* Acciones: WA + ✓ */}
      <div style={{ display: "flex", gap: 8 }}>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            style={{ flex: 1, padding: "7px 0", borderRadius: 7, textAlign: "center",
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
              color: "#25D366", fontSize: 12, textDecoration: "none", fontWeight: 700 }}>
            WA
          </a>
        )}
        <button onClick={handleContactado} disabled={loading || yaContactado}
          style={{ padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700,
            cursor: loading || yaContactado ? "default" : "pointer",
            background: yaContactado ? "rgba(74,222,128,0.10)" : "rgba(255,255,255,0.05)",
            border: yaContactado ? "1px solid rgba(74,222,128,0.3)" : "1px solid #1E293B",
            color: yaContactado ? "#4ADE80" : "#64748B",
            opacity: loading ? 0.5 : 1, flexShrink: 0 }}>
          ✓
        </button>
      </div>
    </div>
  );
}
