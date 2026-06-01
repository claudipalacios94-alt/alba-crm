import React, { useMemo } from "react";
import { AG } from "../../data/constants.js";
import { computeRanking } from "../../domain/lead.js";
import LeadCard from "./LeadCard.jsx";

function badgePro(lead, ranking) {
  if (lead.etapa === "Negociación") return { label: "NEGOCIACIÓN", bg: "#EDE9FE", color: "#7C3AED" };
  if (lead.etapa === "Visita")      return { label: "VISITA",      bg: "#FEF3C7", color: "#D97706" };
  if (lead.etapa === "Calificado")  return { label: "CALIFICADO",  bg: "#DBEAFE", color: "#1D4ED8" };
  if (ranking.prioridad >= 75)     return { label: "URGENTE",     bg: "#FEE2E2", color: "#DC2626" };
  if (ranking.prioridad >= 50)     return { label: "ALTA",        bg: "#FFEDD5", color: "#EA580C" };
  if (ranking.prioridad >= 25)     return { label: "MEDIA",       bg: "#FEF9C3", color: "#CA8A04" };
  if (lead.dias !== null && lead.dias > 6) return { label: "FRÍO", bg: "#F1F5F9", color: "#64748B" };
  return { label: "BAJA", bg: "#DCFCE7", color: "#16A34A" };
}

function precioLabel(presup) {
  if (!presup) return null;
  const n = Number(presup);
  if (isNaN(n)) return String(presup);
  if (n >= 1000) return `USD ${Math.round(n / 1000)}k`;
  return `USD ${n.toLocaleString("es-AR")}`;
}

function diasLabel(dias) {
  if (dias === null || dias === undefined) return "Sin registro";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function diasColor(dias) {
  if (dias === null || dias === undefined) return "#94a3b8";
  if (dias === 0) return "#16a34a";
  if (dias <= 3) return "#475569";
  if (dias <= 6) return "#d97706";
  return "#dc2626";
}

function DataPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e3a5f" }}>{value}</div>
    </div>
  );
}

