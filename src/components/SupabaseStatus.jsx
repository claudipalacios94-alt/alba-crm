import React from "react";
import { B } from "../data/constants.js";

export default function SupabaseStatus({ loading, error, lastSync, onReload }) {
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 8px",
      background:"rgba(74,138,232,0.08)", border:"1px solid "+B.border,
      borderRadius:6, fontSize:9, color:B.muted }}>
      <div style={{ width:5, height:5, borderRadius:"50%",
        border:"1px solid "+B.accentL, borderTop:"1px solid "+B.border,
        animation:"spin .7s linear infinite", flexShrink:0 }}/>
      Sincronizando...
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
  if (error) return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 8px",
      background:"rgba(232,93,48,0.08)", border:"1px solid rgba(232,93,48,0.2)",
      borderRadius:6, fontSize:9, color:B.hot }}>
      <div style={{ width:5, height:5, borderRadius:"50%", background:B.hot, flexShrink:0 }}/>
      <span style={{ flex:1 }}>Sin conexión · modo demo</span>
      <button onClick={onReload} style={{ background:"transparent", border:"none",
        color:B.hot, cursor:"pointer", fontSize:11, padding:0 }}>↻</button>
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 8px",
      background:"rgba(46,158,106,0.1)", border:"1px solid rgba(46,158,106,0.2)",
      borderRadius:6, fontSize:9, color:"#2E9E6A" }}>
      <div style={{ width:5, height:5, borderRadius:"50%", background:"#2E9E6A", flexShrink:0 }}/>
      <span style={{ flex:1 }}>
        Supabase · {lastSync?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
      </span>
      <button onClick={onReload} style={{ background:"transparent", border:"none",
        color:"#2E9E6A", cursor:"pointer", fontSize:11, padding:0 }}>↻</button>
    </div>
  );
}
