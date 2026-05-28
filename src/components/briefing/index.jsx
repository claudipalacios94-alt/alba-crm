// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home (ex Briefing)
// Pantalla de inicio operativa diaria
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { B, AG, matchLeadProps } from "../../data/constants.js";
import { Collapsible } from "./BriefingGauge.jsx";
import BriefingLeadCard       from "./BriefingLeadCard.jsx";
import BriefingCalendario     from "./BriefingCalendario.jsx";
import BriefingCaptacionZonas from "./BriefingCaptacionZonas.jsx";
import Tareas                 from "../Tareas.jsx";
import OportunidadesCaptacion from "./OportunidadesCaptacion.jsx";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

function EquilibrioBar({ leads, props, captaciones }) {
  const total = leads + props + captaciones || 1;
  const pLeads = (leads / total) * 100;
  const pProps  = (props  / total) * 100;
  const pCaps  = (captaciones / total) * 100;

  let estado, accion;
  if (leads > props * 2) {
    estado = "🔴 Muchos leads, pocas propiedades";
    accion = "Captá más propiedades";
  } else if (props > leads * 2) {
    estado = "🟡 Muchas propiedades, pocos leads";
    accion = "Generá más demanda";
  } else {
    estado = "🟢 Equilibrio operativo";
    accion = "Mantené el ritmo";
  }

  return (
    <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "#4A6A90", fontWeight: 600, letterSpacing: "0.8px",
        textTransform: "uppercase", marginBottom: 8 }}>Equilibrio operativo</div>
      <div style={{ display: "flex", gap: 3, height: 6, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: pLeads + "%", background: B.accentL, transition: "width .5s" }} />
        <div style={{ width: pProps  + "%", background: "#2E9E6A", transition: "width .5s" }} />
        <div style={{ width: pCaps  + "%", background: "#E8A830", transition: "width .5s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        {[
          { label: "Leads",       val: leads,       color: B.accentL  },
          { label: "Props",       val: props,        color: "#2E9E6A" },
          { label: "Captaciones", val: captaciones, color: "#E8A830"  },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 11, color: "#4A6A90" }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: B.text, fontWeight: 600 }}>{estado}</div>
      <div style={{ fontSize: 11, color: "#4A6A90", marginTop: 2 }}>→ {accion}</div>
    </div>
  );
}