export default function LeadCardPro({
  lead, matches = [], isOpen, onToggle,
  properties, captaciones, mostrados, toggleMostrado,
  updateLead, deleteLead,
  setEtapa, setAgente, setModalPerdido, setConfirmDelete,
  isBlurred, hasNewMatch, mobile,
}) {
  const ranking = useMemo(() => computeRanking(lead, matches.length), [lead, matches.length]);
  const badge   = badgePro(lead, ranking);
  const ag      = AG[lead.ag];
  const precio  = precioLabel(lead.presup);

  const matchesConFoto = matches.filter(m => m.fotos?.[0]);

  const cardProps = {
    mobile, properties, captaciones, mostrados, toggleMostrado,
    updateLead, deleteLead, setEtapa, setAgente, setModalPerdido, setConfirmDelete,
    isBlurred: false, hasNewMatch,
  };

  if (isOpen) {
    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{
          background: "#fff",
          border: "1px solid #bfdbfe",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(37,99,235,0.10)",
        }}>
          <div style={{
            background: "#1e3a5f",
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {lead.nombre || "Sin nombre"}
            </span>
            <button onClick={onToggle}
              style={{ background: "rgba(255,255,255,0.12)", border: "none",
                color: "#fff", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>
              ✕ Cerrar
            </button>
          </div>
          <LeadCard lead={lead} open={true} onToggle={onToggle} {...cardProps} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onToggle}
      style={{
        background: "#fff",
        border: `1px solid ${hasNewMatch ? "#3b82f6" : "#e5eaf2"}`,
        borderRadius: 16,
        padding: "16px",
        cursor: "pointer",
        opacity: isBlurred ? 0.38 : 1,
        transition: "opacity 0.15s, box-shadow 0.15s, border-color 0.15s",
        boxShadow: hasNewMatch
          ? "0 0 0 3px rgba(59,130,246,0.15), 0 2px 10px rgba(0,0,0,0.07)"
          : "0 1px 6px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
      onMouseEnter={e => {
        if (!isBlurred) {
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.13)";
          e.currentTarget.style.borderColor = "#bfdbfe";
        }
      }}
      onMouseLeave={e => {
        if (!isBlurred) {
          e.currentTarget.style.boxShadow = hasNewMatch
            ? "0 0 0 3px rgba(59,130,246,0.15), 0 2px 10px rgba(0,0,0,0.07)"
            : "0 1px 6px rgba(0,0,0,0.06)";
          e.currentTarget.style.borderColor = hasNewMatch ? "#3b82f6" : "#e5eaf2";
        }
      }}
    >
      {/* Badge + nuevo match */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
          color: badge.color, background: badge.bg,
          padding: "3px 9px", borderRadius: 20, flexShrink: 0,
        }}>
          {badge.label}
        </span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {hasNewMatch && (
            <span style={{ fontSize: 9, color: "#2563eb", background: "rgba(37,99,235,0.1)",
              padding: "2px 7px", borderRadius: 20, fontWeight: 800, letterSpacing: "0.06em" }}>
              ● MATCH NUEVO
            </span>
          )}
          <span style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1 }}
            onClick={e => e.stopPropagation()}>⋮</span>
        </div>
      </div>

      {/* Nombre + subtítulo */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744", lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.nombre || "Sin nombre"}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.inversor ? "💼 Inversor" : "🏠 Comprador"}
          {lead.zona ? ` · ${lead.zona}` : ""}
        </div>
      </div>

      {/* Tel + WA */}
      {lead.tel && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}
          onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 11, color: "#64748b", flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📞 {lead.tel.slice(0, 12)}{lead.tel.length > 12 ? "…" : ""}
          </span>
          <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              color: "#16a34a", background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.3)", textDecoration: "none", flexShrink: 0 }}>
            WA
          </a>
        </div>
      )}

      {/* Datos en grid 2 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px" }}>
        {precio     && <DataPill label="Presupuesto" value={precio} />}
        {lead.tipo  && <DataPill label="Tipo" value={lead.tipo} />}
        {lead.ambientes && <DataPill label="Ambientes" value={`${lead.ambientes} amb`} />}
        {lead.cochera === "si" && <DataPill label="Cochera" value="✓ Sí" />}
        {lead.credito === "si" && <DataPill label="Crédito" value="✓ Aprobado" />}
        {lead.etapa  && <DataPill label="Etapa" value={lead.etapa} />}
      </div>

      {/* Matches strip */}
      <div style={{
        background: matches.length > 0 ? "rgba(37,99,235,0.05)" : "#f8fafc",
        border: `1px solid ${matches.length > 0 ? "rgba(37,99,235,0.15)" : "#e5eaf2"}`,
        borderRadius: 10, padding: "8px 10px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
          color: matches.length > 0 ? "#2563eb" : "#94a3b8" }}>
          {matches.length === 0 ? "0 MATCHES" : `${matches.length} MATCH${matches.length !== 1 ? "ES" : ""}`}
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, minWidth: 0 }}>
          {matchesConFoto.slice(0, 2).map(m => (
            <img key={m.id} src={Array.isArray(m.fotos) ? m.fotos[0] : m.fotos}
              alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover",
                border: "1px solid #e5eaf2", flexShrink: 0 }} />
          ))}
          {matchesConFoto.length > 2 && (
            <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9",
              borderRadius: 6, padding: "2px 6px", fontWeight: 600, flexShrink: 0 }}>
              +{matchesConFoto.length - 2}
            </span>
          )}
          {matches.length > 0 && matchesConFoto.length === 0 && (
            <span style={{ fontSize: 10, color: "#64748b" }}>
              {matches.length === 1 ? "1 prop sin foto" : `${matches.length} props sin foto`}
            </span>
          )}
        </div>
        {matches.length > 0 && (
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{ fontSize: 10, color: "#2563eb", background: "rgba(37,99,235,0.08)",
              border: "1px solid rgba(37,99,235,0.2)", borderRadius: 6, padding: "2px 8px",
              cursor: "pointer", flexShrink: 0, fontWeight: 600 }}>
            Ver →
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 11, color: diasColor(lead.dias), fontWeight: 500 }}>
            Último contacto: {diasLabel(lead.dias)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              updateLead(lead.id, { last_contact_at: new Date().toISOString() });
            }}
            style={{ alignSelf: "flex-start", marginTop: 3, padding: "2px 9px", borderRadius: 6,
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              border: "1px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.08)",
              color: "#16a34a" }}>
            ✓ Contacté hoy
          </button>
        </div>
        {ag && (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: ag.bg,
            border: `2px solid ${ag.c}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: ag.c,
            flexShrink: 0,
          }}>
            {lead.ag}
          </div>
        )}
      </div>
    </div>
  );
}
