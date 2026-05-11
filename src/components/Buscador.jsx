// ══════════════════════════════════════════════════════════════
// ALBA CRM — BUSCADOR ARGENPROP
// Genera links directos a Argenprop por lead — sin API, sin costo
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../data/constants.js";

// ── Mapeo de zonas a slugs de Argenprop ──────────────────────
const ZONA_SLUG = {
  "la perla":          "la-perla",
  "chauvin":           "chauvin",
  "chauvin perla":     "chauvin",
  "perla":             "la-perla",
  "centro":            "centro",
  "punta mogotes":     "punta-mogotes",
  "mogotes":           "punta-mogotes",
  "playa grande":      "playa-grande",
  "san carlos":        "san-carlos",
  "san josé":          "san-jose",
  "san jose":          "san-jose",
  "constitución":      "constitucion",
  "constitucion":      "constitucion",
  "pompeya":           "pompeya",
  "don bosco":         "don-bosco",
  "san juan":          "san-juan",
  "floresta":          "floresta",
  "bosque grande":     "bosque-grande",
  "güemes":            "guemes",
  "guemes":            "guemes",
  "libertad":          "libertad",
  "las heras":         "las-heras",
  "camet":             "camet",
  "peralta ramos":     "peralta-ramos",
  "divino rostro":     "divino-rostro",
  "los pinares":       "los-pinares",
  "alfar":             "alfar",
  "plaza colon":       "centro",
  "plaza colón":       "centro",
  "mitre":             "centro",
  "villa primera":     "villa-primera",
  "parque luro":       "parque-luro",
  "parque palermo":    "parque-palermo",
  "mar del plata":     "mar-del-plata",
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

  // Tomar solo la primera zona si hay varias separadas por coma/barra
  const zonaPrimera = (zona || "").split(/[,\/]/)[0].trim().toLowerCase();
  const zonaSlug = ZONA_SLUG[zonaPrimera] || zonaPrimera.replace(/\s+/g, "-") || "mar-del-plata";

  // Construir URL limpia
  let url = `https://www.argenprop.com/${tipoSlug}/${opSlug}/mar-del-plata/${zonaSlug}`;
  if (presup) url += `/hasta-${Math.round(presup/1000)*1000}-dolares`;

  return url;
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

          {/* Zonas del lead */}
          <div>
            <div style={{ fontSize:10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom:6 }}>
              {urlsZonas.length > 1 ? "ZONAS DEL LEAD" : "ZONA PRINCIPAL"}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {urlsZonas.map((z,i) => <ZonaBtn key={i} label={z.label} url={z.url} color={B.accentL} />)}
            </div>
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

  const [showMail, setShowMail] = useState(false);
  const [mailCopiado, setMailCopiado] = useState(false);

  function generarMail() {
    const calientes = activos.filter(l => l.dias <= 2);
    const tibios    = activos.filter(l => l.dias > 2 && l.dias <= 7);

    function formatLead(l) {
      const precio = l.presup ? `USD ${l.presup.toLocaleString()}` : "presupuesto a consultar";
      const partes = [l.tipo, l.zona && `en ${l.zona}`, precio].filter(Boolean).join(", ");
      const extras = [
        l.credito === "si" && "crédito aprobado",
        l.cochera === "si" && "con cochera",
        l.patio === "si" && "con patio",
        l.ambientes && `${l.ambientes} amb`,
      ].filter(Boolean).join(" · ");
      return `• ${partes}${extras ? ` — ${extras}` : ""}`;
    }

    let mail = `Buenos días colegas,

Les comparto mis pedidos activos de Alba Inversiones:
`;

    if (calientes.length > 0) {
      mail += `
🔴 URGENTES (compradores activos)
`;
      mail += calientes.map(formatLead).join("\n");
    }

    if (tibios.length > 0) {
      mail += `

🟡 EN BÚSQUEDA
`;
      mail += tibios.map(formatLead).join("\n");
    }

    mail += `

Cualquier opción que encaje, me avisan.

Saludos,
Alejandra Alba
Reg. 3832`;

    return mail;
  }

  function copiarMail() {
    navigator.clipboard.writeText(generarMail());
    setMailCopiado(true);
    setTimeout(() => setMailCopiado(false), 2000);
  }

  return (
    <div style={{ maxWidth:680, display:"flex", flexDirection:"column", gap:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Buscador Argenprop</h1>
          <p style={{ fontSize:12, color:"#8AAECC", margin:"3px 0 0" }}>Links directos por lead — abrís Argenprop con los filtros ya cargados</p>
        </div>
        <button onClick={()=>setShowMail(m=>!m)}
          style={{ padding:"8px 14px", borderRadius:9, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
            background: showMail ? B.accent : "rgba(42,91,173,0.12)",
            border:`1px solid ${showMail ? B.accentL : B.border}`,
            color: showMail ? "#fff" : B.accentL, fontSize:12, fontWeight:600 }}>
          ✉ Mail de pedidos
        </button>
      </div>

      {/* Modal mail */}
      {showMail && (
        <div style={{ background:"rgba(10,21,37,0.95)", border:`1px solid ${B.accentL}40`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:700, color:B.accentL, letterSpacing:"0.8px" }}>✉ MAIL DE PEDIDOS — {activos.filter(l=>l.dias<=7).length} búsquedas activas</span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={copiarMail}
                style={{ padding:"5px 14px", borderRadius:7, cursor:"pointer",
                  background: mailCopiado ? "#2E9E6A" : B.accent,
                  border:"none", color:"#fff", fontSize:11, fontWeight:700 }}>
                {mailCopiado ? "✓ Copiado" : "Copiar"}
              </button>
              <a href={`mailto:?subject=Pedidos%20Alba%20Inversiones&body=${encodeURIComponent(generarMail())}`}
                style={{ padding:"5px 14px", borderRadius:7, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`,
                  color:"#8AAECC", fontSize:11, fontWeight:600, textDecoration:"none" }}>
                Abrir en mail
              </a>
            </div>
          </div>
          <pre style={{ margin:0, padding:"14px 16px", fontSize:12, color:"#C8D8E8", lineHeight:1.7,
            whiteSpace:"pre-wrap", fontFamily:"-apple-system, sans-serif", maxHeight:400, overflowY:"auto" }}>
            {generarMail()}
          </pre>
        </div>
      )}

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
