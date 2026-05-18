// ══════════════════════════════════════════════════════════════
// ALBA CRM — Briefing (orquestador)
// Header, KPIs, alarmas, leads urgentes, secciones colapsables
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { B, AG, matchLeadProps } from "../../data/constants.js";
import { Collapsible } from "./BriefingGauge.jsx";
import BriefingLeadCard      from "./BriefingLeadCard.jsx";
import BriefingCalendario    from "./BriefingCalendario.jsx";
import BriefingCaptacionZonas from "./BriefingCaptacionZonas.jsx";
import BriefingMercado       from "./BriefingMercado.jsx";
import BriefingCanales       from "./BriefingCanales.jsx";
import Tareas                from "../Tareas.jsx";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

export default function Briefing({ leads, properties, rentals, captaciones, supabase }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const mobile = useIsMobile(768);

  const hoy  = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const activos  = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);

  const enNegociacion  = filtrados.filter(l => l.etapa === "Negociación").length;
  const leadsNuevosMes = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;
  const nCalientes     = filtrados.filter(l => l.dias <= 2 || l.etapa === "Negociación").length;
  const propsActivas   = (properties || []).filter(p => p.activa !== false).length;

  const urgentes = useMemo(() => {
    return filtrados.map(l => {
      let score = 0;
      if (l.etapa === "Negociación") score += 100;
      if (l.etapa === "Visita")      score += 70;
      if (l.dias === 0)              score += 50;
      if (l.dias <= 2)               score += 40;
      if (l.dias <= 5)               score += 20;
      if ((l.prob || 0) >= 60)       score += 30;
      return { ...l, _score: score };
    }).sort((a,b) => b._score - a._score).slice(0, 4);
  }, [filtrados]);

  const alarmas = useMemo(() => {
    const sinAsignar = filtrados.filter(l => !l.ag);
    const frios      = filtrados.filter(l => l.dias > 15 && l.etapa !== "Negociación");
    const sinAccion  = filtrados.filter(l => !l.proxAccion && l.dias > 3);
    const propsSinInteresados = (properties||[]).filter(p => {
      const matches = filtrados.filter(l => {
        const zona  = (l.zona||"").toLowerCase();
        const pZona = (p.zona||"").toLowerCase();
        const zonas = zona.split(/[,\/]|\s+y\s+/).map(z => z.trim());
        return zonas.some(z => pZona.includes(z) || z.includes(pZona));
      });
      return matches.length === 0;
    });
    return [
      sinAsignar.length > 0           && { texto:`${sinAsignar.length} lead${sinAsignar.length>1?"s":""} sin agente`, color:"#CC2233", urgente:true },
      sinAccion.length > 0            && { texto:`${sinAccion.length} sin próxima acción (+3d)`, color:"#E8A830", urgente:false },
      frios.length > 0                && { texto:`${frios.length} frío${frios.length>1?"s":""} (+15 días sin contacto)`, color:"#4A8ABE", urgente:false },
      propsSinInteresados.length > 0  && { texto:`${propsSinInteresados.length} propiedad${propsSinInteresados.length>1?"es":""} sin interesados`, color:"#9B6DC8", urgente:false },
    ].filter(Boolean);
  }, [filtrados, properties]);

  return (
    <div style={{ width:"100%", maxWidth:900, margin:"0 auto",
      display:"flex", flexDirection:"column", gap: mobile ? 12 : 16, paddingBottom:40 }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "flex-end",
        justifyContent:"space-between", paddingBottom:16,
        borderBottom:`1px solid ${B.border}`, gap: mobile ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: mobile ? 10 : 11, color:"#4A6A90", letterSpacing:"1.5px",
            textTransform:"uppercase", marginBottom:6, fontWeight:500 }}>
            {hoy.toLocaleDateString("es-AR", { weekday:"long" }).toUpperCase()} · {hoy.toLocaleDateString("es-AR", { day:"numeric", month:"long" })}
          </div>
          <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight:500, color:"#E8F0FA",
            margin:0, letterSpacing:"-0.3px", lineHeight:1.1 }}>
            {saludo}
          </h1>
        </div>
        <div style={{ display:"flex", gap:3, background:B.card, borderRadius:8, padding:3, border:`1px solid ${B.border}` }}>
          {["Todos","C","A","F","L","Lu"].map(a => {
            const ag     = AG[a];
            const active = filtroAg === a;
            return (
              <button key={a} onClick={() => setFiltroAg(a)}
                style={{ padding: mobile ? "4px 8px" : "5px 12px", borderRadius:6,
                  fontSize: mobile ? 10 : 11, cursor:"pointer", border:"none", fontWeight:600,
                  background: active ? (ag?.bg || B.accent) : "transparent",
                  color: active ? (ag?.c || "#fff") : "#4A6A90" }}>
                {a === "Todos" ? "Todos" : ag?.n || a}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: mobile ? 8 : 12 }}>
        {[
          { label:"En negociación", value:enNegociacion,  sub:"Cierres potenciales" },
          { label:"Calientes hoy",  value:nCalientes,     sub:"Hasta 2 días sin contacto" },
          { label:"Leads nuevos",   value:leadsNuevosMes, sub:"Este mes" },
          { label:"En cartera",     value:propsActivas,   sub:"Propiedades activas" },
          { label:"Pipeline",       value:activos.length, sub:`De ${leads.length} leads` },
        ].map(k => (
          <div key={k.label} style={{ background:B.card, border:`1px solid ${B.border}`,
            borderRadius:10, padding: mobile ? "12px 10px" : "16px 14px" }}>
            <div style={{ fontSize: mobile ? 22 : 28, fontWeight:700, color:"#E8F0FA",
              lineHeight:1, fontFamily:"Georgia, 'Times New Roman', serif" }}>{k.value}</div>
            <div style={{ fontSize: mobile ? 11 : 12, color:"#C8D8E8", fontWeight:500, marginTop:4 }}>{k.label}</div>
            <div style={{ fontSize: mobile ? 10 : 11, color:"#4A6A90", marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Alarmas ── */}
      {alarmas.length > 0 && (
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontSize:11, color:"#4A6A90", fontWeight:600, letterSpacing:"0.8px",
            textTransform:"uppercase", marginBottom:10 }}>Requieren atención</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {alarmas.map((a,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                background:a.color+"08", borderLeft:`2px solid ${a.urgente ? a.color : a.color+"60"}`, borderRadius:6 }}>
                <span style={{ fontSize:12, color:a.urgente?"#E8F0FA":"#8AAECC",
                  fontWeight:a.urgente?600:400, flex:1 }}>{a.texto}</span>
                {a.urgente && (
                  <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3,
                    background:a.color+"20", color:a.color, fontWeight:700, letterSpacing:"0.5px" }}>URGENTE</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {alarmas.length === 0 && (
        <div style={{ fontSize:12, color:"#2E9E6A", textAlign:"center", padding:"8px 0", fontWeight:500 }}>
          Todo en orden
        </div>
      )}

      {/* ── Llamar hoy ── */}
      <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:12, color:"#C8D8E8", fontWeight:600, letterSpacing:"0.8px", flex:1 }}>Llamar hoy</span>
          {urgentes.length > 0 && <span style={{ fontSize:11, color:"#4A6A90" }}>{urgentes.length} leads</span>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {urgentes.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px 0", color:"#4A6A90", fontSize:12 }}>
              Sin leads urgentes hoy
            </div>
          )}
          {urgentes.map(l => <BriefingLeadCard key={l.id} lead={l} />)}
        </div>
      </div>

      {/* ── Secciones colapsables ── */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:12 }}>
        <Collapsible title="Tareas">
          <Tareas supabase={supabase} />
        </Collapsible>
        <Collapsible title="Calendario">
          <BriefingCalendario />
        </Collapsible>
      </div>

      <Collapsible title="Captación de zonas">
        <BriefingCaptacionZonas />
      </Collapsible>

      <Collapsible title="Inteligencia de mercado">
        <BriefingMercado leads={leads} properties={properties} captaciones={captaciones} />
      </Collapsible>

      <Collapsible title="Canales de captación">
        <BriefingCanales leads={leads} />
      </Collapsible>
    </div>
  );
}