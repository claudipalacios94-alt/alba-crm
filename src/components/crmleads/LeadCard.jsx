// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCard v2 (Fase 1 visual)
// Mismo contrato de props. Solo cambia presentación zona cerrada.
// Zona expandida intacta.
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead, matchLeadProps, genMsgBusqueda } from "../../data/constants.js";
import { parsearNotas, tipoNotaReciente, TIPO_NOTA } from "../../domain/nota.js";
import { getPriorityScore, getQualificationScore, computeRanking } from "../../domain/lead.js";
import LeadForm          from "./LeadForm.jsx";
import LeadMatches       from "./LeadMatches.jsx";
import LeadAcciones      from "./LeadAcciones.jsx";
import InversorNota      from "./InversorNota.jsx";
import NotaLead          from "./NotaLead.jsx";
import LeadQualification from "./LeadQualification.jsx";
import { BuscadorPanel } from "../Buscador.jsx";

const C = {
  cardBg:      "#0C1B2E",
  headerBg:    "#07111f",
  badgeBg:     "#091525",
  border:      "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.11)",
  text:        "#EAF0FB",
  secondary:   "#8BA4BC",
  muted:       "#4A6580",
  wa:          "#25D366",
  waBg:        "rgba(37,211,102,0.10)",
  waBorder:    "rgba(37,211,102,0.30)",
  matchBg:     "rgba(74,222,128,0.08)",
  matchColor:  "#4ADE80",
  urgente:     "#FF4D4D",
  alta:        "#FF8C42",
  media:       "#F5C842",
  baja:        "#4ADE80",
  frio:        "#4A6580",
};

function badgeConfig(label) {
  const map = {
    "Caliente": { bg: "rgba(255,77,77,0.15)",  color: "#FF4D4D", text: "URGENTE" },
    "Tibio":    { bg: "rgba(255,140,66,0.15)", color: "#FF8C42", text: "TIBIO"   },
    "Frío":     { bg: "rgba(74,101,128,0.20)", color: "#4A6580", text: "FRÍO"    },
  };
  return map[label] || { bg: "rgba(74,101,128,0.15)", color: "#4A6580", text: label?.toUpperCase() || "—" };
}

function prioridadColor(p) {
  if (p >= 75) return "#FF4D4D";
  if (p >= 50) return "#FF8C42";
  if (p >= 25) return "#F5C842";
  return "#4A6580";
}

function diasConfig(dias) {
  if (dias === null || dias === undefined) return { label: "—",         color: "#4A6580" };
  if (dias === 0)                          return { label: "hoy",       color: "#4ADE80" };
  if (dias === 1)                          return { label: "+1 día",    color: "#4ADE80" };
  if (dias <= 3)                           return { label: `+${dias}d`, color: "#F5C842" };
  if (dias <= 7)                           return { label: `+${dias}d`, color: "#FF8C42" };
  return                                          { label: `+${dias}d`, color: "#FF4D4D" };
}

function precioLabel(presup) {
  if (!presup) return null;
  const n = Number(presup);
  if (isNaN(n)) return String(presup);
  return `USD ${n.toLocaleString("es-AR")}`;
}

