// ══════════════════════════════════════════════════════════════
// ALBA CRM — PropSeccion
// Sección colapsable con título y grid de PropCards
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import PropCard from "./PropCard.jsx";

export default function PropSeccion({ titulo, color, props, leads, supabase, updateProperty, deleteProperty, mobile, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (props.length === 0) return null;
  return (
    <div style={{ marginBottom: mobile ? 20 : 28 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 10,
          marginBottom: mobile ? 10 : 12, cursor:"pointer",
          padding: mobile ? "8px 0" : "6px 0", borderBottom:"1px solid "+color+"30" }}>
        <div style={{ width: mobile ? 10 : 8, height: mobile ? 10 : 8, borderRadius:"50%", background:color }} />
        <span style={{ fontSize: mobile ? 13 : 12, fontWeight:700, color, letterSpacing:"1px", textTransform:"uppercase" }}>
          {titulo}
        </span>
        <span style={{ fontSize: mobile ? 13 : 12, color:"#4A6A90" }}>({props.length})</span>
        <span style={{ fontSize: mobile ? 13 : 12, color:"#4A6A90", marginLeft:"auto" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: mobile ? 14 : 12 }}>
          {props.map(p => (
            <PropCard key={p.id} p={p} leads={leads} supabase={supabase}
              updateProperty={updateProperty} deleteProperty={deleteProperty} mobile={mobile} />
          ))}
        </div>
      )}
    </div>
  );
}
