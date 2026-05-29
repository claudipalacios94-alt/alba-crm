// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home / Dashboard ejecutivo
// Panel de dirección del negocio. Datos reales, sin inventar.
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { B, AG, matchLeadProps, getPriorityScore, scoreLead } from "../../data/constants.js";
import { Collapsible } from "./BriefingGauge.jsx";
import BriefingCalendario     from "./BriefingCalendario.jsx";
import BriefingCaptacionZonas from "./BriefingCaptacionZonas.jsx";
import Tareas                 from "../Tareas.jsx";
import OportunidadesCaptacion from "./OportunidadesCaptacion.jsx";
import { normZona }           from "../../domain/matching.js";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

// ── KPI ejecutivo ─────────────────────────────────────────────
function KPICard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: B.card, border: `1px solid ${color}25`,
      borderTop: `3px solid ${color}`, borderRadius: 10,
      padding: "16px", cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s",
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = `0 0 0 1px ${color}40`)}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1,
        fontFamily: "Georgia,serif", marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#C8D8E8", fontWeight: 600, marginBottom: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#4A6A90" }}>{sub}</div>}
    </div>
  );
}

// ── Sección wrapper ───────────────────────────────────────────
function Sec({ titulo, children, accion, onAccion, borderColor }) {
  return (
    <div style={{ background: B.card, border: `1px solid ${borderColor || B.border}`,
      borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "11px 16px 9px", borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#4A6A90",
          letterSpacing: "0.9px", textTransform: "uppercase" }}>{titulo}</span>
        {accion && (
          <button onClick={onAccion} style={{ fontSize: 10, color: B.accentL,
            background: "transparent", border: `1px solid ${B.border}`,
            borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
            {accion}
          </button>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Equilibrio por zonas ──────────────────────────────────────
function EquilibrioZonas({ leads, properties, captaciones }) {
  const todasProps = useMemo(() => {
    const caps = (captaciones || []).map(c => ({
      id: "cap-" + c.id, zona: c.zona, activa: true,
    }));
    return [...(properties || []).filter(p => p.activa !== false), ...caps];
  }, [properties, captaciones]);

  const zonas = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (!l.zona) return;
      l.zona.split(/[,/]/).map(z => normZona(z.trim())).filter(Boolean).forEach(z => {
        if (!map[z]) map[z] = { demanda: 0, oferta: 0 };
        map[z].demanda++;
      });
    });
    todasProps.forEach(p => {
      const z = normZona(p.zona || "");
      if (!z) return;
      if (!map[z]) map[z] = { demanda: 0, oferta: 0 };
      map[z].oferta++;
    });
    return Object.entries(map)
      .filter(([, v]) => v.demanda >= 2)
      .sort((a, b) => (b[1].demanda - b[1].oferta) - (a[1].demanda - a[1].oferta))
      .slice(0, 4)
      .map(([zona, v]) => {
        const ratio = v.oferta === 0 ? 100 : Math.round((v.demanda / (v.demanda + v.oferta)) * 100);
        const estado = ratio >= 75 ? { label: "Crítico", color: "#FF4D4D" }
          : ratio >= 55 ? { label: "Alta demanda", color: "#FF8C42" }
          : { label: "Equilibrado", color: "#4ADE80" };
        return { zona, ...v, ratio, estado };
      });
  }, [leads, todasProps]);

  const totalDemanda = leads.length;
  const totalOferta  = todasProps.length;
  const ratioGlobal  = totalOferta === 0 ? 100
    : Math.round((totalDemanda / (totalDemanda + totalOferta)) * 100);

  return (
    <div>
      {/* Ratio global */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, color: ratioGlobal >= 65 ? "#FF8C42" : "#4ADE80",
            fontFamily: "Georgia,serif", lineHeight: 1 }}>{ratioGlobal}%</div>
          <div style={{ fontSize: 11, color: "#4A6A90", marginTop: 2 }}>demanda vs oferta</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, background: B.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: ratioGlobal + "%",
              background: ratioGlobal >= 75 ? "#FF4D4D" : ratioGlobal >= 55 ? "#FF8C42" : "#4ADE80",
              borderRadius: 4, transition: "width 0.5s" }} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 11, color: B.accentL }}>
              <strong>{totalDemanda}</strong> leads
            </span>
            <span style={{ fontSize: 11, color: "#2E9E6A" }}>
              <strong>{totalOferta}</strong> propiedades
            </span>
          </div>
        </div>
      </div>

      {/* Por zona */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {zonas.map(z => (
          <div key={z.zona} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "6px 10px", borderRadius: 7,
            background: z.estado.color + "0A",
            border: `1px solid ${z.estado.color}20` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: z.estado.color,
              background: z.estado.color + "18", padding: "1px 6px", borderRadius: 10,
              flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {z.estado.label}
            </span>
            <span style={{ fontSize: 12, color: "#C8D8E8", fontWeight: 600, flex: 1,
              textTransform: "capitalize" }}>{z.zona}</span>
            <span style={{ fontSize: 11, color: "#6A8AAE", flexShrink: 0 }}>
              {z.demanda}d / {z.oferta}o
            </span>
          </div>
        ))}
        {zonas.length === 0 && (
          <div style={{ fontSize: 12, color: "#4A6A90", textAlign: "center", padding: "8px 0" }}>
            Sin datos suficientes por zona
          </div>
        )}
      </div>
    </div>
  );
}