function getNotaClave(lead) {
  const notas = parsearNotas(lead.nota);
  if (!notas.length) return null;
  const sorted = [...notas].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const nota = sorted[0];
  const cfg  = TIPO_NOTA[nota.tipo] || TIPO_NOTA.seguimiento;
  return { texto: nota.texto, emoji: cfg.emoji };
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

function MatchThumbs({ matches, properties }) {
  if (!matches || matches.length === 0) {
    return React.createElement("span", { style: { fontSize: 11, color: "#4A6580" } }, "0 matches");
  }
  const visible = matches.slice(0, 3);
  const extra   = matches.length - 3;
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
    React.createElement("span", {
      style: { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#4ADE80",
        background: "rgba(74,222,128,0.08)", padding: "2px 9px", borderRadius: 20 }
    }, matches.length + (matches.length === 1 ? " MATCH" : " MATCHES")),
    React.createElement("div", { style: { display: "flex", gap: 3 } },
      ...visible.map((match, i) => {
        const prop = Array.isArray(properties) ? properties.find(p => p.id === match.id) : null;
        const fotos = prop?.fotos || match?.fotos;
        let url = null;
        if (Array.isArray(fotos) && fotos.length > 0) {
          const f = fotos[0];
          if (typeof f === "string" && (f.startsWith("http") || f.startsWith("data:"))) url = f;
        } else if (typeof fotos === "string" && fotos.startsWith("http")) {
          url = fotos;
        }
        return React.createElement("div", {
          key: match.id || i,
          style: { width: 30, height: 30, borderRadius: 6, overflow: "hidden", background: "#091525",
            border: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center" }
        }, url
          ? React.createElement("img", { src: url, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" },
              onError: e => { e.target.style.display = "none"; } })
          : React.createElement("span", { style: { fontSize: 12, opacity: 0.35 } }, "🏠")
        );
      }),
      extra > 0 && React.createElement("div", {
        style: { width: 30, height: 30, borderRadius: 6, background: "#091525",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "#8BA4BC" }
      }, "+" + extra)
    )
  );
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

  const nota   = getNotaClave(lead);
  const pedido = getPedidoResumen(lead);
  const dc     = diasConfig(lead.dias);
  const pc     = prioridadColor(ranking.prioridad);

  const borderLeftColor = s.label === "Caliente" ? "#FF4D4D"
    : s.label === "Tibio" ? "#FF8C42"
    : "#2A3A5A";

  async function guardarNota(l, val)          { await updateLead(l.id, { nota: val }); }
  async function guardarNotaInversor(l, n)    { await updateLead(l.id, { nota_inversor: n }); }
  async function toggleInversor()             { await updateLead(lead.id, { inversor: !lead.inversor }); }
  async function handleGuardarEdicion(id, d)  { await updateLead(id, d); setEditing(false); }

  return (
    <div
      style={{
        background:   "#0C1B2E",
        border:       `1px solid ${open ? B.accent : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${borderLeftColor}`,
        borderRadius: 12,
        overflow:     "hidden",
        opacity:      isBlurred ? 0.38 : 1,
        transition:   "opacity 0.2s, border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        if (!isBlurred && !open) {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)";
          e.currentTarget.style.boxShadow   = "0 4px 20px rgba(0,0,0,0.28)";
        }
      }}
      onMouseLeave={e => {
        if (!open) {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.boxShadow   = "none";
        }
      }}
    >

      <div onClick={onToggle} style={{ cursor: "pointer" }}>

        <div style={{ background: "#07111f", padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
            color: badge.color, background: badge.bg,
            padding: "2px 9px", borderRadius: 20, flexShrink: 0 }}>
            {badge.text}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: pc,
              fontFamily: "Georgia,serif", lineHeight: 1 }}>
              {ranking.prioridad}
            </span>
            <span style={{ fontSize: 9, color: ranking.confianza === "alta" ? B.ok
              : ranking.confianza === "media" ? B.warm : "#4A6580" }}>
              {ranking.confianza}
            </span>
            {ranking.tags.slice(0, 2).map(t => (
              <span key={t.key} style={{ fontSize: 11 }} title={t.label}>{t.emoji}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: dc.color }}>{dc.label}</span>
            {lead.dias >= 3 && <span style={{ fontSize: 10 }}>⏰</span>}
          </div>
        </div>

        <div style={{ padding: "10px 14px 12px" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 3, gap: 8 }}>
            <span style={{ fontSize: mobile ? 15 : 14, fontWeight: 700, color: "#EAF0FB",
              flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.nombre || "Sin nombre"}
            </span>
            {lead.ag && AG[lead.ag] && (
              <span style={{ fontSize: 9, fontWeight: 700, color: AG[lead.ag].c,
                background: AG[lead.ag].c + "20", padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>
                {AG[lead.ag].n}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#8BA4BC" }}>
              {lead.inversor ? "💼 Inversor" : lead.op || "Comprador"}
            </span>
            {lead.zona && <span style={{ fontSize: 11, color: "#8BA4BC" }}>· {lead.zona}</span>}
            {lead.presup && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#EAF0FB",
                fontFamily: "Georgia,serif", marginLeft: "auto" }}>
                {precioLabel(lead.presup)}
              </span>
            )}
          </div>

          {lead.tel && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#8BA4BC" }}>📞 {lead.tel}</span>
              <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: "#25D366", background: "rgba(37,211,102,0.10)",
                  border: "1px solid rgba(37,211,102,0.30)", textDecoration: "none" }}>
                WA
              </a>
            </div>
          )}

          {pedido && (
            <div style={{ fontSize: 11, color: "#4A6580", marginBottom: 8 }}>{pedido}</div>
          )}

          {nota && (
            <div style={{ background: "#091525", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "6px 10px", marginBottom: 10,
              fontSize: 11, color: "#8BA4BC", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden" }}>
              {nota.emoji} {nota.texto}
            </div>
          )}

          <MatchThumbs matches={matches} properties={properties} />

        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#07111f",
          padding: "7px 14px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#4A6580" }}>
            {lead.dias === null || lead.dias === undefined ? "Sin registro"
              : lead.dias === 0 ? "Contactado hoy" : `Hace ${lead.dias}d`}
          </span>
          {lead.etapa && (
            <span style={{ fontSize: 10, fontWeight: 600,
              color: ECOL[lead.etapa] || "#4A6580",
              background: (ECOL[lead.etapa] || "#4A6580") + "18",
              padding: "2px 8px", borderRadius: 4 }}>
              {lead.etapa}
            </span>
          )}
          <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => updateLead(lead.id, { last_contact_at: new Date().toISOString() })}
              style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                cursor: "pointer", border: `1px solid ${B.ok}30`,
                background: `${B.ok}12`, color: B.ok }}>
              ✓ Hoy
            </button>
            <button onClick={onToggle}
              style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10,
                background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
                color: "#4A6580", cursor: "pointer" }}>
              {open ? "▲" : "▼"}
            </button>
          </div>
        </div>

      </div>

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

              <Section label="Calificación">
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
                    💼 Inversor
                  </span>
                  {lead.inversor && <InversorNota lead={lead} onGuardar={guardarNotaInversor} />}
                </div>
              </Section>

              <Section label="Más acciones">
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
