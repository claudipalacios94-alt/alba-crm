// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home v5 (centro de mando operativo)
// Layout: KPIs full-width | Row A: 2 cols | Row B: 3 cols
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useEffect, useState } from "react";
import { B } from "../../data/constants.js";
import LlamaHoyCard       from "./LlamaHoyCard.jsx";
import AlertasHome        from "./AlertasHome.jsx";
import OfertaHome         from "./OfertaHome.jsx";
import HoyHome            from "./HoyHome.jsx";
import OperacionesRiesgo  from "./OperacionesRiesgo.jsx";
import FranjaKPIs         from "./FranjaKPIs.jsx";

// ── Responsive ────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w < bp;
}

// ── Wrapper de sección ────────────────────────────────────────
function Sec({ titulo, children, borderColor, accion, onAccion }) {
  return (
    <div style={{
      background: B.card,
      border: `1px solid ${borderColor || B.border}`,
      borderRadius: 10,
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        padding: "10px 16px 8px",
        borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: B.dim,
          letterSpacing: "0.9px", textTransform: "uppercase",
        }}>
          {titulo}
        </span>
        {accion && (
          <button onClick={onAccion} style={{
            fontSize: 10, color: "#4A8AE8", background: "transparent",
            border: "none", cursor: "pointer", padding: 0, fontWeight: 600,
          }}>
            {accion}
          </button>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Orden de etapas para LLAMA HOY ───────────────────────────
const ETAPA_RANK = { "Negociación": 0, "Visita": 1, "Calificado": 2, "Contacto": 3, "Nuevo Contacto": 4 };

// ── Componente principal ──────────────────────────────────────
export default function Briefing({ leads, properties, captaciones }) {
  const mobile = useIsMobile();

  const hoy = new Date();
  const fechaLabel = hoy.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  // Leads activos (excluye Cerrado y Perdido)
  const activos = useMemo(
    () => leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"),
    [leads]
  );

  // ── LLAMA HOY ─────────────────────────────────────────────
  const [leadContactados, setLeadContactados] = useState({});

  const llamaHoy = useMemo(() => {
    return [...activos]
      .filter(l =>
        l.tel &&
        (l.dias !== null || ["Negociación", "Visita", "Calificado"].includes(l.etapa))
      )
      .map(l => ({
        ...l,
        dias: leadContactados[l.id] ? 0 : l.dias,
      }))
      .sort((a, b) => {
        const ra = ETAPA_RANK[a.etapa] ?? 5;
        const rb = ETAPA_RANK[b.etapa] ?? 5;
        if (ra !== rb) return ra - rb;
        const da = a.dias ?? -1;
        const db = b.dias ?? -1;
        return db - da;
      })
      .slice(0, 5);
  }, [activos, leadContactados]);

  function handleContactado(leadId) {
    setLeadContactados(prev => ({ ...prev, [leadId]: true }));
  }

  return (
    <div style={{
      width: "100%", maxWidth: 1100, margin: "0 auto",
      display: "flex", flexDirection: "column",
      gap: mobile ? 12 : 18, paddingBottom: 40,
    }}>

      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: `1px solid ${B.border}` }}>
        <div style={{
          fontSize: 10, color: B.dim, letterSpacing: "1.2px",
          textTransform: "uppercase", fontWeight: 500,
        }}>
          {fechaLabel}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", marginTop: 4 }}>
          Resumen del negocio
        </div>
      </div>

      {/* KPIs full-width */}
      <FranjaKPIs leads={leads} activos={activos} captaciones={captaciones} />

      {/* Row A: Operaciones en riesgo | Llama hoy */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
        gap: mobile ? 12 : 16,
        alignItems: "start",
      }}>
        <Sec titulo="🚨 Operaciones en riesgo" borderColor={"#FF4D4D30"}>
          <OperacionesRiesgo leads={activos} />
        </Sec>

        <Sec titulo="🔥 Llama hoy" borderColor={B.accentL + "30"}>
          {llamaHoy.length === 0 ? (
            <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>
              Sin leads para llamar hoy
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {llamaHoy.map(l => (
                <LlamaHoyCard key={l.id} lead={l} onContactado={handleContactado} />
              ))}
            </div>
          )}
        </Sec>
      </div>

      {/* Row B: Alertas | Oferta | Hoy */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
        gap: mobile ? 12 : 16,
        alignItems: "start",
      }}>
        <Sec titulo="⚠️ Alertas" borderColor={B.border}>
          <AlertasHome leads={activos} />
        </Sec>

        <Sec titulo="📊 Oferta por zona" borderColor={B.border}>
          <OfertaHome leads={activos} properties={properties} captaciones={captaciones} />
        </Sec>

        <Sec titulo="📅 Hoy" borderColor={B.border}>
          <HoyHome />
        </Sec>
      </div>

    </div>
  );
}
