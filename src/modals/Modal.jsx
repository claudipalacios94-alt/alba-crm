// ══════════════════════════════════════════════════════════════
// ALBA CRM — WRAPPER MODAL GENÉRICO
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../data/constants.js";

export default function Modal({ title, onClose, children, maxWidth = 660 }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Backdrop */}
      <div style={{ position:"absolute", inset:0, background:"rgba(4,8,18,0.85)" }} onClick={onClose} />

      {/* Panel */}
      <div style={{ position:"relative", background:B.sidebar,
        border:`1px solid ${B.accentL}50`, borderRadius:16,
        width:"100%", maxWidth, maxHeight:"88vh", overflowY:"auto",
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
        boxShadow:"0 24px 80px rgba(0,0,0,0.9)" }}>

        {/* Header sticky */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 22px 14px", borderBottom:`1px solid ${B.border}`,
          position:"sticky", top:0, background:B.sidebar, zIndex:10 }}>
          <div style={{ fontSize:15, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>{title}</div>
          <button onClick={onClose}
            style={{ background:"transparent", border:`1px solid ${B.border}`, borderRadius:8,
              width:30, height:30, cursor:"pointer", color:B.muted, fontSize:18, lineHeight:1,
              display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Contenido */}
        <div style={{ padding:"20px 22px 24px" }}>{children}</div>
      </div>
    </div>
  );
}
