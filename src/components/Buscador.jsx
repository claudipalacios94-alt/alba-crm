// ══════════════════════════════════════════════════════════════
// ALBA CRM — BUSCADOR ARGENPROP
// Genera links directos a Argenprop por lead — sin API, sin costo
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../data/constants.js";

// ── Mapeo de zonas a slugs de Argenprop ──────────────────────
const ZONA_SLUG = {
  "la perla":      "la-perla",
  "chauvin":       "chauvin",
  "centro":        "centro",
  "punta mogotes": "punta-mogotes",
  "playa grande":  "playa-grande",
  "san carlos":    "san-carlos",
  "san josé":      "san-jose",
  "san jose":      "san-jose",
  "constitución":  "constitucion",
  "constitucion":  "constitucion",
  "pompeya":       "pompeya",
  "don bosco":     "don-bosco",
  "san juan":      "san-juan",
  "floresta":      "floresta",
  "bosque grande": "bosque-grande",
  "güemes":        "guemes",
  "guemes":        "guemes",
  "libertad":      "libertad",
  "las heras":     "las-heras",
  "camet":         "camet",
  "peralta ramos": "peralta-ramos",
  "divino rostro": "divino-rostro",
  "los pinares":   "los-pinares",
  "alfar":         "alfar",
};

// Zonas alternativas por zona principal
const ZONAS_ALT = {
  "chauvin":       ["la-perla", "constitucion", "centro"],
  "la perla":      ["chauvin", "constitucion", "playa-grande"],
  "centro":        ["guemes", "constitucion", "san-juan"],
  "playa grande":  ["la-perla", "chauvin", "punta-mogotes"],
  "punta mogotes": ["playa-grande", "la-perla", "alfar"],
  "san carlos":    ["bosque-grande", "floresta", "pompeya"],
  "constitución":  ["centro", "guemes", "san-juan"],
  "constitucion":  ["centro", "guemes", "san-juan"],
  "bosque grande": ["san-carlos", "floresta", "las-heras"],
  "pompeya":       ["san-carlos", "floresta", "bosque-grande"],
};

const TIPO_SLUG = {
  "casa":         "casas",
  "departamento": "departamentos",
  "ph":           "ph",
  "local":        "locales",
  "terreno":      "terrenos",
  "duplex":       "casas",
  "dúplex":       "casas",
};

function buildArgenPropUrl(tipo, zona, presup, operacion) {
  const tipoSlug = TIPO_SLUG[tipo?.toLowerCase()] || "departamentos";
  const opSlug   = operacion === "alquiler" ? "alquiler" : "venta";
  const zonaSlug = ZONA_SLUG[zona?.toLowerCase()] || zona?.toLowerCase().replace(/\s+/g, "-") || "mar-del-plata";
  const precio   = presup ? `hasta-${Math.round(presup/1000)*1000}-dolares` : "";

  return `https://www.argenprop.com/${tipoSlug}/${opSlug}/mar-del-plata/${zonaSlug}/${precio}`.replace(/\/$/, "");
}

function ZonaBtn({ label, url, color }) {
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8,
        background: color + "12", border:`1px solid ${color}40`,
        color, fontSize:11, fontWeight:600, textDecoration:"none", whiteSpace:"nowrap" }}>
      📍 {label}
    </a>
  );
}

