// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadAcciones
// Botones de acción de un lead: contactar, editar, buscar, etc.
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B, genMsgBusqueda } from "../../data/constants.js";

export default function LeadAcciones({
  lead, mobile, updateLead, onEditar, onEliminar,
  buscandoId, setBuscandoId, toggleInversor, guardarNotaInversor,
}) {
  function abrirBusqueda() {
    const msg  = lead.msg_busqueda || genMsgBusqueda(lead);
    const turno = new Date().getHours() < 14 ? "manana" : "tarde";
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
    modal.innerHTML = `<div style="background:#0F1E35;border:1px solid #2A5BA830;border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.85)">
      <div style="font-size:11px;color:#8AAECC;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">📋 MENSAJE BÚSQUEDA</div>
      <textarea id="busqueda-txt" style="width:100%;height:200px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#E8F0FA;font-size:13px;line-height:1.7;resize:vertical;outline:none;font-family:inherit;box-sizing:border-box">${msg}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="busqueda-copy" style="flex:1;padding:10px;border-radius:8px;background:#E8A830;border:none;color:#0F1E35;font-size:13px;font-weight:700;cursor:pointer">Copiar y guardar</button>
        <button id="busqueda-reset" style="padding:10px 12px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:12px;cursor:pointer">↺</button>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 16px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:13px;cursor:pointer">Cancelar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.querySelector("#busqueda-copy").onclick = () => {
      const txt  = modal.querySelector("#busqueda-txt").value;
      const hoy  = new Date().toISOString().slice(0,10);
      navigator.clipboard.writeText(txt).then(() => {
        updateLead(lead.id, { msg_busqueda: txt, [`enviado_${turno}`]: hoy });
        modal.remove();
      });
    };
    modal.querySelector("#busqueda-reset").onclick = () => {
      modal.querySelector("#busqueda-txt").value = genMsgBusqueda(lead);
    };
  }

  const hoy = new Date().toISOString().slice(0,10);
  const okM = lead.enviado_manana === hoy;
  const okT = lead.enviado_tarde  === hoy;

  const btn = (label, onClick, color = B.accentL, bg = `${B.accentL}12`) => ({
    onClick,
    style: {
      padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, cursor:"pointer",
      background:bg, border:`1px solid ${color}30`, color, fontSize: mobile ? 13 : 12, fontWeight:600,
    },
    children: label,
  });

  return (
    <div style={{ display:"flex", gap: mobile ? 8 : 7, flexWrap:"wrap" }}>
      <button {...btn("✅ Contacté hoy",
        () => updateLead(lead.id, { last_contact_at: new Date().toISOString() }),
        B.ok, `${B.ok}18`)} />

      {lead.tel && (
        <a href={`https://wa.me/${lead.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
          style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6,
            background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
            color:"#25D366", fontSize: mobile ? 13 : 12, textDecoration:"none", fontWeight:600 }}>
          💬 WA
        </a>
      )}

      {lead.tel && (
        <a href={`tel:${lead.tel}`}
          style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6,
            background:`${B.ok}18`, border:`1px solid ${B.ok}40`,
            color:B.ok, fontSize: mobile ? 13 : 12, textDecoration:"none", fontWeight:600 }}>
          📞 Llamar
        </a>
      )}

      <button {...btn("✏️ Editar", onEditar)} />

      <button onClick={() => setBuscandoId(b => b === lead.id ? null : lead.id)}
        style={{ padding: mobile ? "7px 14px" : "5px 12px", borderRadius:6, cursor:"pointer",
          fontSize: mobile ? 13 : 12, fontWeight:600,
          background: buscandoId === lead.id ? `${B.accentL}25` : `${B.accentL}12`,
          border:`1px solid ${buscandoId === lead.id ? B.accentL : B.accentL+"30"}`,
          color:B.accentL }}>
        🔍 Buscar
      </button>

      <button onClick={abrirBusqueda}
        style={{ padding:"5px 12px", borderRadius:6, cursor:"pointer",
          background:"rgba(232,168,48,0.12)", border:"1px solid rgba(232,168,48,0.3)",
          color:"#E8A830", fontSize:12, fontWeight:600 }}>
        📋 Búsqueda WA
      </button>

      {/* Enviado mañana/tarde */}
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <button onClick={() => updateLead(lead.id, { enviado_manana: okM ? null : hoy })}
          style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
            background: okM ? "rgba(204,34,51,0.2)" : "transparent",
            border:`1px solid ${okM ? "#CC2233" : B.border}`,
            color: okM ? "#CC2233" : "#4A6A90", fontWeight:700 }}>
          {okM ? "☀✓" : "☀"}
        </button>
        <button onClick={() => updateLead(lead.id, { enviado_tarde: okT ? null : hoy })}
          style={{ padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:11,
            background: okT ? "rgba(204,34,51,0.2)" : "transparent",
            border:`1px solid ${okT ? "#CC2233" : B.border}`,
            color: okT ? "#CC2233" : "#4A6A90", fontWeight:700 }}>
          {okT ? "🌙✓" : "🌙"}
        </button>
      </div>

      <button onClick={onEliminar}
        style={{ padding:"5px 12px", borderRadius:6, cursor:"pointer",
          background:`${B.hot}12`, border:`1px solid ${B.hot}30`,
          color:B.hot, fontSize:12, fontWeight:600, marginLeft:"auto" }}>
        🗑
      </button>
    </div>
  );
}