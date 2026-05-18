// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingCanales
// Análisis de canales de captación con conversión
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../../data/constants.js";

const CANAL_CONFIG = {
  "facebook":           { label:"Facebook",    color:"#1877F2" },
  "instagram":          { label:"Instagram",   color:"#E1306C" },
  "zonaprop":           { label:"ZonaProp",    color:"#FF6B35" },
  "cartel":             { label:"Cartel",      color:"#E8A830" },
  "referido":           { label:"Referido",    color:"#2E9E6A" },
  "whatsapp":           { label:"WhatsApp",    color:"#25D366" },
  "whatsapp / referido":{ label:"WA/Referido", color:"#25D366" },
  "otro":               { label:"Otro",        color:"#8AAECC" },
};

export default function BriefingCanales({ leads }) {
  const total = leads.length;

  const conteo = {};
  leads.forEach(l => {
    const key = (l.origen||"otro").toLowerCase().trim();
    conteo[key] = (conteo[key]||0) + 1;
  });

  const conversion = {};
  leads.forEach(l => {
    const key = (l.origen||"otro").toLowerCase().trim();
    if (l.etapa === "Negociación" || l.etapa === "Cerrado") {
      conversion[key] = (conversion[key]||0) + 1;
    }
  });

  const canales = Object.entries(conteo)
    .sort((a,b) => b[1]-a[1])
    .map(([key, cnt]) => {
      const cfg      = CANAL_CONFIG[key] || { label:key, color:"#8AAECC" };
      const conv     = conversion[key] || 0;
      const pct      = Math.round((cnt/total)*100);
      const convPct  = Math.round((conv/cnt)*100);
      return { key, cfg, cnt, pct, conv, convPct };
    });

  const maxCnt = Math.max(...canales.map(c => c.cnt), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:10, color:"#4A6A90", lineHeight:1.5 }}>
        La barra muestra volumen de leads. El porcentaje verde es conversión a negociación/cierre.
      </div>
      {canales.map(({ key, cfg, cnt, pct, conv, convPct }) => (
        <div key={key}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:B.text }}>{cfg.label}</span>
              <span style={{ fontSize:11, color:"#4A6A90" }}>{cnt} leads · {pct}%</span>
            </div>
            {conv > 0 && (
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
                background:"rgba(46,158,106,0.15)", color:"#2E9E6A",
                border:"1px solid rgba(46,158,106,0.3)", fontWeight:700 }}>
                {convPct}% conv.
              </span>
            )}
          </div>
          <div style={{ height:8, background:"rgba(10,21,37,0.5)", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(cnt/maxCnt)*100}%`,
              background:`linear-gradient(90deg, ${cfg.color}CC, ${cfg.color}88)`,
              borderRadius:4, transition:"width 0.4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}