export default function Briefing({ leads, properties, rentals, captaciones, supabase }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const mobile  = useIsMobile(768);
  const navigate = useNavigate();

  const hoy  = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const activos   = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const filtrados = filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg);

  const enNegociacion  = filtrados.filter(l => l.etapa === "Negociación").length;
  const leadsNuevosMes = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;
  const nCalientes     = filtrados.filter(l => l.dias <= 2 || l.etapa === "Negociación").length;
  const propsActivas   = (properties || []).filter(p => p.activa !== false);

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
    }).sort((a, b) => b._score - a._score).slice(0, 4);
  }, [filtrados]);

  const leadsSinMatch = useMemo(() => {
    const capsNorm = (captaciones || []).map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
      caracts: c.caracts, activa: true,
    }));
    const todasProps = [...propsActivas, ...capsNorm];
    return filtrados.filter(l => {
      if (!l.presup || !l.zona) return false;
      return matchLeadProps(l, todasProps).length === 0;
    });
  }, [filtrados, propsActivas, captaciones]);

  const propsSinMatch = useMemo(() => {
    return propsActivas.filter(p => {
      const matches = filtrados.filter(l => {
        if (!l.presup || !l.zona) return false;
        const pZona = (p.zona || "").toLowerCase();
        const zonas = (l.zona || "").toLowerCase().split(/[,/]|\s+y\s+/).map(z => z.trim());
        return zonas.some(z => pZona.includes(z) || z.includes(pZona));
      });
      return matches.length === 0;
    });
  }, [propsActivas, filtrados]);

  const sinAsignar = filtrados.filter(l => !l.ag);
  const frios      = filtrados.filter(l => l.dias > 15 && l.etapa !== "Negociación");
  const sinAccion  = filtrados.filter(l => !l.proxAccion && l.dias > 3);

  const alarmas = [
    sinAsignar.length > 0     && { texto: `${sinAsignar.length} lead${sinAsignar.length > 1 ? "s" : ""} sin agente`,             color: "#CC2233", urgente: true,  onClick: () => navigate("/crm") },
    nCalientes > 0            && { texto: `${nCalientes} caliente${nCalientes > 1 ? "s" : ""}`,                                  color: B.hot,     urgente: true,  onClick: () => navigate("/crm") },
    leadsSinMatch.length > 0  && { texto: `${leadsSinMatch.length} lead${leadsSinMatch.length > 1 ? "s" : ""} sin propiedades compatibles`, color: "#E8A830", urgente: false, onClick: () => navigate("/captaciones") },
    propsSinMatch.length > 0  && { texto: `${propsSinMatch.length} propiedad${propsSinMatch.length > 1 ? "es" : ""} sin interesados`, color: "#9B6DC8", urgente: false, onClick: () => navigate("/propiedades") },
    sinAccion.length > 0      && { texto: `${sinAccion.length} sin próxima acción (+3d)`,                                         color: "#E8A830", urgente: false, onClick: () => navigate("/crm") },
    frios.length > 0          && { texto: `${frios.length} frío${frios.length > 1 ? "s" : ""} (+15d sin contacto)`,              color: "#4A8ABE", urgente: false, onClick: () => navigate("/crm") },
  ].filter(Boolean);

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto",
      display: "flex", flexDirection: "column", gap: mobile ? 12 : 16, paddingBottom: 40 }}>

      <div style={{ display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "flex-end",
        justifyContent: "space-between", paddingBottom: 16,
        borderBottom: `1px solid ${B.border}`, gap: mobile ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: mobile ? 10 : 11, color: "#4A6A90", letterSpacing: "1.5px",
            textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>
            {hoy.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase()} · {hoy.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
          </div>
          <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight: 500, color: "#E8F0FA",
            margin: 0, letterSpacing: "-0.3px", lineHeight: 1.1 }}>
            {saludo}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 3, background: B.card, borderRadius: 8, padding: 3, border: `1px solid ${B.border}` }}>
          {["Todos", "C", "A", "F", "L", "Lu"].map(a => {
            const ag     = AG[a];
            const active = filtroAg === a;
            return (
              <button key={a} onClick={() => setFiltroAg(a)}
                style={{ padding: mobile ? "4px 8px" : "5px 12px", borderRadius: 6,
                  fontSize: mobile ? 10 : 11, cursor: "pointer", border: "none", fontWeight: 600,
                  background: active ? (ag?.bg || B.accent) : "transparent",
                  color: active ? (ag?.c || "#fff") : "#4A6A90" }}>
                {a === "Todos" ? "Todos" : ag?.n || a}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: mobile ? 8 : 12 }}>
        {[
          { label: "En negociación", value: enNegociacion,       sub: "Cierres potenciales" },
          { label: "Calientes hoy",  value: nCalientes,          sub: "Hasta 2 días sin contacto" },
          { label: "Leads nuevos",   value: leadsNuevosMes,      sub: "Este mes" },
          { label: "En cartera",     value: propsActivas.length, sub: "Propiedades activas" },
          { label: "Pipeline",       value: activos.length,      sub: `De ${leads.length} leads` },
        ].map(k => (
          <div key={k.label} style={{ background: B.card, border: `1px solid ${B.border}`,
            borderRadius: 10, padding: mobile ? "12px 10px" : "16px 14px" }}>
            <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 700, color: "#E8F0FA",
              lineHeight: 1, fontFamily: "Georgia, serif" }}>{k.value}</div>
            <div style={{ fontSize: mobile ? 11 : 12, color: "#C8D8E8", fontWeight: 500, marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: mobile ? 10 : 11, color: "#4A6A90", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <EquilibrioBar
        leads={activos.length}
        props={propsActivas.length}
        captaciones={(captaciones || []).length}
      />

      <OportunidadesCaptacion
        leads={activos}
        properties={propsActivas}
        captaciones={captaciones || []}
      />
      


      {alarmas.length > 0 ? (
        <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "#4A6A90", fontWeight: 600, letterSpacing: "0.8px",
            textTransform: "uppercase", marginBottom: 10 }}>Requieren atención</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alarmas.map((a, i) => (
              <div key={i} onClick={a.onClick}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  background: a.color + "08", borderLeft: `2px solid ${a.urgente ? a.color : a.color + "60"}`,
                  borderRadius: 6, cursor: "pointer" }}>
                <span style={{ fontSize: 12, color: a.urgente ? "#E8F0FA" : "#8AAECC",
                  fontWeight: a.urgente ? 600 : 400, flex: 1 }}>{a.texto}</span>
                {a.urgente && (
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3,
                    background: a.color + "20", color: a.color, fontWeight: 700 }}>URGENTE</span>
                )}
                <span style={{ fontSize: 11, color: a.color }}>→</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#2E9E6A", textAlign: "center", padding: "8px 0", fontWeight: 500 }}>
          ✅ Todo en orden
        </div>
      )}

      <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#C8D8E8", fontWeight: 600, letterSpacing: "0.8px", flex: 1 }}>Llamar hoy</span>
          {urgentes.length > 0 && <span style={{ fontSize: 11, color: "#4A6A90" }}>{urgentes.length} leads</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {urgentes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#4A6A90", fontSize: 12 }}>
              Sin leads urgentes hoy
            </div>
          ) : (
            urgentes.map(l => <BriefingLeadCard key={l.id} lead={l} />)
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Collapsible title="Tareas" defaultOpen>
          <Tareas supabase={supabase} />
        </Collapsible>
        <Collapsible title="Calendario">
          <BriefingCalendario />
        </Collapsible>
      </div>

      <Collapsible title="Captación de zonas">
        <BriefingCaptacionZonas />
      </Collapsible>

    </div>
  );
}