function LeadBuscador({ lead }) {
  const [open, setOpen] = useState(false);
  const ag = AG[lead.ag];
  const zona = lead.zona?.toLowerCase() || "";
  const zonaPrincipal = ZONA_SLUG[zona] || zona.replace(/\s+/g,"-");
  const alts = ZONAS_ALT[zona] || [];

  const urlPrincipal = buildArgenPropUrl(lead.tipo, lead.zona, lead.presup, lead.op);
  const urlsAlt = alts.slice(0,2).map(z => ({
    label: z.replace(/-/g," ").replace(/\b\w/g, c => c.toUpperCase()),
    url: buildArgenPropUrl(lead.tipo, z.replace(/-/g," "), lead.presup, lead.op),
  }));

  const urgColor = lead.dias <= 2 ? B.hot : lead.dias <= 5 ? B.warm : B.accentL;

  return (
    <div style={{ background:B.card, border:`1px solid ${urgColor}30`, borderLeft:`3px solid ${urgColor}`, borderRadius:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"11px 14px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:B.text }}>{lead.nombre}</span>
          {ag && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:ag.bg, color:ag.c, fontWeight:600 }}>{ag.n}</span>}
          <span style={{ fontSize:10, color:urgColor, fontWeight:600, marginLeft:"auto" }}>
            {lead.dias === 0 ? "Hoy" : `${lead.dias}d`}
          </span>
          <span style={{ fontSize:11, color:B.accentL }}>{open?"▲":"▼"}</span>
        </div>
        <div style={{ fontSize:12, color:"#8AAECC" }}>
          {lead.tipo} · {lead.zona} · {lead.presup ? `USD ${lead.presup.toLocaleString()}` : "Sin precio"}
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${B.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>

          {/* Zona principal */}
          <div>
            <div style={{ fontSize:10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom:6 }}>ZONA PRINCIPAL</div>
            <ZonaBtn label={lead.zona || "Mar del Plata"} url={urlPrincipal} color={B.accentL} />
          </div>

          {/* Zonas alternativas */}
          {urlsAlt.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom:6 }}>ZONAS ALTERNATIVAS</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {urlsAlt.map((z,i) => <ZonaBtn key={i} label={z.label} url={z.url} color="#8AAECC" />)}
              </div>
            </div>
          )}

          {/* Link amplio sin filtro de zona */}
          <div>
            <div style={{ fontSize:10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom:6 }}>BÚSQUEDA AMPLIA — TODA MDP</div>
            <ZonaBtn
              label="Ver todo Mar del Plata"
              url={buildArgenPropUrl(lead.tipo, "mar-del-plata", lead.presup, lead.op).replace("/mar-del-plata/mar-del-plata/", "/mar-del-plata/")}
              color="#4A6A90"
            />
          </div>

          {/* Nota del lead */}
          {lead.nota && (
            <div style={{ fontSize:11, color:"#6A8AAE", fontStyle:"italic", borderLeft:`2px solid ${B.border}`, paddingLeft:8 }}>
              {lead.nota.slice(0, 120)}{lead.nota.length > 120 ? "..." : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Buscador({ leads }) {
  const [filtro, setFiltro] = useState("");

  const activos = leads
    .filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.presup && l.zona)
    .sort((a,b) => a.dias - b.dias);

  const filtrados = filtro
    ? activos.filter(l => l.nombre?.toLowerCase().includes(filtro.toLowerCase()) || l.zona?.toLowerCase().includes(filtro.toLowerCase()))
    : activos;

  const calientes = filtrados.filter(l => l.dias <= 2);
  const tibios    = filtrados.filter(l => l.dias > 2 && l.dias <= 7);
  const frios     = filtrados.filter(l => l.dias > 7);

  return (
    <div style={{ overflowY:"auto", maxWidth:680, display:"flex", flexDirection:"column", gap:14 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Buscador Argenprop</h1>
        <p style={{ fontSize:12, color:"#8AAECC", margin:"3px 0 0" }}>Links directos por lead — abrís Argenprop con los filtros ya cargados</p>
      </div>

      {/* Filtro */}
      <input value={filtro} onChange={e=>setFiltro(e.target.value)}
        placeholder="Filtrar por nombre o zona..."
        style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:8, padding:"8px 12px",
          color:B.text, fontSize:12, outline:"none" }} />

      {/* Calientes */}
      {calientes.length > 0 && (
        <div>
          <div style={{ fontSize:10, color:B.hot, fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>🔴 CALIENTES — {calientes.length}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {calientes.map(l => <LeadBuscador key={l.id} lead={l} />)}
          </div>
        </div>
      )}

      {/* Tibios */}
      {tibios.length > 0 && (
        <div>
          <div style={{ fontSize:10, color:B.warm, fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>🟡 TIBIOS — {tibios.length}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {tibios.map(l => <LeadBuscador key={l.id} lead={l} />)}
          </div>
        </div>
      )}

      {/* Fríos */}
      {frios.length > 0 && (
        <div>
          <div style={{ fontSize:10, color:B.accentL, fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>🔵 FRÍOS — {frios.length}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {frios.map(l => <LeadBuscador key={l.id} lead={l} />)}
          </div>
        </div>
      )}

      {filtrados.length === 0 && (
        <div style={{ textAlign:"center", padding:"30px 0", color:"#4A6A90", fontSize:12 }}>
          Sin leads con zona y presupuesto definidos
        </div>
      )}
    </div>
  );
}
