// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCard
// Consola operativa. Dos velocidades: escaneo / trabajo profundo.
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

// ── Identificador dominante ───────────────────────────────────
function getDominantIcon(lead) {
  if (lead.inversor)             return { icon: "📈", label: "Inversor" };
  if (lead.q_fecha_limite && /semana|mes|agosto|julio|junio|mayo|pronto|r[aá]pido|urgent|vence/i.test(lead.q_fecha_limite))
                                 return { icon: "⚡", label: "Urgente" };
  if (lead.credito === "si")     return { icon: "🏦", label: "Crédito" };
  if (lead.q_tiene_para_vender && !/^(no|nada|ninguno)/i.test(lead.q_tiene_para_vender))
                                 return { icon: "🔄", label: "Permuta" };
  if (lead.ambientes >= 3)       return { icon: "🏠", label: "Familiar" };
  return                                { icon: "👀", label: "Explorador" };
}

// ── Señales contextuales ──────────────────────────────────────
function getContextSignals(lead, matchCount) {
  const signals = [];
  const hoy = new Date().toISOString().slice(0, 10);

  if (lead.last_contact_at && lead.last_contact_at.slice(0, 10) === hoy)
    signals.push({ label: "Contactado hoy", color: "#2E9E6A" });
  if (matchCount === 0)
    signals.push({ label: "Sin matches", color: "#CC2233" });
  if (lead.q_fecha_limite)
    signals.push({ label: lead.q_fecha_limite, color: "#E8A830" });
  if (lead.credito === "si")
    signals.push({ label: "Crédito ✓", color: "#4A8ABE" });

  return signals.slice(0, 3);
}

// ── Pedido resumido ───────────────────────────────────────────
function getPedidoResumen(lead) {
  const parts = [];
  if (lead.ambientes)           parts.push(lead.ambientes + " amb");
  if (lead.m2min)               parts.push("≥" + lead.m2min + "m²");
  if (lead.cochera === "si")    parts.push("cochera");
  if (lead.patio === "si")      parts.push("patio");
  if (lead.balcon === "si")     parts.push("balcón");
  if (lead.credito === "si")    parts.push("apto crédito");
  return parts.join(" · ") || null;
}

// ── Nota clave (más reciente con texto) ──────────────────────
function getNotaClave(lead) {
  const notas = parsearNotas(lead.nota);
  if (!notas.length) return null;
  const sorted = [...notas].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const nota = sorted[0];
  const cfg  = TIPO_NOTA[nota.tipo] || TIPO_NOTA.seguimiento;
  return { texto: nota.texto, emoji: cfg.emoji, color: cfg.color };
}

