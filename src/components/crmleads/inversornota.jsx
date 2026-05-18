// ══════════════════════════════════════════════════════════════
// ALBA CRM — InversorNota
// Widget inline para editar la nota de un lead inversor
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";

export default function InversorNota({ lead, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [val,      setVal]      = useState(lead.nota_inversor || "");

  async function guardar() {
    await onGuardar(lead, val);
    setEditando(false);
  }

  if (editando) return (
    <div style={{ display:"flex", gap:4, flex:1 }}>
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditando(false); }}
        placeholder="ej: busca renta 6%, quiere 2 unidades..."
        autoFocus
        style={{ flex:1, background:"rgba(10,21,37,0.6)", border:"1px solid #9B6DC8",
          borderRadius:5, padding:"3px 8px", color:"#C8D8E8", fontSize:11, outline:"none" }} />
      <button onClick={guardar}
        style={{ padding:"3px 8px", borderRadius:5, cursor:"pointer",
          background:"#9B6DC8", border:"none", color:"#fff", fontSize:10, fontWeight:700 }}>
        OK
      </button>
    </div>
  );

  return (
    <div onClick={() => setEditando(true)} style={{ flex:1, cursor:"pointer" }}>
      {lead.nota_inversor
        ? <span style={{ fontSize:11, color:"#C8A8E8", fontStyle:"italic" }}>{lead.nota_inversor}</span>
        : <span style={{ fontSize:10, color:"#6A4A90" }}>+ agregar nota</span>}
    </div>
  );
}
