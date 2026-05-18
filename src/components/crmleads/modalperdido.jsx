// ══════════════════════════════════════════════════════════════
// ALBA CRM — ModalPerdido
// Modal para registrar motivo de pérdida de un lead
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";

const MOTIVOS_PERDIDA = [
  "Precio fuera de rango",
  "Compró con otra inmobiliaria",
  "Encontró propietario directo",
  "Cambió de zona",
  "Desistió de comprar",
  "Sin respuesta — lead frío",
  "Financiamiento rechazado",
  "Motivo desconocido",
];

export default function ModalPerdido({ lead, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState("");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    const m = motivo === "Otro" ? custom.trim() : motivo;
    if (!m) return;
    setSaving(true);
    await onConfirmar(lead, m);
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onCancelar}>
      <div style={{ background:"#0F1E35", border:`1px solid ${B.hot}40`, borderRadius:14,
        padding:"24px 28px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:14, fontWeight:700, color:B.text, marginBottom:4 }}>
          ¿Por qué se perdió este lead?
        </div>
        <div style={{ fontSize:12, color:"#8AAECC", marginBottom:18 }}>
          {lead.nombre} — {lead.zona} · USD {(lead.presup||0).toLocaleString()}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {[...MOTIVOS_PERDIDA, "Otro"].map(m => (
            <button key={m} onClick={() => setMotivo(m)}
              style={{ padding:"10px 14px", borderRadius:8, cursor:"pointer", textAlign:"left",
                background: motivo === m ? B.hot+"20" : "transparent",
                border:`1px solid ${motivo === m ? B.hot : B.border}`,
                color: motivo === m ? "#E86060" : "#8AAECC", fontSize:13 }}>
              {m}
            </button>
          ))}
          {motivo === "Otro" && (
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Describí el motivo" autoFocus
              style={{ padding:"9px 12px", borderRadius:8, background:B.card,
                border:`1px solid ${B.border}`, color:B.text, fontSize:13, outline:"none" }} />
          )}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancelar}
            style={{ flex:1, padding:"10px", borderRadius:8, cursor:"pointer",
              background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:13 }}>
            Cancelar
          </button>
          <button onClick={confirmar}
            disabled={!motivo || (motivo === "Otro" && !custom.trim()) || saving}
            style={{ flex:1, padding:"10px", borderRadius:8, cursor:"pointer",
              background: motivo ? B.hot : B.border,
              border:`1px solid ${motivo ? B.hot : B.border}`,
              color: motivo ? "#fff" : "#8AAECC", fontSize:13, fontWeight:700 }}>
            {saving ? "Guardando..." : "Marcar como perdido"}
          </button>
        </div>
      </div>
    </div>
  );
}