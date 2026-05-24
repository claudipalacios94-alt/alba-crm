// ══════════════════════════════════════════════════════════════
// ALBA CRM — DASHBOARD
// Pantalla de situación operativa
// ══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { B, AG, scoreLead, matchLeadProps } from "../data/constants.js";

function useIsMobile(bp = 768) {
  const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w < bp;
}

// ── Tarjeta de métrica ────────────────────────────────────────
function MetricCard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: B.card, border: `1px solid ${color}30`, borderRadius: 12,
        padding: "16px 18px", cursor: onClick ? "pointer" : "default",
        borderLeft: `3px solid ${color}`, transition: "border-color .15s",
        display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: B.muted, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "Georgia,serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: B.dim }}>{sub}</div>}
    </div>
  );
}

// ── Barra de equilibrio ───────────────────────────────────────
function EquilibrioBar({ leads, props, captaciones }) {
  const total = leads + props + captaciones || 1;
  const pLeads = (leads / total) * 100;
  const pProps  = (props  / total) * 100;
  const pCaps  = (captaciones / total) * 100;

  let estado = null;
  let accion = null;

  if (leads > props * 2) {
    estado = "🔴 Muchos leads, pocas propiedades";
    accion = "Captá más propiedades";
  } else if (props > leads * 2) {
    estado = "🟡 Muchas propiedades, pocos leads";
    accion = "Hacé publicidad para generar demanda";
  } else {
    estado = "🟢 Equilibrio operativo";
    accion = "Mantené el ritmo de captación y seguimiento";
  }

  return (
    <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: B.muted, fontWeight: 600, letterSpacing: "0.8px", marginBottom: 10, textTransform: "uppercase" }}>
        Equilibrio operativo
      </div>
      <div style={{ display: "flex", gap: 3, height: 8, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: pLeads + "%", background: B.accentL, transition: "width .5s" }} />
        <div style={{ width: pProps  + "%", background: "#2E9E6A", transition: "width .5s" }} />
        <div style={{ width: pCaps  + "%", background: "#E8A830", transition: "width .5s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        {[
          { label: "Leads", val: leads, color: B.accentL },
          { label: "Props", val: props,  color: "#2E9E6A" },
          { label: "Captaciones", val: captaciones, color: "#E8A830" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 11, color: B.muted }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: B.text, fontWeight: 600 }}>{estado}</div>
      <div style={{ fontSize: 11, color: B.dim, marginTop: 2 }}>→ {accion}</div>
    </div>
  );
}

