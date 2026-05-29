// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home (Briefing rediseñado)
// Jerarquía comercial real: dinero → acción → riesgo → oportunidad
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { B, AG, matchLeadProps, getPriorityScore } from "../../data/constants.js";
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

function KPICard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: B.card, border: `1px solid ${color}30`,
        borderTop: `3px solid ${color}`, borderRadius: 10,
        padding: "14px 16px", cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color + "60")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = color + "30")}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1,
        fontFamily: "Georgia,serif", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#C8D8E8", fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#4A6A90", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Seccion({ titulo, children, accion, onAccion }) {
  return (
    <div style={{ background: B.card, border: `1px solid ${B.border}`,
      borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#4A6A90",
          letterSpacing: "0.8px", textTransform: "uppercase" }}>{titulo}</span>
        {accion && (
          <button onClick={onAccion}
            style={{ fontSize: 10, color: B.accentL, background: "transparent",
              border: `1px solid ${B.border}`, borderRadius: 5, padding: "2px 8px",
              cursor: "pointer" }}>
            {accion}
          </button>
        )}
      </div>
      <div style={{ padding: "12px 16px 14px" }}>{children}</div>
    </div>
  );
}

function RiesgoItem({ lead, onVerLead }) {
  const diasColor = lead.dias >= 7 ? "#FF4D4D" : lead.dias >= 3 ? "#FF8C42" : "#F5C842";
  const ag = AG[lead.ag];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 8, marginBottom: 6,
      background: "rgba(255,77,77,0.05)", border: "1px solid rgba(255,77,77,0.12)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E8F0FA",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.nombre}
          </span>
          {ag && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3,
              background: ag.c + "20", color: ag.c, fontWeight: 700, flexShrink: 0 }}>
              {ag.n}
            </span>
          )}
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 700, flexShrink: 0,
            background: lead.etapa === "Negociación" ? "#2E9E6A20" : "#4A8ABE20",
            color: lead.etapa === "Negociación" ? "#2E9E6A" : "#4A8ABE" }}>
            {lead.etapa}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#6A8AAE",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.zona}
          {lead.presup && (
            <span style={{ color: "#C8D8E8", fontWeight: 700, fontFamily: "Georgia,serif" }}>
              {" · USD "}{Math.round(Number(lead.presup) / 1000)}k
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: diasColor, flexShrink: 0,
        background: diasColor + "18", padding: "2px 8px", borderRadius: 4 }}>
        +{lead.dias}d
      </span>
      {lead.tel && (
        <a href={"https://wa.me/" + lead.tel.replace(/\D/g, "")}
          target="_blank" rel="noreferrer"
          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
            color: "#25D366", background: "rgba(37,211,102,0.10)",
            border: "1px solid rgba(37,211,102,0.25)", textDecoration: "none", flexShrink: 0 }}>
          WA
        </a>
      )}
      {onVerLead && (
        <button onClick={() => onVerLead(lead.id)}
          style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer",
            background: "transparent", border: `1px solid ${B.border}`,
            color: "#4A6A90", flexShrink: 0 }}>
          Ver →
        </button>
      )}
    </div>
  );
}

