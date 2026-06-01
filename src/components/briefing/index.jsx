// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home v6 (compact + slide panel)
// Vista compacta todo en pantalla. Click → panel lateral.
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useEffect, useState } from "react";
import { B } from "../../data/constants.js";
import LlamaHoyCard      from "./LlamaHoyCard.jsx";
import AlertasHome       from "./AlertasHome.jsx";
import OfertaHome        from "./OfertaHome.jsx";
import HoyHome           from "./HoyHome.jsx";
import OperacionesRiesgo from "./OperacionesRiesgo.jsx";
import FranjaKPIs        from "./FranjaKPIs.jsx";

// ── ETAPA RANK ────────────────────────────────────────────────
const ETAPA_RANK = { "Negociación": 0, "Visita": 1, "Calificado": 2, "Contacto": 3, "Nuevo Contacto": 4 };

// ── Slide Panel ───────────────────────────────────────────────
function SlidePanel({ open, onClose, titulo, children, borderColor }) {
  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.22s ease",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(480px, 92vw)",
        background: "#080F1E",
        borderLeft: `1px solid ${borderColor || B.border}`,
        zIndex: 201,
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
        boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.4)" : "none",
      }}>
        {/* Header del panel */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px",
          borderBottom: `1px solid ${B.border}`,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: B.dim,
            letterSpacing: "0.9px", textTransform: "uppercase",
          }}>
            {titulo}
          </span>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#475569", fontSize: 18, lineHeight: 1, padding: "2px 6px",
            borderRadius: 6,
          }}>
            ✕
          </button>
        </div>
        {/* Contenido scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Tile compacto ─────────────────────────────────────────────
function Tile({ emoji, label, value, sub, color, onClick, alert }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#0F1C35" : "#0C1527",
        border: `1px solid ${alert ? color + "40" : B.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        minWidth: 0,
        display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13 }}>{emoji}</span>
        {alert && (
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: color, flexShrink: 0,
            boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color: "#F1F5F9",
        fontFamily: "Georgia,serif", lineHeight: 1, letterSpacing: "-0.5px",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.02em" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: color, fontWeight: 600, marginTop: 1 }}>
          {sub}
        </div>
      )}
      <div style={{
        fontSize: 10, color: "#374151", marginTop: 2, textAlign: "right",
      }}>
        Ver todo ›
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Briefing({ leads, properties, captaciones }) {
  const [panel, setPanel] = useState(null); // "ops" | "llama" | "alertas" | "oferta" | "hoy"
  const [leadContactados, setLeadContactados] = useState({});

  const hoy = new Date();
  const fechaLabel = hoy.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const activos = useMemo(
    () => leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"),
    [leads]
  );

  // ── Conteos para tiles ─────────────────────────────────────
  const cntOps = useMemo(() => {
    const neg = activos.filter(l => l.etapa === "Negociación" && (l.dias === null || l.dias >= 2));
    const vis = activos.filter(l => l.etapa === "Visita"      && (l.dias === null || l.dias >= 2));
    const cal = activos.filter(l => l.etapa === "Calificado"  && l.dias !== null && l.dias >= 7);
    return neg.length + vis.length + cal.length;
  }, [activos]);

  const cntAlertas = useMemo(() => {
    const ahora = Date.now();
    const seisH = 6 * 60 * 60 * 1000;
    let n = 0;
    if (activos.some(l => l.etapa === "Negociación" && l.dias !== null && l.dias >= 2)) n++;
    if (activos.some(l => {
      const c = l.created_at ? new Date(l.created_at).getTime() : null;
      return c && (ahora - c) > seisH && (!l.zona || !l.presup || !l.tipo);
    })) n++;
    return n;
  }, [activos]);

  const llamaHoy = useMemo(() => {
    return [...activos]
      .filter(l =>
        l.tel &&
        (l.dias !== null || ["Negociación", "Visita", "Calificado"].includes(l.etapa))
      )
      .map(l => ({ ...l, dias: leadContactados[l.id] ? 0 : l.dias }))
      .sort((a, b) => {
        const ra = ETAPA_RANK[a.etapa] ?? 5;
        const rb = ETAPA_RANK[b.etapa] ?? 5;
        if (ra !== rb) return ra - rb;
        return (b.dias ?? -1) - (a.dias ?? -1);
      })
      .slice(0, 5);
  }, [activos, leadContactados]);

  function handleContactado(id) {
    setLeadContactados(prev => ({ ...prev, [id]: true }));
  }

  // ── Panel config ───────────────────────────────────────────
  const PANELS = {
    ops:    { titulo: "🚨 Operaciones en riesgo", color: "#FF4D4D" },
    llama:  { titulo: "🔥 Llama hoy",             color: B.accentL },
    alertas:{ titulo: "⚠️ Alertas",               color: "#FF8C42" },
    oferta: { titulo: "📊 Oferta por zona",        color: "#4A8AE8" },
    hoy:    { titulo: "📅 Hoy",                    color: "#22C55E" },
  };

  const current = panel ? PANELS[panel] : null;

  return (
    <div style={{
      width: "100%", maxWidth: 1100, margin: "0 auto",
      display: "flex", flexDirection: "column",
      gap: 14, paddingBottom: 24,
    }}>

      {/* Header compacto */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12,
        paddingBottom: 10, borderBottom: `1px solid ${B.border}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0" }}>
          Resumen del negocio
        </div>
        <div style={{ fontSize: 10, color: B.dim, letterSpacing: "0.8px", textTransform: "uppercase" }}>
          {fechaLabel}
        </div>
      </div>

      {/* KPIs compactos */}
      <FranjaKPIs leads={leads} activos={activos} captaciones={captaciones} compact />

      {/* Tiles operativos */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 10,
      }}>
        <Tile
          emoji="🚨" label="En riesgo" value={cntOps}
          sub={cntOps > 0 ? `${cntOps} operaciones` : null}
          color="#EF4444" alert={cntOps > 0}
          onClick={() => setPanel("ops")}
        />
        <Tile
          emoji="🔥" label="Llama hoy" value={llamaHoy.length}
          sub={llamaHoy.length > 0 ? "prioritarios" : null}
          color={B.accentL} alert={false}
          onClick={() => setPanel("llama")}
        />
        <Tile
          emoji="⚠️" label="Alertas" value={cntAlertas}
          sub={cntAlertas > 0 ? "requieren acción" : null}
          color="#FF8C42" alert={cntAlertas > 0}
          onClick={() => setPanel("alertas")}
        />
        <Tile
          emoji="📊" label="Oferta" value="Zonas"
          sub="ver desequilibrio"
          color="#4A8AE8" alert={false}
          onClick={() => setPanel("oferta")}
        />
        <Tile
          emoji="📅" label="Hoy" value="Tareas"
          sub="agenda del día"
          color="#22C55E" alert={false}
          onClick={() => setPanel("hoy")}
        />
      </div>

      {/* Slide Panel */}
      <SlidePanel
        open={!!panel}
        onClose={() => setPanel(null)}
        titulo={current?.titulo}
        borderColor={current?.color + "40"}
      >
        {panel === "ops"    && <OperacionesRiesgo leads={activos} />}
        {panel === "llama"  && (
          llamaHoy.length === 0
            ? <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "20px 0" }}>Sin leads para llamar hoy</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {llamaHoy.map(l => <LlamaHoyCard key={l.id} lead={l} onContactado={handleContactado} />)}
              </div>
        )}
        {panel === "alertas" && <AlertasHome leads={activos} />}
        {panel === "oferta"  && <OfertaHome leads={activos} properties={properties} captaciones={captaciones} />}
        {panel === "hoy"     && <HoyHome />}
      </SlidePanel>

    </div>
  );
}
