// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCard v3 (densidad vertical)
// Card cerrada: 85-95px. 5 respuestas en 2 segundos.
// Zona expandida intacta.
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead, matchLeadProps, genMsgBusqueda } from "../../data/constants.js";
import { parsearNotas, TIPO_NOTA } from "../../domain/nota.js";
import { computeRanking } from "../../domain/lead.js";
import LeadForm          from "./LeadForm.jsx";
import LeadMatches       from "./LeadMatches.jsx";
import LeadAcciones      from "./LeadAcciones.jsx";
import InversorNota      from "./InversorNota.jsx";
import NotaLead          from "./NotaLead.jsx";
import LeadQualification from "./LeadQualification.jsx";
import { BuscadorPanel } from "../Buscador.jsx";

function badgeConfig(label) {
  const map = {
    "Caliente": { dot: "🔴", color: "#FF4D4D", bg: "rgba(255,77,77,0.13)"  },
    "Tibio":    { dot: "🟡", color: "#FF8C42", bg: "rgba(255,140,66,0.13)" },
    "Frío":     { dot: "⚪", color: "#4A6580", bg: "rgba(74,101,128,0.15)" },
  };
  return map[label] || map["Frío"];
}

function prioridadColor(p) {
  if (p >= 75) return "#FF4D4D";
  if (p >= 50) return "#FF8C42";
  if (p >= 25) return "#F5C842";
  return "#4A6580";
}

function diasConfig(dias) {
  if (dias === null || dias === undefined) return { label: "—",      color: "#4A6580", bg: null };
  if (dias === 0)                          return { label: "hoy",    color: "#4ADE80", bg: null };
  if (dias <= 3)                           return { label: `+${dias}d`, color: "#8BA4BC", bg: null };
  if (dias <= 6)                           return { label: `+${dias}d`, color: "#F5C842", bg: null };
  return { label: `+${dias}d`, color: "#FF4D4D", bg: "rgba(255,77,77,0.15)" };
}

function precioLabel(presup) {
  if (!presup) return null;
  const n = Number(presup);
  if (isNaN(n)) return String(presup);
  if (n >= 1000) return `USD ${Math.round(n/1000)}k`;
  return `USD ${n.toLocaleString("es-AR")}`;
}

function getPedidoResumen(lead) {
  const parts = [];
  if (lead.ambientes)        parts.push(lead.ambientes + " amb");
  if (lead.cochera === "si") parts.push("cochera");
  if (lead.patio   === "si") parts.push("patio");
  if (lead.balcon  === "si") parts.push("balcon");
  if (lead.credito === "si") parts.push("credito");
  return parts.join(" · ") || null;
}