export default function Briefing({ leads, properties, rentals, captaciones, supabase }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const mobile   = useIsMobile(768);
  const navigate = useNavigate();

  const hoy    = new Date();
  const hora   = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  const activos   = useMemo(() => leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"), [leads]);
  const filtrados = useMemo(() => filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg), [activos, filtroAg]);
  const propsActivas = useMemo(() => (properties || []).filter(p => p.activa !== false), [properties]);

  // leadMatchesMap — cálculo único para todos los widgets
  const todasProps = useMemo(() => {
    const caps = (captaciones || []).map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona,
      precio: c.precio, caracts: c.caracts, activa: true,
    }));
    return [...propsActivas, ...caps];
  }, [propsActivas, captaciones]);

  const leadMatchesMap = useMemo(() => {
    const map = {};
    filtrados.forEach(l => { map[l.id] = matchLeadProps(l, todasProps); });
    return map;
  }, [filtrados, todasProps]);

  // KPIs
  const enNegociacion = filtrados.filter(l => l.etapa === "Negociación").length;
  const enVisita      = filtrados.filter(l => l.etapa === "Visita").length;
  const calientes     = filtrados.filter(l => l.dias !== null && l.dias <= 2 && l.etapa !== "Negociación").length;
  const sinMatch      = filtrados.filter(l => l.presup && l.zona && (leadMatchesMap[l.id] || []).length === 0).length;

  // Zona B — top 5 por getPriorityScore
  const accionInmediata = useMemo(() => {
    return [...filtrados]
      .map(l => ({ ...l, _p: getPriorityScore(l, (leadMatchesMap[l.id] || []).length) }))
      .sort((a, b) => b._p - a._p)
      .slice(0, 5);
  }, [filtrados, leadMatchesMap]);

  // Zona C — en riesgo
  const enRiesgo = useMemo(() => {
    return filtrados
      .filter(l => (l.etapa === "Negociación" || l.etapa === "Visita") && l.dias !== null && l.dias > 2)
      .sort((a, b) => b.dias - a.dias);
  }, [filtrados]);

  // Alarmas por severidad
  const sinAsignar    = filtrados.filter(l => !l.ag);
  const sinAccion     = filtrados.filter(l => !l.proxAccion && l.dias !== null && l.dias > 3);
  const frios         = filtrados.filter(l => l.dias !== null && l.dias > 15 && l.etapa !== "Negociación");
  const propsSinMatch = propsActivas.filter(p =>
    filtrados.every(l => {
      if (!l.presup || !l.zona) return true;
      const pZona = (p.zona || "").toLowerCase();
      const zonas = (l.zona || "").toLowerCase().split(/[,/]|\s+y\s+/).map(z => z.trim());
      return !zonas.some(z => pZona.includes(z) || z.includes(pZona));
    })
  );

  const alarmas = [
    ...sinAsignar.map(l => ({ texto: l.nombre + " sin agente asignado", color: "#CC2233", nivel: 0, onClick: () => navigate("/crm") })),
    sinMatch > 0            && { texto: sinMatch + " lead" + (sinMatch > 1 ? "s" : "") + " sin propiedades compatibles", color: "#E8A830", nivel: 1, onClick: () => navigate("/captaciones") },
    propsSinMatch.length > 0 && { texto: propsSinMatch.length + " propiedad" + (propsSinMatch.length > 1 ? "es" : "") + " sin interesados", color: "#9B6DC8", nivel: 1, onClick: () => navigate("/propiedades") },
    sinAccion.length > 0    && { texto: sinAccion.length + " sin próxima acción (+3d)", color: "#E8A830", nivel: 2, onClick: () => navigate("/crm") },
    frios.length > 0        && { texto: frios.length + " frío" + (frios.length > 1 ? "s" : "") + " (+15d sin contacto)", color: "#4A8ABE", nivel: 2, onClick: () => navigate("/crm") },
  ].filter(Boolean).sort((a, b) => a.nivel - b.nivel);

  const nivelLabel = { 0: "URGENTE", 1: "MEDIO", 2: null };
  const nivelBg    = { 0: "rgba(204,34,51,0.08)", 1: "rgba(232,168,48,0.06)", 2: "rgba(74,138,190,0.05)" };

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto",
      display: "flex", flexDirection: "column", gap: mobile ? 12 : 16, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "flex-end",
        justifyContent: "space-between",
        paddingBottom: 16, borderBottom: `1px solid ${B.border}`, gap: mobile ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: mobile ? 10 : 11, color: "#4A6A90", letterSpacing: "1.5px",
            textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>
            {hoy.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase()} · {hoy.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
          </div>
          <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight: 500, color: "#E8F0FA",
            margin: 0, letterSpacing: "-0.3px", lineHeight: 1.1 }}>{saludo}</h1>
        </div>
        <div style={{ display: "flex", gap: 3, background: B.card, borderRadius: 8,
          padding: 3, border: `1px solid ${B.border}` }}>
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

      {/* Zona A — KPIs */}
      <div style={{ display: "grid",
        gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: mobile ? 8 : 12 }}>
        <KPICard label="En negociación" value={enNegociacion} sub="Cierres potenciales"    color={B.ok}      onClick={() => navigate("/crm")} />
        <KPICard label="En visita"      value={enVisita}      sub="Mostrando propiedades"   color={B.accentL} onClick={() => navigate("/crm")} />
        <KPICard label="Calientes"      value={calientes}     sub="≤2 días sin contacto"    color={B.hot}     onClick={() => navigate("/crm")} />
        <KPICard label="Sin match"      value={sinMatch}      sub="Leads sin propiedades"   color={B.warm}    onClick={() => navigate("/captaciones")} />
      </div>

      {/* Zona B — Acción inmediata */}
      <Seccion titulo="Acción inmediata" accion="Ver todos →" onAccion={() => navigate("/crm")}>
        {accionInmediata.length === 0
          ? <div style={{ textAlign: "center", padding: "16px 0", color: "#4A6A90", fontSize: 12 }}>Sin leads urgentes</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {accionInmediata.map(l => <BriefingLeadCard key={l.id} lead={l} />)}
            </div>
        }
      </Seccion>

      {/* Zona C — Operaciones en riesgo */}
      {enRiesgo.length > 0 && (
        <Seccion titulo="Operaciones en riesgo" accion="Ir al CRM →" onAccion={() => navigate("/crm")}>
          <div style={{ fontSize: 11, color: "#4A6A90", marginBottom: 10 }}>
            Negociaciones o visitas con más de 2 días sin contacto
          </div>
          {enRiesgo.map(l => <RiesgoItem key={l.id} lead={l} onVerLead={() => navigate("/crm")} />)}
        </Seccion>
      )}

      {/* Zona D — Oportunidades de captación */}
      <Seccion titulo="Oportunidades de captación">
        <OportunidadesCaptacion
          leads={activos}
          properties={propsActivas}
          captaciones={captaciones || []}
        />
      </Seccion>

      {/* Requieren atención */}
      {alarmas.length > 0 && (
        <Seccion titulo="Requieren atención">
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {alarmas.map((a, i) => (
              <div key={i} onClick={a.onClick}
                style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                  background: nivelBg[a.nivel],
                  borderLeft: `2px solid ${a.nivel === 0 ? a.color : a.color + "60"}` }}>
                <span style={{ fontSize: 12, flex: 1,
                  color: a.nivel === 0 ? "#E8F0FA" : "#8AAECC",
                  fontWeight: a.nivel === 0 ? 600 : 400 }}>{a.texto}</span>
                {nivelLabel[a.nivel] && (
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, flexShrink: 0,
                    background: a.color + "20", color: a.color }}>{nivelLabel[a.nivel]}</span>
                )}
                <span style={{ fontSize: 11, color: a.color }}>→</span>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {/* Tareas + Calendario */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Collapsible title="Tareas" defaultOpen>
          <Tareas supabase={supabase} />
        </Collapsible>
        <Collapsible title="Calendario" defaultOpen>
          <BriefingCalendario />
        </Collapsible>
      </div>

      {/* Captación de zonas */}
      <Collapsible title="Captación de zonas">
        <BriefingCaptacionZonas />
      </Collapsible>

    </div>
  );
}