// ── Acción del día — 1 sola ───────────────────────────────────
function AccionDelDia({ lead, matchCount, onNavigate }) {
  if (!lead) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#4A6A90", fontSize: 12 }}>
      Sin acción prioritaria hoy
    </div>
  );

  const diasColor = lead.dias >= 7 ? "#FF4D4D" : lead.dias >= 3 ? "#FF8C42" : "#4ADE80";
  const waLink = lead.tel ? "https://wa.me/" + lead.tel.replace(/\D/g, "") : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8F0FA", marginBottom: 3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.nombre}
          </div>
          <div style={{ fontSize: 11, color: "#6A8AAE", marginBottom: 6,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.zona}
            {lead.presup && <span style={{ color: "#C8D8E8", fontWeight: 700,
              fontFamily: "Georgia,serif" }}> · USD {Math.round(Number(lead.presup)/1000)}k</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {lead.dias !== null && lead.dias !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 700, color: diasColor,
                background: diasColor + "18", padding: "2px 7px", borderRadius: 10 }}>
                {lead.dias === 0 ? "Contactado hoy" : `+${lead.dias}d sin contacto`}
              </span>
            )}
            {matchCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#4ADE80",
                background: "rgba(74,222,128,0.10)", padding: "2px 7px", borderRadius: 10 }}>
                {matchCount} {matchCount === 1 ? "match" : "matches"}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#4A8AE8",
          fontFamily: "Georgia,serif", flexShrink: 0 }}>
          {getPriorityScore(lead, matchCount)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            style={{ flex: 1, padding: "8px 0", borderRadius: 7, textAlign: "center",
              fontSize: 12, fontWeight: 700, color: "#25D366",
              background: "rgba(37,211,102,0.10)", border: "1px solid rgba(37,211,102,0.25)",
              textDecoration: "none" }}>
            WA
          </a>
        )}
        <button onClick={onNavigate}
          style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 12, fontWeight: 600,
            cursor: "pointer", background: "transparent",
            border: `1px solid ${B.border}`, color: B.accentL }}>
          Ver lead →
        </button>
      </div>

      <button onClick={onNavigate}
        style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 6,
          fontSize: 10, color: "#4A6A90", background: "transparent",
          border: "none", cursor: "pointer", textAlign: "center" }}>
        Ver todas las acciones →
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Briefing({ leads, properties, rentals, captaciones, supabase }) {
  const [filtroAg, setFiltroAg] = useState("Todos");
  const mobile   = useIsMobile(768);
  const navigate = useNavigate();

  const hoy     = new Date();
  const hora    = hoy.getHours();
  const saludo  = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - 7);

  const activos   = useMemo(() => leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"), [leads]);
  const filtrados = useMemo(() => filtroAg === "Todos" ? activos : activos.filter(l => l.ag === filtroAg), [activos, filtroAg]);
  const propsActivas = useMemo(() => (properties || []).filter(p => p.activa !== false), [properties]);

  // leadMatchesMap — cálculo único
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

  // KPIs ejecutivos
  const leadsNuevosMes   = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioMes).length;
  const leadsNuevosSemana = leads.filter(l => l.created_at && new Date(l.created_at) >= inicioSemana).length;
  const captacionesMes   = (captaciones || []).filter(c => c.created_at && new Date(c.created_at) >= inicioMes).length;
  const captacionesSemana = (captaciones || []).filter(c => c.created_at && new Date(c.created_at) >= inicioSemana).length;
  const enNegociacion    = filtrados.filter(l => l.etapa === "Negociación").length;
  const enVisita         = filtrados.filter(l => l.etapa === "Visita").length;

  // Acción del día — top 1
  const accionTop = useMemo(() => {
    return [...filtrados]
      .map(l => ({ ...l, _p: getPriorityScore(l, (leadMatchesMap[l.id] || []).length) }))
      .sort((a, b) => b._p - a._p)[0] || null;
  }, [filtrados, leadMatchesMap]);

  // Alertas por conteo
  const sinAsignar   = filtrados.filter(l => !l.ag).length;
  const sinMatch     = filtrados.filter(l => l.presup && l.zona && (leadMatchesMap[l.id] || []).length === 0).length;
  const negParadas   = filtrados.filter(l => (l.etapa === "Negociación" || l.etapa === "Visita") && l.dias !== null && l.dias > 2).length;
  const frios        = filtrados.filter(l => l.dias !== null && l.dias > 15).length;

  const alertas = [
    sinAsignar > 0  && { texto: `${sinAsignar} lead${sinAsignar > 1 ? "s" : ""} sin agente`,         color: "#CC2233", onClick: () => navigate("/crm") },
    negParadas > 0  && { texto: `${negParadas} negociación${negParadas > 1 ? "es" : ""} parada${negParadas > 1 ? "s" : ""}`, color: "#FF8C42", onClick: () => navigate("/crm") },
    sinMatch > 0    && { texto: `${sinMatch} sin propiedades compatibles`,                             color: "#E8A830", onClick: () => navigate("/captaciones") },
    frios > 0       && { texto: `${frios} frío${frios > 1 ? "s" : ""} +15d`,                          color: "#4A8ABE", onClick: () => navigate("/crm") },
  ].filter(Boolean);

  return (
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto",
      display: "flex", flexDirection: "column", gap: mobile ? 12 : 18, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "flex-end",
        justifyContent: "space-between",
        paddingBottom: 16, borderBottom: `1px solid ${B.border}`, gap: mobile ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: 10, color: "#4A6A90", letterSpacing: "1.5px",
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

      {/* Fila 1 — KPIs ejecutivos */}
      <div style={{ display: "grid",
        gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: mobile ? 8 : 12 }}>
        <KPICard
          label="Leads nuevos" value={leadsNuevosMes}
          sub={leadsNuevosSemana > 0 ? `+${leadsNuevosSemana} esta semana` : "Este mes"}
          color={B.accentL} onClick={() => navigate("/crm")} />
        <KPICard
          label="Captaciones" value={captacionesMes}
          sub={captacionesSemana > 0 ? `+${captacionesSemana} esta semana` : "Este mes"}
          color="#E8A830" onClick={() => navigate("/captaciones")} />
        <KPICard
          label="Propiedades activas" value={propsActivas.length}
          sub="En cartera"
          color="#2E9E6A" onClick={() => navigate("/propiedades")} />
        <KPICard
          label="En negociación" value={enNegociacion}
          sub={enVisita > 0 ? `+${enVisita} en visita` : "Cierres potenciales"}
          color={B.hot} onClick={() => navigate("/crm")} />
      </div>

      {/* Fila 2 — grid 2 columnas */}
      <div style={{ display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1.4fr 0.9fr",
        gap: mobile ? 12 : 16, alignItems: "start" }}>

        {/* Columna izquierda */}
        <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 16 }}>

          <Sec titulo="Equilibrio operativo">
            <EquilibrioZonas
              leads={filtrados}
              properties={propsActivas}
              captaciones={captaciones || []}
            />
          </Sec>

          <Sec titulo="Oportunidades de captación">
            <OportunidadesCaptacion
              leads={activos}
              properties={propsActivas}
              captaciones={captaciones || []}
            />
          </Sec>

        </div>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 16 }}>

          <Sec titulo="Acción del día" accion="Ver todas →" onAccion={() => navigate("/crm")}
            borderColor={accionTop ? B.accentL + "40" : B.border}>
            <AccionDelDia
              lead={accionTop}
              matchCount={(leadMatchesMap[accionTop?.id] || []).length}
              onNavigate={() => navigate("/crm")}
            />
          </Sec>

          {alertas.length > 0 && (
            <Sec titulo="Alertas">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {alertas.map((a, i) => (
                  <div key={i} onClick={a.onClick}
                    style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 7, cursor: "pointer",
                      background: a.color + "0A", borderLeft: `2px solid ${a.color}60` }}>
                    <span style={{ flex: 1, fontSize: 12, color: "#8AAECC" }}>{a.texto}</span>
                    <span style={{ fontSize: 11, color: a.color }}>→</span>
                  </div>
                ))}
              </div>
            </Sec>
          )}

          <Collapsible title="Tareas" defaultOpen>
            <Tareas supabase={supabase} />
          </Collapsible>

          <Collapsible title="Calendario" defaultOpen>
            <BriefingCalendario />
          </Collapsible>

        </div>
      </div>

      {/* Captación de zonas */}
      <Collapsible title="Captación de zonas">
        <BriefingCaptacionZonas />
      </Collapsible>

    </div>
  );
}