function Section({ label, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${B.border}` }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 14px", cursor: "pointer",
          background: open ? "rgba(42,91,173,0.04)" : "transparent" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#4A6A90",
          letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, color: "#2A3A5A",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && <div style={{ padding: "0 14px 12px" }}>{children}</div>}
    </div>
  );
}

export default function LeadCard({
  lead, mobile, open, onToggle,
  properties, captaciones, mostrados, toggleMostrado,
  updateLead, deleteLead,
  setEtapa, setAgente, setModalPerdido, setConfirmDelete,
  isBlurred, hasNewMatch,
}) {
  const [editing,    setEditing]    = useState(false);
  const [buscandoId, setBuscandoId] = useState(null);

  const s     = scoreLead(lead);
  const badge = badgeConfig(s.label);

  const { matches, ranking } = useMemo(() => {
    const caps = (captaciones || []).map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
      dir: c.direccion, caracts: c.caracts, activa: true,
      _esCaptacion: true, _tipoCap: c.tipo_captacion, _url: c.url,
    }));
    const allProps = [...(properties || []), ...caps];
    const m = matchLeadProps(lead, allProps);
    return { matches: m, ranking: computeRanking(lead, m.length) };
  }, [lead, properties, captaciones]);

  const pedido = getPedidoResumen(lead);
  const dc     = diasConfig(lead.dias);
  const pc     = prioridadColor(ranking.prioridad);

  const borderLeftColor = s.label === "Caliente" ? "#FF4D4D"
    : s.label === "Tibio" ? "#FF8C42"
    : "#2A3A5A";

  async function guardarNota(l, val)         { await updateLead(l.id, { nota: val }); }
  async function guardarNotaInversor(l, n)   { await updateLead(l.id, { nota_inversor: n }); }
  async function toggleInversor()            { await updateLead(lead.id, { inversor: !lead.inversor }); }
  async function handleGuardarEdicion(id, d) { await updateLead(id, d); setEditing(false); }

  return (
    <div style={{
      background:   "#0C1B2E",
      border:       `1px solid ${open ? B.accent : "rgba(255,255,255,0.06)"}`,
      borderLeft:   `3px solid ${borderLeftColor}`,
      borderRadius: 10,
      overflow:     "hidden",
      opacity:      isBlurred ? 0.38 : 1,
      transition:   "opacity 0.2s, border-color 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={e => {
      if (!isBlurred && !open) {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)";
        e.currentTarget.style.boxShadow   = "0 2px 12px rgba(0,0,0,0.25)";
      }
    }}
    onMouseLeave={e => {
      if (!open) {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.boxShadow   = "none";
      }
    }}>

      {/* ── ZONA CERRADA ─────────────────────────────────── */}
      <div onClick={onToggle} style={{ cursor: "pointer" }}>

        {/* Línea 1: badge · score · nombre · días */}
        <div style={{
          padding: "8px 12px 0",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {/* Temperatura */}
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
            color: badge.color, background: badge.bg,
            padding: "2px 7px", borderRadius: 20, flexShrink: 0,
          }}>
            {badge.dot} {s.label.toUpperCase()}
          </span>

          {/* Score */}
          <span style={{
            fontSize: 13, fontWeight: 800, color: pc,
            fontFamily: "Georgia,serif", lineHeight: 1, flexShrink: 0,
          }}>
            {ranking.prioridad}
          </span>

          {/* Nombre */}
          <span style={{
            fontSize: 14, fontWeight: 700, color: "#EAF0FB",
            flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {lead.nombre || "Sin nombre"}
          </span>

          {/* Días */}
          <span style={{
            fontSize: 11, fontWeight: 700, color: dc.color, flexShrink: 0,
            background: dc.bg || "transparent",
            padding: dc.bg ? "2px 6px" : "0",
            borderRadius: dc.bg ? 4 : 0,
          }}>
            {dc.label}
          </span>
        </div>

        {/* Línea 2: rol · zona · precio */}
        <div style={{
          padding: "3px 12px 0",
          display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: "#6A8AAE" }}>
            {lead.inversor ? "💼 Inversor" : lead.op || "Compra"}
          </span>
          {lead.zona && (
            <span style={{ fontSize: 11, color: "#6A8AAE" }}>· {lead.zona}</span>
          )}
          {lead.presup && (
            <span style={{ fontSize: 13, fontWeight: 800, color: "#EAF0FB", fontFamily: "Georgia,serif", marginLeft: "auto", flexShrink: 0 }}>
              {precioLabel(lead.presup)}
            </span>
          )}
        </div>

        {/* Línea 3: pedido */}
        {pedido && (
          <div style={{ padding: "2px 12px 0", fontSize: 11, color: "#4A6580" }}>
            {pedido}
          </div>
        )}

        {/* Línea 4: tel · WA · matches · ✓ Hoy */}
        <div style={{
          padding: "6px 12px 8px",
          display: "flex", alignItems: "center", gap: 8,
          flexWrap: "wrap",
        }} onClick={e => e.stopPropagation()}>

          {lead.tel && (
            <span style={{ fontSize: 11, color: "#6A8AAE" }}>
              📞 {lead.tel.slice(0, 10)}{lead.tel.length > 10 ? "…" : ""}
            </span>
          )}

          {lead.tel && (
            <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              style={{
                padding: "2px 9px", borderRadius: 5,
                fontSize: 11, fontWeight: 700,
                color: "#25D366", background: "rgba(37,211,102,0.10)",
                border: "1px solid rgba(37,211,102,0.25)", textDecoration: "none",
              }}>
              WA
            </a>
          )}

          {matches.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: "#4ADE80",
              background: "rgba(74,222,128,0.10)",
              padding: "2px 9px",
              borderRadius: 20,
              border: "1px solid rgba(74,222,128,0.20)",
            }}>
              🏠 {matches.length} compatibles
            </span>
          )}

          <button
            onClick={() => updateLead(lead.id, { last_contact_at: new Date().toISOString() })}
            style={{
              marginLeft: "auto", padding: "3px 10px", borderRadius: 6,
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${B.ok}35`, background: `${B.ok}12`, color: B.ok,
            }}>
            ✓ Hoy
          </button>

          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              padding: "3px 7px", borderRadius: 6, fontSize: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
              color: "#4A6580", cursor: "pointer",
            }}>
            {open ? "▲" : "▼"}
          </button>

        </div>

      </div>

      {/* ── ZONA EXPANDIDA — intacta ──────────────────────── */}
      {open && (
        <div>
          {editing ? (
            <div style={{ padding: "0 14px 14px" }}>
              <LeadForm lead={lead} mobile={mobile}
                onGuardar={handleGuardarEdicion}
                onCancelar={() => setEditing(false)} />
            </div>
          ) : (
            <>
              <Section label="Etapa y agente">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {ETAPAS.map(e => (
                    <button key={e} onClick={() => setEtapa(lead.id, e)}
                      style={{ padding: "3px 10px", borderRadius: 12, cursor: "pointer",
                        fontSize: 12, border: `1px solid ${lead.etapa === e ? (ECOL[e] || B.dim) : B.border}`,
                        background: lead.etapa === e ? `${ECOL[e] || B.dim}22` : "transparent",
                        color: lead.etapa === e ? (ECOL[e] || B.dim) : B.muted,
                        fontWeight: lead.etapa === e ? 700 : 400 }}>
                      {e}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(AG).map(([k, v]) => (
                    <button key={k} onClick={() => setAgente(lead.id, k)}
                      style={{ padding: "3px 10px", borderRadius: 12, cursor: "pointer",
                        fontSize: 12, border: `1px solid ${lead.ag === k ? v.c : B.border}`,
                        background: lead.ag === k ? `${v.c}22` : "transparent",
                        color: lead.ag === k ? v.c : B.muted,
                        fontWeight: lead.ag === k ? 700 : 400 }}>
                      {v.n}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Notas" defaultOpen>
                <NotaLead lead={lead} onGuardar={guardarNota} />
              </Section>

              {matches.length > 0 && (
                <Section label={`Matches (${matches.length})`} defaultOpen>
                  <LeadMatches lead={lead} properties={properties} captaciones={captaciones}
                    mostrados={mostrados} toggleMostrado={toggleMostrado} />
                </Section>
              )}

              {buscandoId === lead.id && (
                <Section label="Buscador" defaultOpen>
                  <BuscadorPanel lead={lead} />
                </Section>
              )}

              <Section label="Calificacion">
                <LeadQualification lead={lead} onUpdate={updateLead} />
              </Section>

              <Section label="Perfil inversor">
                <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8,
                  background: lead.inversor ? "rgba(155,109,200,0.1)" : "rgba(42,91,173,0.05)",
                  border: `1px solid ${lead.inversor ? "#9B6DC840" : B.border}` }}>
                  <button onClick={toggleInversor}
                    style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", border: "none",
                      position: "relative", flexShrink: 0,
                      background: lead.inversor ? "#9B6DC8" : "#2A3A5A" }}>
                    <div style={{ position: "absolute", top: 2, left: lead.inversor ? 18 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s" }} />
                  </button>
                  <span style={{ fontSize: 11, color: lead.inversor ? "#9B6DC8" : "#8AAECC", fontWeight: 600 }}>
                    Inversor
                  </span>
                  {lead.inversor && <InversorNota lead={lead} onGuardar={guardarNotaInversor} />}
                </div>
              </Section>

              <Section label="Mas acciones">
                <div style={{ paddingTop: 4 }}>
                  <LeadAcciones
                    lead={lead} mobile={mobile} updateLead={updateLead}
                    onEditar={() => setEditing(true)}
                    onEliminar={() => setConfirmDelete(lead)}
                    buscandoId={buscandoId} setBuscandoId={setBuscandoId}
                    toggleInversor={toggleInversor}
                    guardarNotaInversor={guardarNotaInversor}
                  />
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
