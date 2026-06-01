// ══════════════════════════════════════════════════════════════
// ALBA CRM — Home v2 (centro de mando operativo)
// Responde: ¿Cómo va el negocio? ¿A quién llamo? ¿Qué tengo hoy?
// Ruta /  — /briefing redirige acá via Navigate en App.jsx
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useEffect, useState } from "react";
import { B } from "../../data/constants.js";
import LlamaHoyCard       from "./LlamaHoyCard.jsx";
import AlertasHome        from "./AlertasHome.jsx";
import OfertaHome         from "./OfertaHome.jsx";
import HoyHome            from "./HoyHome.jsx";
import OperacionesRiesgo  from "./OperacionesRiesgo.jsx";

// ── Utilidad mobile ───────────────────────────────────────────
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
function Sec({ titulo, children, borderColor }) {
  return (
    <div style={{
      background: B.card,
      border: `1px solid ${borderColor || B.border}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 16px 8px",
        borderBottom: `1px solid ${B.border}`,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: B.dim,
          letterSpacing: "0.9px", textTransform: "uppercase",
        }}>
          {titulo}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Franja de estado del negocio ─────────────────────────────
function FranjaEstado({ activos, captaciones }) {
  const hoy      = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const stats = useMemo(() => ({
    leadsActivos:    activos.length,
    visitas:         activos.filter(l => l.etapa === "Visita").length,
    negociaciones:   activos.filter(l => l.etapa === "Negociación").length,
    captacionesMes:  (captaciones || []).filter(c =>
                       c.created_at && new Date(c.created_at) >= inicioMes
                     ).length,
  }), [activos, captaciones, inicioMes]);

  const items = [
    { label: "Leads activos",    valor: stats.leadsActivos,   color: B.accentL },
    { label: "Visitas",          valor: stats.visitas,        color: "#E8A830" },
    { label: "Negociaciones",    valor: stats.negociaciones,  color: B.ok },
    { label: "Captaciones mes",  valor: stats.captacionesMes, color: "#9B6DC8" },
    { label: "Facturación mes",  valor: "—",                  color: B.dim, sinDatos: true },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 1,
      background: B.border,
      borderRadius: 10,
      overflow: "hidden",
      border: `1px solid ${B.border}`,
    }}>
      {items.map(({ label, valor, color, sinDatos }) => (
        <div key={label} style={{
          background: B.card,
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{
            fontSize: sinDatos ? 20 : 26,
            fontWeight: 800,
            color: sinDatos ? B.dim : color,
            fontFamily: "Georgia,serif",
            lineHeight: 1,
          }}>
            {valor}
          </div>
          <div style={{ fontSize: 10, color: B.dim, fontWeight: 600, lineHeight: 1.3 }}>
            {label}
          </div>
        </div>
      ))}
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

  // ── LLAMA HOY — top 5, orden transparente ─────────────────
  // Incluir: tiene teléfono + (dias conocido O etapa avanzada)
  // Orden: etapa rank ASC, luego dias DESC (null al final del grupo)
  const [leadContactados, setLeadContactados] = useState({});

  const llamaHoy = useMemo(() => {
    return [...activos]
      .filter(l =>
        l.tel &&
        (l.dias !== null || ["Negociación", "Visita", "Calificado"].includes(l.etapa))
      )
      .map(l => ({
        ...l,
        // Si fue marcado contactado en esta sesión, forzar dias=0
        dias: leadContactados[l.id] ? 0 : l.dias,
      }))
      .sort((a, b) => {
        const ra = ETAPA_RANK[a.etapa] ?? 5;
        const rb = ETAPA_RANK[b.etapa] ?? 5;
        if (ra !== rb) return ra - rb;
        // dias DESC, null al final
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

      {/* Header — solo fecha */}
      <div style={{ paddingBottom: 14, borderBottom: `1px solid ${B.border}` }}>
        <div style={{
          fontSize: 10, color: B.dim, letterSpacing: "1.2px",
          textTransform: "uppercase", fontWeight: 500,
        }}>
          {fechaLabel}
        </div>
      </div>

      {/* Franja de estado — ¿Cómo va el negocio? */}
      <FranjaEstado activos={activos} captaciones={captaciones} />

      {/* Grid principal */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1.2fr 1fr",
        gap: mobile ? 12 : 16,
        alignItems: "start",
      }}>

        {/* Columna izquierda: OPERACIONES EN RIESGO + LLAMA HOY + OFERTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 16 }}>

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
                  <LlamaHoyCard
                    key={l.id}
                    lead={l}
                    onContactado={handleContactado}
                  />
                ))}
              </div>
            )}
          </Sec>

          <Sec titulo="📊 Oferta por zona">
            <OfertaHome
              leads={activos}
              properties={properties}
              captaciones={captaciones}
            />
          </Sec>

        </div>

        {/* Columna derecha: ALERTAS + HOY */}
        <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 16 }}>

          <Sec titulo="⚠️ Alertas" borderColor={B.border}>
            <AlertasHome leads={activos} />
          </Sec>

          <Sec titulo="📅 Hoy">
            <HoyHome />
          </Sec>

        </div>
      </div>
    </div>
  );
}
