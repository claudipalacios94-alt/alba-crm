// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home v7 (todo visible, sin scroll de página)
// KPIs full + 2 cols + 3 cols, cada sección con altura fija.
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

// ── Sección con header y scroll interno ──────────────────────
function Sec({ titulo, icon, children, borderColor, maxH }) {
  return (
    <div style={{
      background: B.card,
      border: `1px solid ${borderColor || B.border}`,
      borderRadius: 10,
      display: "flex", flexDirection: "column",
      minWidth: 0, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 14px 7px",
        borderBottom: `1px solid ${B.border}`,
        display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
      }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{
          fontSize: 10, fontWeight: 700, color: B.dim,
          letterSpacing: "0.9px", textTransform: "uppercase",
        }}>
          {titulo}
        </span>
      </div>
      {/* Contenido con scroll si desborda */}
      <div style={{
        padding: "12px 14px",
        overflowY: "auto",
        maxHeight: maxH || "none",
        flex: 1,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Briefing({ leads, properties, captaciones }) {
  const [leadContactados, setLeadContactados] = useState({});

  const hoy = new Date();
  const fechaLabel = hoy.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const activos = useMemo(
    () => leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido"),
    [leads]
  );

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

  return (
    <div style={{
      width: "100%", maxWidth: 1200, margin: "0 auto",
      display: "flex", flexDirection: "column",
      gap: 10, paddingBottom: 16,
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        paddingBottom: 8, borderBottom: `1px solid ${B.border}`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", letterSpacing: "0.02em" }}>
          Resumen del negocio
        </div>
        <div style={{ fontSize: 10, color: B.dim, letterSpacing: "0.8px", textTransform: "uppercase" }}>
          {fechaLabel}
        </div>
      </div>

      {/* KPIs */}
      <FranjaKPIs leads={leads} activos={activos} captaciones={captaciones} />

      {/* Row A: Operaciones | Llama hoy */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        alignItems: "start",
      }}>
        <Sec titulo="Operaciones en riesgo" icon="🚨" borderColor="#FF4D4D25" maxH="280px">
          <OperacionesRiesgo leads={activos} />
        </Sec>

        <Sec titulo="Llama hoy" icon="🔥" borderColor={B.accentL + "25"} maxH="280px">
          {llamaHoy.length === 0
            ? <div style={{ fontSize: 12, color: B.muted, textAlign: "center", padding: "10px 0" }}>Sin leads para llamar hoy</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {llamaHoy.map(l => <LlamaHoyCard key={l.id} lead={l} onContactado={handleContactado} />)}
              </div>
          }
        </Sec>
      </div>

      {/* Row B: Alertas | Oferta | Hoy */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
        alignItems: "start",
      }}>
        <Sec titulo="Alertas" icon="⚠️" borderColor={B.border} maxH="220px">
          <AlertasHome leads={activos} />
        </Sec>

        <Sec titulo="Oferta por zona" icon="📊" borderColor={B.border} maxH="220px">
          <OfertaHome leads={activos} properties={properties} captaciones={captaciones} />
        </Sec>

        <Sec titulo="Hoy" icon="📅" borderColor={B.border} maxH="220px">
          <HoyHome />
        </Sec>
      </div>

    </div>
  );
}
