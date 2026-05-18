// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadMatches
// Lista de propiedades compatibles con un lead
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B, matchLeadProps, genMsgWhatsApp } from "../../data/constants.js";

export default function LeadMatches({ lead, properties, captaciones, mostrados, toggleMostrado }) {
  const capsNorm = (captaciones||[]).map(c => ({
    id: "cap-"+c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
    dir: c.direccion, caracts: c.caracts, activa: true,
    _esCaptacion: true, _tipoCap: c.tipo_captacion,
    _url: c.url, _propietario: c.nombre_propietario, _tel: c.telefono,
  }));
  const todasProps = [...(properties||[]), ...capsNorm];
  const matches = matchLeadProps(lead, todasProps);

  if (!matches.length) return null;

  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, color:"#8AAECC", letterSpacing:"1px", fontWeight:600, marginBottom:6 }}>
        🏠 PROPIEDADES COMPATIBLES ({matches.length})
      </div>
      {matches.slice(0, 3).map(prop => {
        const msg  = genMsgWhatsApp(lead, prop);
        const wa   = lead.tel
          ? `https://wa.me/${lead.tel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
          : null;
        const yaMostrado = mostrados.has(`${lead.id}-${prop.id}`);
        return (
          <div key={prop.id} style={{ display:"flex", alignItems:"center", gap:8,
            background:B.bg, borderRadius:7, padding:"7px 10px", marginBottom:5,
            opacity: yaMostrado ? 0.45 : 1 }}>
            <button onClick={() => toggleMostrado(lead.id, prop.id)}
              style={{ width:16, height:16, borderRadius:"50%", border:"1.5px solid",
                borderColor: yaMostrado ? "#2E9E6A" : "#4A6A90",
                background: yaMostrado ? "#2E9E6A" : "transparent",
                cursor:"pointer", flexShrink:0, fontSize:9, color:"white",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              {yaMostrado ? "✓" : ""}
            </button>
            <div style={{ flex:1, fontSize:11, color:B.muted,
              textDecoration: yaMostrado ? "line-through" : "none" }}>
              <span style={{ color: yaMostrado ? "#6A8AAE" : B.text, fontWeight:600 }}>{prop.tipo}</span>
              {" · "}{prop.zona}
              {" · "}<span style={{ color: yaMostrado ? "#6A8AAE" : B.accentL }}>
                USD {(prop.precio||0).toLocaleString()}
              </span>
              {prop.dir && <span style={{ color:B.muted }}> · {prop.dir}</span>}
              {prop._esCaptacion && (
                <span style={{ marginLeft:6, fontSize:9, padding:"1px 5px", borderRadius:4,
                  background:"rgba(204,34,51,0.15)", color:"#CC2233",
                  border:"1px solid rgba(204,34,51,0.3)" }}>
                  📌 {prop._tipoCap||"captación"}
                </span>
              )}
            </div>
            {wa && !yaMostrado && (
              <a href={wa} target="_blank" rel="noreferrer"
                style={{ padding:"3px 9px", borderRadius:6, whiteSpace:"nowrap",
                  background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                  color:"#25D366", fontSize:12, textDecoration:"none", fontWeight:600 }}>
                💬 WA
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}