// ── Alerta row ────────────────────────────────────────────────
function AlertaRow({ icon, texto, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
        borderRadius: 8, cursor: "pointer", background: "rgba(10,21,37,0.5)",
        border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`,
        transition: "background .15s" }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: B.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texto}</div>
        {sub && <div style={{ fontSize: 11, color: B.dim }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 11, color: color, flexShrink: 0 }}>→</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Dashboard({ leads = [], properties = [], captaciones = [], rentals = [] }) {
  const navigate = useNavigate();
  const mobile = useIsMobile();

  const now = new Date();

  // Métricas base
  const leadsActivos = useMemo(() =>
    leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"), [leads]);

  const calientes = useMemo(() =>
    leadsActivos.filter(l => scoreLead(l).label.includes("Caliente")), [leadsActivos]);

  const frios = useMemo(() =>
    leadsActivos.filter(l => l.dias > 14), [leadsActivos]);

  const propsActivas = properties.filter(p => p.activa !== false);

  // Propiedades sin leads interesados
  const propsSinMatch = useMemo(() => {
    const allLeads = leadsActivos.filter(l => l.presup && l.zona);
    return propsActivas.filter(p => {
      const matches = matchLeadProps({ zona: p.zona, tipo: p.tipo, presup: p.precio * 1.1, op: "compra" }, allLeads);
      return matches.length === 0;
    });
  }, [propsActivas, leadsActivos]);

  // Leads sin match de propiedades
  const leadsSinMatch = useMemo(() => {
    const capsNorm = captaciones.map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
      caracts: c.caracts, activa: true,
    }));
    const todasProps = [...propsActivas, ...capsNorm];
    return leadsActivos.filter(l => {
      if (!l.presup || !l.zona) return false;
      return matchLeadProps(l, todasProps).length === 0;
    });
  }, [leadsActivos, propsActivas, captaciones]);

  // Leads sin contacto reciente (>7 días) con presupuesto alto
  const leadsPrioritarios = useMemo(() =>
    leadsActivos
      .filter(l => l.dias > 7 && l.presup > 80000)
      .sort((a, b) => b.presup - a.presup)
      .slice(0, 5),
    [leadsActivos]);

  // Hora del día
  const hora = now.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  const col2 = mobile ? "1fr" : "1fr 1fr";
  const col3 = mobile ? "1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ maxWidth: 900, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: mobile ? 20 : 22, fontWeight: 700, color: B.text,
          margin: "0 0 4px", fontFamily: "Georgia,serif" }}>
          {saludo} 👋
        </h1>
        <p style={{ fontSize: 12, color: B.muted, margin: 0 }}>
          {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: col3, gap: 10, marginBottom: 16 }}>
        <MetricCard
          label="Leads activos"
          value={leadsActivos.length}
          sub={`${calientes.length} calientes · ${frios.length} fríos`}
          color={B.accentL}
          onClick={() => navigate("/crm")}
        />
        <MetricCard
          label="Propiedades"
          value={propsActivas.length}
          sub={`${propsSinMatch.length} sin leads interesados`}
          color="#2E9E6A"
          onClick={() => navigate("/propiedades")}
        />
        <MetricCard
          label="Captaciones"
          value={captaciones.length}
          sub={`${rentals.length} alquileres en gestión`}
          color="#E8A830"
          onClick={() => navigate("/captaciones")}
        />
      </div>

      {/* Equilibrio */}
      <div style={{ marginBottom: 16 }}>
        <EquilibrioBar
          leads={leadsActivos.length}
          props={propsActivas.length}
          captaciones={captaciones.length}
        />
      </div>

      {/* Alertas + Prioritarios */}
      <div style={{ display: "grid", gridTemplateColumns: col2, gap: 16 }}>

        {/* Alertas operativas */}
        <div>
          <div style={{ fontSize: 11, color: B.muted, fontWeight: 700, letterSpacing: "1px",
            textTransform: "uppercase", marginBottom: 8 }}>
            ⚡ Alertas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {calientes.length > 0 && (
              <AlertaRow
                icon="🔥"
                texto={`${calientes.length} lead${calientes.length > 1 ? "s" : ""} caliente${calientes.length > 1 ? "s" : ""}`}
                sub="Contactar hoy"
                color={B.hot}
                onClick={() => navigate("/crm")}
              />
            )}
            {leadsSinMatch.length > 0 && (
              <AlertaRow
                icon="🔍"
                texto={`${leadsSinMatch.length} lead${leadsSinMatch.length > 1 ? "s" : ""} sin propiedades compatibles`}
                sub="Captá en sus zonas"
                color={B.warm}
                onClick={() => navigate("/captaciones")}
              />
            )}
            {propsSinMatch.length > 0 && (
              <AlertaRow
                icon="🏠"
                texto={`${propsSinMatch.length} propiedad${propsSinMatch.length > 1 ? "es" : ""} sin leads interesados`}
                sub="Considerá retasar o publicitar"
                color="#9B6DC8"
                onClick={() => navigate("/propiedades")}
              />
            )}
            {frios.length > 0 && (
              <AlertaRow
                icon="🧊"
                texto={`${frios.length} lead${frios.length > 1 ? "s" : ""} sin contacto hace +14 días`}
                sub="Revisar o archivar"
                color={B.dim}
                onClick={() => navigate("/crm")}
              />
            )}
            {calientes.length === 0 && leadsSinMatch.length === 0 && propsSinMatch.length === 0 && frios.length === 0 && (
              <div style={{ fontSize: 12, color: B.dim, padding: "12px", textAlign: "center",
                background: B.card, borderRadius: 8, border: `1px solid ${B.border}` }}>
                ✅ Sin alertas activas
              </div>
            )}
          </div>
        </div>

        {/* Leads prioritarios */}
        <div>
          <div style={{ fontSize: 11, color: B.muted, fontWeight: 700, letterSpacing: "1px",
            textTransform: "uppercase", marginBottom: 8 }}>
            💼 Leads a retomar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {leadsPrioritarios.length === 0 && (
              <div style={{ fontSize: 12, color: B.dim, padding: "12px", textAlign: "center",
                background: B.card, borderRadius: 8, border: `1px solid ${B.border}` }}>
                Sin leads prioritarios sin contactar
              </div>
            )}
            {leadsPrioritarios.map(lead => (
              <div key={lead.id} onClick={() => navigate("/crm")}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  borderRadius: 8, cursor: "pointer", background: B.card,
                  border: `1px solid ${B.border}`, borderLeft: `3px solid ${B.warm}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: B.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: B.dim }}>
                    {lead.zona} · USD {Number(lead.presup).toLocaleString()} · {lead.dias}d sin contacto
                  </div>
                </div>
                <div style={{ fontSize: 11, color: lead.dias > 14 ? B.hot : B.warm,
                  fontWeight: 700, flexShrink: 0 }}>
                  {lead.dias}d
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: B.muted, fontWeight: 700, letterSpacing: "1px",
          textTransform: "uppercase", marginBottom: 8 }}>
          Accesos rápidos
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "📋 Briefing IA", path: "/briefing" },
            { label: "🗂 Kanban", path: "/kanban" },
            { label: "🗺 Mapa", path: "/mapa" },
            { label: "🎨 Flyer", path: "/flyer" },
            { label: "📍 Zonas", path: "/zonas" },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{ padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                background: "transparent", border: `1px solid ${B.border}`, color: B.muted,
                fontWeight: 500, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}