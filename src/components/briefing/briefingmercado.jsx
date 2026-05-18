// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingMercado
// Inteligencia de mercado: demanda vs oferta por zona
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../../data/constants.js";

const ZONAS_GRUPO = {
  "Costa Norte": ["la perla","chauvin","playa grande","constitución","constitucion"],
  "Centro":      ["centro","microcentro","mitre","plaza colon","plaza colón","güemes","guemes","san juan"],
  "Costa Sur":   ["punta mogotes","alfar","divino rostro","peralta ramos"],
  "San Carlos":  ["san carlos","bosque grande","floresta","libertad","pompeya"],
  "Oeste":       ["don bosco","san josé","san jose","las heras","camet","villa primera"],
  "Norte":       ["los pinares","santa rosa","santa monica","parque luro","parque palermo"],
};

const ZONA_COLORS = {
  "Costa Norte": "#3A8BC4",
  "Centro":      "#9B6DC8",
  "Costa Sur":   "#2E9E6A",
  "San Carlos":  "#E8A830",
  "Oeste":       "#CC2233",
  "Norte":       "#4A8ABE",
};

function getGrupo(zona) {
  if (!zona) return "Otros";
  const z = zona.toLowerCase();
  for (const [grupo, barrios] of Object.entries(ZONAS_GRUPO)) {
    if (barrios.some(b => z.includes(b))) return grupo;
  }
  return "Otros";
}

function Velocimetro({ value, max, label, sublabel, color }) {
  const pct = Math.min(1, value / Math.max(max, 1));
  const r = 34, cx = 50, cy = 54;
  const circum   = 2 * Math.PI * r;
  const trackLen = circum * 0.75;
  const valueLen = trackLen * pct;
  const rotate   = 135;
  const needleAngle = rotate + pct * 270;
  const nx = cx + (r - 8) * Math.cos((needleAngle - 90) * Math.PI / 180);
  const ny = cy + (r - 8) * Math.sin((needleAngle - 90) * Math.PI / 180);

  return (
    <div style={{ textAlign:"center", flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width="100" height="80" viewBox="0 0 100 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E3A5F" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${trackLen} ${circum}`} transform={`rotate(${rotate} ${cx} ${cy})`} />
        {pct > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${valueLen} ${circum}`} transform={`rotate(${rotate} ${cx} ${cy})`} />
        )}
        <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
          stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3.5" fill={color} />
        <text x={cx} y={cy+6} textAnchor="middle" fill={color}
          fontSize="16" fontWeight="700" fontFamily="Georgia,serif">{value}</text>
      </svg>
      <div style={{ fontSize:11, fontWeight:600, color:"#C8D8E8" }}>{label}</div>
      <div style={{ fontSize:10, color:"#4A6A90", marginTop:2 }}>{sublabel}</div>
    </div>
  );
}

export default function BriefingMercado({ leads, properties, captaciones }) {
  const activos   = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && !l.inversor);
  const calientes = activos.filter(l => l.dias <= 2).length;
  const tibios    = activos.filter(l => l.dias > 2 && l.dias <= 7).length;
  const frios     = activos.filter(l => l.dias > 7).length;

  const propsMias   = (properties||[]).filter(p => p.activa !== false).length;
  const capsActivas = (captaciones||[]).filter(c => !c.convertida).length;
  const totalOferta = propsMias + capsActivas;

  const zonas = Object.keys(ZONAS_GRUPO);
  const demanda = {}, oferta = {};
  zonas.forEach(z => { demanda[z] = 0; oferta[z] = 0; });

  activos.forEach(l => {
    const partes = (l.zona||"").split(/[,/]|\s+y\s+/).map(z => z.trim());
    const grupos = new Set(partes.map(getGrupo));
    grupos.forEach(g => { if (demanda[g] !== undefined) demanda[g]++; });
  });

  (properties||[]).filter(p => p.activa !== false).forEach(p => {
    const g = getGrupo(p.zona);
    if (oferta[g] !== undefined) oferta[g]++;
  });

  (captaciones||[]).forEach(c => {
    const g = getGrupo(c.zona);
    if (oferta[g] !== undefined) oferta[g]++;
  });

  const maxBar = Math.max(...zonas.map(z => Math.max(demanda[z], oferta[z])), 1);

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>Inteligencia de mercado</div>
        <div style={{ fontSize:11, color:"#4A6A90", marginTop:2 }}>Demanda vs oferta por zona — identifica donde captar</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20,
        background:"rgba(7,14,28,0.4)", borderRadius:10, padding:"14px 8px" }}>
        <Velocimetro value={leads.length} max={150} label="Leads totales" sublabel="en el sistema" color={B.accentL} />
        <Velocimetro value={activos.length} max={80} label="Leads activos"
          sublabel={`${calientes}🔴 ${tibios}🟡 ${frios}🔵`} color="#E8A830" />
        <Velocimetro value={totalOferta} max={50} label="Oferta total"
          sublabel={`${propsMias} propias · ${capsActivas} captadas`} color="#2E9E6A" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:6, marginBottom:4 }}>
          <div />
          <div style={{ fontSize:9, color:"#3A8BC4", fontWeight:700, letterSpacing:"0.8px", textAlign:"center" }}>DEMANDA (leads)</div>
          <div style={{ fontSize:9, color:"#2E9E6A", fontWeight:700, letterSpacing:"0.8px", textAlign:"center" }}>OFERTA (props)</div>
        </div>
        {zonas.map(zona => {
          const d = demanda[zona] || 0;
          const o = oferta[zona]  || 0;
          const color   = ZONA_COLORS[zona] || B.accentL;
          const barrios = ZONAS_GRUPO[zona]?.map(b => b.charAt(0).toUpperCase()+b.slice(1)).join(", ") || "";
          return (
            <div key={zona} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:6, alignItems:"center" }}>
              <div title={barrios} style={{ fontSize:11, color, fontWeight:600, textAlign:"right", paddingRight:8 }}>
                {zona}
              </div>
              <div style={{ position:"relative", height:22, background:"rgba(58,139,196,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(d/maxBar)*100}%`, background:"#3A8BC4",
                  borderRadius:4, transition:"width 0.4s", display:"flex", alignItems:"center",
                  justifyContent:"flex-end", paddingRight:6 }}>
                  {d > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{d}</span>}
                </div>
                {d === 0 && <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#4A6A90" }}>0</span>}
              </div>
              <div style={{ position:"relative", height:22, background:"rgba(46,158,106,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(o/maxBar)*100}%`, background:"#2E9E6A",
                  borderRadius:4, transition:"width 0.4s", display:"flex", alignItems:"center",
                  justifyContent:"flex-end", paddingRight:6 }}>
                  {o > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{o}</span>}
                </div>
                {o === 0 && <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#4A6A90" }}>0</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(42,91,173,0.08)",
        borderRadius:8, border:`1px solid ${B.border}`, fontSize:11, color:"#8AAECC", lineHeight:1.6 }}>
        Si la barra azul (demanda) supera la verde (oferta) en una zona, hay oportunidad de captacion. Prioriza captar en zonas con mas leads buscando que propiedades disponibles.
      </div>
    </div>
  );
}