// ── Collapsible interno ───────────────────────────────────────
function Section({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
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
      {open && (
        <div style={{ padding: "0 14px 12px" }}>{children}</div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function LeadCard({
  lead, mobile, open, onToggle,
  properties, captaciones, mostrados, toggleMostrado,
  updateLead, deleteLead,
  setEtapa, setAgente, setModalPerdido, setConfirmDelete,
}) {
  const [editing,    setEditing]    = useState(false);
  const [buscandoId, setBuscandoId] = useState(null);

  const s      = scoreLead(lead);
  const ag     = AG[lead.ag];
  const ec     = ECOL[lead.etapa] || B.dim;
  const stars  = Math.round((lead.prob || 0) / 20);
  const dom    = getDominantIcon(lead);
  const pedido = getPedidoResumen(lead);
  const nota   = getNotaClave(lead);

  // Matches para señales y preview
  const allProps = useMemo(() => {
    const caps = (captaciones || []).map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
      dir: c.direccion, caracts: c.caracts, activa: true,
      _esCaptacion: true, _tipoCap: c.tipo_captacion,
      _url: c.url,
    }));
    return [...(properties || []), ...caps];
  }, [properties, captaciones]);

  const matches   = useMemo(() => matchLeadProps(lead, allProps), [lead, allProps]);
  const bestMatch = matches[0] || null;
  const signals   = getContextSignals(lead, matches.length);

  // Calificación resumida
  const QKEYS       = ["q_visitas_previas", "q_freno", "q_tiene_para_vender", "q_fecha_limite"];
  const respondidas = QKEYS.filter(k => lead[k]).length;
  const qPct        = Math.round((respondidas / 4) * 100);
  const qColor      = respondidas <= 1 ? "#CC2233" : respondidas <= 2 ? "#E8A830" : respondidas <= 3 ? "#4A8ABE" : "#2E9E6A";

  async function setScore(n) { await updateLead(lead.id, { prob: n * 20 }); }
  async function toggleInversor() { await updateLead(lead.id, { inversor: !lead.inversor }); }
  async function guardarNotaInversor(l, nota) { await updateLead(l.id, { nota_inversor: nota }); }
  async function guardarNota(l, val) { await updateLead(l.id, { nota: val }); }
  async function handleGuardarEdicion(id, data) { await updateLead(id, data); setEditing(false); }

  // Días sin contacto — color
  const diasColor = lead.dias > 7 ? B.hot : lead.dias > 3 ? B.warm : B.ok;
  const diasLabel = lead.dias === 0 ? "hoy"
    : lead.dias === 1 ? "1d"
    : lead.dias + "d";

  return (
    <div style={{ background: B.card,
      border: `1px solid ${open ? B.accent : B.border}`,
      borderLeft: `3px solid ${s.c}`,
      borderRadius: 12, overflow: "hidden",
      transition: "border-color .15s" }}>

      {/* ══════════════════════════════════════════════════
          ZONA 1 — CABECERA (siempre visible, clickeable)
          ════════════════════════════════════════════════ */}
      <div onClick={onToggle} style={{ padding: "10px 14px", cursor: "pointer" }}>

        {/* Fila 1: Identidad + prioridad */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: mobile ? 15 : 14, flexShrink: 0 }} title={dom.label}>
            {dom.icon}
          </span>
          <span style={{ fontSize: mobile ? 15 : 14, fontWeight: 700, color: B.text, flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.nombre}
          </span>
          {ag && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, flexShrink: 0,
              background: ag.bg || "#4A6A90", color: ag.c, fontWeight: 700 }}>{ag.n}</span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {(() => {
              const r = computeRanking(lead, matches.length);
              const pc = r.prioridad >= 75 ? "#D85A30" : r.prioridad >= 50 ? "#EF9F27" : "#378ADD";
              const cc = r.confianza === "alta" ? "#1D9E75" : r.confianza === "media" ? "#EF9F27" : "#4A6A90";
              return <>
                <span style={{ fontSize:16, fontWeight:700, color:pc, fontFamily:"Georgia,serif", lineHeight:1 }}>{r.prioridad}</span>
                <span style={{ fontSize:9, color:cc }}>{r.confianza}</span>
                {r.tags.slice(0,2).map(t => <span key={t.key} style={{ fontSize:11 }} title={t.label}>{t.emoji}</span>)}
              </>;
            })()}
          </div>
          <span style={{ fontSize: 11, color: diasColor, fontWeight: 700, flexShrink: 0 }}>
            {diasLabel}
          </span>
        </div>

        {/* Fila 2: Búsqueda + etapa + temperatura */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {lead.zona && (
            <span style={{ fontSize: 12, color: "#8AAECC" }}>{lead.zona}</span>
          )}
          {lead.tipo && (
            <span style={{ fontSize: 12, color: "#6A8AAE" }}>· {lead.tipo}</span>
          )}
          {lead.presup && (
            <span style={{ fontSize: 12, color: B.accentL, fontFamily: "Georgia,serif", fontWeight: 700 }}>
              · USD {Number(lead.presup).toLocaleString()}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, padding: "1px 7px", borderRadius: 4, flexShrink: 0,
            background: `${ec}18`, color: ec, fontWeight: 600 }}>
            {lead.etapa}
          </span>
          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 4, flexShrink: 0,
            background: s.bg, color: s.c }}>
            {s.label}
          </span>
        </div>

        {/* Fila 3: Señales contextuales */}
        {signals.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
            {signals.map((sig, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10,
                background: sig.color + "15", color: sig.color,
                border: `1px solid ${sig.color}30`, fontWeight: 500 }}>
                {sig.label}
              </span>
            ))}
          </div>
        )}

        {/* Fila 4: Pedido resumido + nota clave + mejor match */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {pedido && (
            <div style={{ fontSize: 11, color: "#6A8AAE" }}>{pedido}</div>
          )}
          {nota && (
            <div style={{ fontSize: 11, color: "#A8C8E8", fontStyle: "italic",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: nota.color }}>{nota.emoji}</span> "{nota.texto}"
            </div>
          )}
          {bestMatch && (
            <div style={{ display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px", borderRadius: 6,
              background: "rgba(42,91,173,0.07)", border: `1px solid ${B.border}` }}>
              <span style={{ fontSize: 11, color: B.text, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                🏠 {bestMatch.tipo} · {bestMatch.zona} · USD {(bestMatch.precio || 0).toLocaleString()}
              </span>
              {matches.length > 1 && (
                <span style={{ fontSize: 10, color: "#4A8ABE", flexShrink: 0, fontWeight: 600 }}>
                  +{matches.length - 1} más
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════
          ZONA 2 — ACCIONES RÁPIDAS (siempre visibles)
          ════════════════════════════════════════════════ */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${B.border}`,
        background: "rgba(8,15,30,0.4)",
        display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>

        {lead.tel && (
          <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
              color: "#25D366", textDecoration: "none" }}>
            WA
          </a>
        )}
        {lead.tel && (
          <a href={`tel:${lead.tel}`}
            onClick={e => e.stopPropagation()}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: `${B.ok}12`, border: `1px solid ${B.ok}30`,
              color: B.ok, textDecoration: "none" }}>
            Llamar
          </a>
        )}
        <button onClick={e => { e.stopPropagation(); updateLead(lead.id, { last_contact_at: new Date().toISOString() }); }}
          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: `${B.ok}12`, border: `1px solid ${B.ok}25`, color: B.ok }}>
          ✅ Contacté
        </button>
        <button onClick={e => {
            e.stopPropagation();
            const msg = genMsgBusqueda(lead);
            const modal = document.createElement("div");
            modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
            modal.innerHTML = `<div style="background:#0F1E35;border:1px solid #2A5BA830;border-radius:14px;padding:22px;max-width:440px;width:100%">
              <div style="font-size:11px;color:#8AAECC;font-weight:600;letter-spacing:1px;margin-bottom:10px">📋 PEDIDO WA</div>
              <textarea id="ped-txt" style="width:100%;height:180px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#E8F0FA;font-size:13px;line-height:1.7;resize:vertical;outline:none;font-family:inherit;box-sizing:border-box">${msg}</textarea>
              <div style="display:flex;gap:8px;margin-top:12px">
                <button id="ped-copy" style="flex:1;padding:10px;border-radius:8px;background:#E8A830;border:none;color:#0F1E35;font-size:13px;font-weight:700;cursor:pointer">Copiar</button>
                <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;border-radius:8px;background:transparent;border:1px solid #2A4060;color:#8AAECC;font-size:13px;cursor:pointer">Cerrar</button>
              </div>
            </div>`;
            document.body.appendChild(modal);
            modal.onclick = e => { if (e.target === modal) modal.remove(); };
            modal.querySelector("#ped-copy").onclick = () => {
              navigator.clipboard.writeText(modal.querySelector("#ped-txt").value);
              modal.querySelector("#ped-copy").textContent = "✓ Copiado";
              setTimeout(() => modal.remove(), 800);
            };
          }}
          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: "rgba(232,168,48,0.1)", border: "1px solid rgba(232,168,48,0.25)", color: "#E8A830" }}>
          📋 Pedido
        </button>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, fontSize: 11,
            background: "transparent", border: `1px solid ${B.border}`,
            color: "#4A6A90", cursor: "pointer" }}>
          {open ? "▲" : "▼"}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONA 3 — CONTENIDO EXPANDIDO
          ════════════════════════════════════════════════ */}
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
              {/* Etapa */}
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

              {/* Notas */}
              <Section label="Notas" defaultOpen>
                <NotaLead lead={lead} onGuardar={guardarNota} />
              </Section>

              {/* Matches */}
              {matches.length > 0 && (
                <Section label={`Matches (${matches.length})`} defaultOpen>
                  <LeadMatches lead={lead} properties={properties} captaciones={captaciones}
                    mostrados={mostrados} toggleMostrado={toggleMostrado} />
                </Section>
              )}

              {/* Buscador */}
              {buscandoId === lead.id && (
                <Section label="Buscador" defaultOpen>
                  <BuscadorPanel lead={lead} />
                </Section>
              )}

              {/* Calificación */}
              <Section label="Calificación">
                <LeadQualification lead={lead} onUpdate={updateLead} />
              </Section>

              {/* Inversor */}
              <Section label="Perfil inversor">
                <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8,
                  background: lead.inversor ? "rgba(155,109,200,0.1)" : "rgba(42,91,173,0.05)",
                  border: `1px solid ${lead.inversor ? "#9B6DC840" : B.border}` }}>
                  <button onClick={toggleInversor}
                    style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", border: "none",
                      position: "relative", flexShrink: 0,
                      background: lead.inversor ? "#9B6DC8" : "#2A3A5A" }}>
                    <div style={{ position: "absolute", top: 2,
                      left: lead.inversor ? 18 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s" }} />
                  </button>
                  <span style={{ fontSize: 11, color: lead.inversor ? "#9B6DC8" : "#8AAECC", fontWeight: 600 }}>
                    💼 Inversor
                  </span>
                  {lead.inversor && <InversorNota lead={lead} onGuardar={guardarNotaInversor} />}
                </div>
              </Section>

              {/* Acciones completas */}
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
