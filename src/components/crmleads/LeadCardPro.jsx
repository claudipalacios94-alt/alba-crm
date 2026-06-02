// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCardPro v3
// Card cerrada + Ficha expandida única (sin LeadCard legacy)
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { AG, ETAPAS, getRecommendedAction } from "../../data/constants.js";
import { computeRanking } from "../../domain/lead.js";
import { parsearNotas, TIPO_NOTA } from "../../domain/nota.js";

// ── Helpers ───────────────────────────────────────────────────

function badgePro(lead, ranking) {
  if (lead.etapa === "Negociación") return { label: "NEGOCIACIÓN", bg: "#e8e3f8", color: "#7c5cc4" };
  if (lead.etapa === "Visita")      return { label: "VISITA",      bg: "#f5eec5", color: "#d99a22" };
  if (lead.etapa === "Calificado")  return { label: "CALIFICADO",  bg: "#d4e5f7", color: "#3a8bc4" };
  if (ranking.prioridad >= 75)     return { label: "URGENTE",     bg: "#fad8d8", color: "#dc5050" };
  if (ranking.prioridad >= 50)     return { label: "ALTA",        bg: "#f7e4cd", color: "#e9823a" };
  if (ranking.prioridad >= 25)     return { label: "MEDIA",       bg: "#f5f0c0", color: "#d99a22" };
  if (lead.dias !== null && lead.dias > 6) return { label: "FRÍO", bg: "#e8edf3", color: "#64748b" };
  return { label: "BAJA", bg: "#d0f2e0", color: "#2d9e6b" };
}

function sideColor(badge) {
  switch (badge.label) {
    case "NEGOCIACIÓN": return "#7c5cc4";
    case "VISITA":      return "#d99a22";
    case "CALIFICADO":  return "#3a8bc4";
    case "URGENTE":     return "#dc5050";
    case "ALTA":        return "#e9823a";
    case "MEDIA":       return "#d99a22";
    case "FRÍO":        return "#64748b";
    default:            return "#b0bec5";
  }
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

function formatFecha(fecha) {
  if (!fecha) return null;
  try {
    const d = new Date(fecha);
    if (isNaN(d)) return String(fecha);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  } catch { return String(fecha); }
}

function generarPedido(lead, formato) {
  const tipo   = lead.tipo   || null;
  const amb    = lead.ambientes ? `${lead.ambientes} amb` : null;
  const linea1 = [tipo, amb].filter(Boolean).join(" · ");
  const zona   = lead.zona   || null;
  const presup = lead.presup ? `USD ${Number(lead.presup).toLocaleString("es-AR")}` : null;
  const reqs   = [
    lead.cochera === "si" && "cochera",
    lead.patio   === "si" && "patio",
    lead.balcon  === "si" && "balcón",
    lead.credito === "si" && "crédito aprobado",
    lead.m2min   && `min ${lead.m2min}m²`,
  ].filter(Boolean);

  if (formato === "discreto") {
    return [
      "Estoy buscando para un cliente activo:",
      [linea1, zona && `zona ${zona}`, presup && `hasta ${presup}`].filter(Boolean).join(", ") + ".",
      reqs.length ? `Ideal con ${reqs.join(", ")}.` : null,
      "Si saben de algo, me escriben por privado.",
    ].filter(Boolean).join("\n");
  }
  if (formato === "colegas") {
    return [
      linea1 ? `Tengo cliente activo buscando ${linea1}` : "Tengo cliente activo",
      zona   ? `📍 Zona: ${zona}` : null,
      presup ? `💰 Hasta ${presup}` : null,
      reqs.length ? `✅ ${reqs.join(" · ")}` : null,
      "Colegas, si tienen algo compatible, coordinamos. Comparto honorarios.",
    ].filter(Boolean).join("\n");
  }
  // formal (default)
  return [
    "BUSCO para cliente activo",
    linea1 || null,
    zona   ? `Zona: ${zona}` : null,
    presup ? `Presupuesto: hasta ${presup}` : null,
    reqs.length ? `Requisitos: ${reqs.join(", ")}` : null,
    "Cualquier dato, me escriben por privado.",
  ].filter(Boolean).join("\n");
}

function getMatchUrl(match) {
  const url = match._url || match.url
    || (typeof match.info === 'object' && match.info !== null
        ? match.info.url || match.info.link
        : null)
    || null;
  return typeof url === 'string' && url ? url : null;
}

function getPropertyHighlights(match) {
  const out = [];

  // Boolean fields
  if (match.cochera === "si" || match.cochera === true) out.push("Cochera");
  if (match.balcon  === "si" || match.balcon  === true) out.push("Balcón");
  if (match.patio   === "si" || match.patio   === true) out.push("Patio");

  // Numeric fields
  if (match.m2tot) out.push(`${match.m2tot} m²`);
  if (match.ambientes) out.push(`${match.ambientes} amb`);

  // Estado / categoría
  if (match.estado)    out.push(match.estado);
  if (match.categoria && match.categoria !== match.estado) out.push(match.categoria);

  // Captación context
  if (match._esCaptacion) {
    if (match._tipoCap === "colega") out.push("Captación colega");
    else if (match._tipoCap === "honorarios") out.push("Honorarios");
  }

  if (out.length >= 4) return out.slice(0, 4);

  // Text sources: separar por coma/punto, tomar fragmentos cortos
  const textSources = [
    typeof match.caracts      === "string" ? match.caracts      : null,
    typeof match.descripcion  === "string" ? match.descripcion  : null,
    typeof match.contenido    === "string" ? match.contenido    : null,
    typeof match.info         === "string" ? match.info         : null,
  ].filter(Boolean);

  for (const src of textSources) {
    if (out.length >= 4) break;
    const parts = src.split(/[,.\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length <= 30);
    for (const p of parts) {
      if (out.length >= 4) break;
      if (!out.includes(p)) out.push(p);
    }
  }

  return out.slice(0, 4);
}

function generarWhatsappMatch(lead, match) {
  const nombre = lead.nombre ? lead.nombre.split(" ")[0] : "te";
  const lines  = [`Hola ${nombre}, te paso una opción que puede encajar:`, ""];

  const encabezado = [match.tipo, match.zona].filter(Boolean).join(" en ");
  if (encabezado) lines.push(encabezado);
  if (match.dir)   lines.push(match.dir);
  if (match.precio) lines.push(`USD ${Number(match.precio).toLocaleString("es-AR")}`);

  const dims = [
    match.ambientes ? `${match.ambientes} amb` : null,
    match.m2tot     ? `${match.m2tot} m²`      : null,
  ].filter(Boolean).join(" · ");
  if (dims) lines.push(dims);

  const highlights = getPropertyHighlights(match);
  if (highlights.length) { lines.push(""); highlights.forEach(h => lines.push(h)); }

  const url = getMatchUrl(match);
  if (url) { lines.push(""); lines.push(url); }

  lines.push("", "¿Querés que la veamos?");
  return lines.join("\n");
}

function getWhatsappUrl(lead, match) {
  const tel = lead.tel ? lead.tel.replace(/\D/g, "") : "";
  if (!tel) return null;
  return `https://wa.me/${tel}?text=${encodeURIComponent(generarWhatsappMatch(lead, match))}`;
}

// ── Sub-componentes ───────────────────────────────────────────

function DataPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <div style={{ fontSize: 10, color: "#5a6f84", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#102033" }}>{value}</div>
    </div>
  );
}

// Estilos compartidos para secciones de la ficha expandida
const SL = {
  fontSize: 10, fontWeight: 800, color: "#5a6f84",
  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
};
const SB = {
  background: "#eef4f8", border: "1px solid #c7d3df",
  borderRadius: 12, padding: "12px 14px",
};

// ── Componente principal ──────────────────────────────────────

export default function LeadCardPro({
  lead, matches = [], isOpen, onToggle,
  properties, captaciones, mostrados, toggleMostrado,
  updateLead, deleteLead,
  setEtapa, setAgente, setModalPerdido, setConfirmDelete,
  isBlurred, hasNewMatch, mobile,
}) {
  const ranking = useMemo(() => computeRanking(lead, matches.length), [lead, matches.length]);
  const badge   = badgePro(lead, ranking);
  const sc      = sideColor(badge);
  const ag      = AG[lead.ag];
  const precio  = precioLabel(lead.presup);

  const matchesConFoto = matches.filter(m => m.fotos?.[0]);

  const [copiadoTipo, setCopiadoTipo] = useState(null);
  const rec   = getRecommendedAction(lead);
  const notas = parsearNotas(lead.nota).slice(-3).reverse();

  function copiar(formato) {
    navigator.clipboard.writeText(generarPedido(lead, formato));
    setCopiadoTipo(formato);
    setTimeout(() => setCopiadoTipo(null), 2000);
  }

  // ── FICHA EXPANDIDA ──────────────────────────────────────────
  if (isOpen) {
    const recUrgColor = rec.urgencia === "alta" ? "#dc5050"
                      : rec.urgencia === "media" ? "#e9823a"
                      : "#46596d";

    return (
      <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
        <div style={{
          background: "#f2f6fa",
          border: "1px solid #c7d3df",
          borderLeft: `4px solid ${sc}`,
          borderRadius: 18,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}>

          {/* ── HEADER OPERATIVO ──────────────────────────────── */}
          <div style={{
            background: "#eef4f8",
            borderBottom: "1px solid #c7d3df",
            padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          }}>
            {/* Identidad */}
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
              color: badge.color, background: badge.bg,
              padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
              {badge.label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#102033",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.nombre || "Sin nombre"}
              </span>
              <span style={{ fontSize: 11, color: "#5a6f84", flexShrink: 0 }}>
                {lead.inversor ? "💼 Inversor" : "🏠 Comprador"}
              </span>
              {lead.zona && (
                <span style={{ fontSize: 11, color: "#46596d", flexShrink: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                  · {lead.zona}
                </span>
              )}
            </div>
            {/* Contacto */}
            {lead.tel && (
              <span style={{ fontSize: 11, color: "#46596d", flexShrink: 0, whiteSpace: "nowrap" }}>
                📞 {lead.tel.slice(0, 13)}{lead.tel.length > 13 ? "…" : ""}
              </span>
            )}
            {lead.tel && (
              <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: "#16a34a", background: "rgba(22,163,74,0.1)",
                  border: "1px solid rgba(22,163,74,0.25)", textDecoration: "none", flexShrink: 0 }}>
                WA
              </a>
            )}
            {/* Acciones rápidas */}
            <button
              onClick={e => { e.stopPropagation(); updateLead(lead.id, { last_contact_at: new Date().toISOString() }); }}
              style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: "1px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.08)",
                color: "#16a34a", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              ✓ Contacté hoy
            </button>
            <button
              onClick={e => { e.stopPropagation(); copiar("formal"); }}
              style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: "1px solid #c7d3df",
                background: copiadoTipo === "formal" ? "#d4e5f7" : "#f2f6fa",
                color: copiadoTipo === "formal" ? "#1763d1" : "#46596d",
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              {copiadoTipo === "formal" ? "✓ Copiado" : "📋 Copiar pedido"}
            </button>
            <button onClick={onToggle}
              style={{ background: "#f2f6fa", border: "1px solid #c7d3df",
                color: "#46596d", borderRadius: 8, padding: "4px 12px",
                cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              ✕ Cerrar
            </button>
          </div>

          {/* ── BODY SCROLLABLE ───────────────────────────────── */}
          <div style={{ maxHeight: "60vh", overflowY: "auto", overflowX: "hidden",
            padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── ROW 1: Brief · Datos · Grupos ─────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
              gap: 12, alignItems: "start",
            }}>

              {/* COL 1: Brief comercial + Gestión */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Brief comercial */}
                <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={SL}>Brief comercial</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: recUrgColor,
                      background: `${recUrgColor}18`, padding: "2px 9px", borderRadius: 20,
                      border: `1px solid ${recUrgColor}30`, flexShrink: 0 }}>
                      {rec.accion}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: recUrgColor, letterSpacing: "0.06em" }}>
                      {rec.urgencia?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#46596d", lineHeight: 1.45 }}>{rec.motivo}</div>
                  <div style={{ fontSize: 11, color: diasColor(lead.dias), fontWeight: 500 }}>
                    Último contacto: {diasLabel(lead.dias)}
                  </div>
                  {lead.proxaccion && (
                    <div style={{ fontSize: 11, color: "#5a6f84", padding: "6px 10px",
                      background: "#f2f6fa", borderRadius: 7, border: "1px solid #c7d3df",
                      display: "flex", flexDirection: "column", gap: 2 }}>
                      <span>📌 {lead.proxaccion}</span>
                      {lead.proxaccion_tipo && (
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{lead.proxaccion_tipo}</span>
                      )}
                      {lead.proxaccion_fecha && (
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          {formatFecha(lead.proxaccion_fecha)}
                        </span>
                      )}
                    </div>
                  )}
                  {lead.nota_imp && (
                    <div style={{ fontSize: 11, color: "#dc5050", padding: "5px 9px",
                      background: "#fad8d8", borderRadius: 7, border: "1px solid #f5c0c0" }}>
                      ⚠️ {lead.nota_imp}
                    </div>
                  )}
                </div>

                {/* Gestión */}
                <div style={SB}>
                  <div style={SL}>Gestión</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "#5a6f84", fontWeight: 700,
                        display: "block", marginBottom: 4,
                        textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Etapa
                      </label>
                      <select
                        value={lead.etapa || ""}
                        onChange={e => { e.stopPropagation(); setEtapa(lead.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "100%", padding: "5px 8px", borderRadius: 7,
                          border: "1px solid #c7d3df", background: "#f2f6fa",
                          color: "#102033", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", outline: "none" }}>
                        {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#5a6f84", fontWeight: 700,
                        display: "block", marginBottom: 4,
                        textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Agente
                      </label>
                      <select
                        value={lead.ag || ""}
                        onChange={e => { e.stopPropagation(); setAgente(lead.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "100%", padding: "5px 8px", borderRadius: 7,
                          border: "1px solid #c7d3df", background: "#f2f6fa",
                          color: "#102033", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", outline: "none" }}>
                        <option value="">Sin asignar</option>
                        {Object.entries(AG).map(([key, val]) => (
                          <option key={key} value={key}>{val.n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* COL 2: Datos del pedido */}
              <div style={SB}>
                <div style={SL}>Datos del pedido</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                  {precio                && <DataPill label="Presupuesto" value={precio} />}
                  {lead.tipo             && <DataPill label="Tipo"        value={lead.tipo} />}
                  {lead.op               && <DataPill label="Operación"   value={lead.op} />}
                  {lead.ambientes        && <DataPill label="Ambientes"   value={`${lead.ambientes} amb`} />}
                  {lead.zona             && <DataPill label="Zona"        value={lead.zona} />}
                  {lead.m2min            && <DataPill label="M² mín."     value={`${lead.m2min} m²`} />}
                  {lead.cochera === "si" && <DataPill label="Cochera"     value="✓ Sí" />}
                  {lead.balcon  === "si" && <DataPill label="Balcón"      value="✓ Sí" />}
                  {lead.patio   === "si" && <DataPill label="Patio"       value="✓ Sí" />}
                  {lead.credito === "si" && <DataPill label="Crédito"     value="✓ Aprobado" />}
                  {lead.etapa            && <DataPill label="Etapa"       value={lead.etapa} />}
                  {ag                    && <DataPill label="Agente"      value={ag.n} />}
                </div>
              </div>

              {/* COL 3: Pedido para grupos */}
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={SL}>Pedido para grupos</div>
                <pre style={{ margin: 0, fontSize: 11, color: "#102033", lineHeight: 1.6,
                  whiteSpace: "pre-wrap", background: "#f2f6fa", borderRadius: 8,
                  padding: "8px 10px", border: "1px solid #c7d3df", fontFamily: "inherit",
                  maxHeight: 130, overflowY: "auto" }}>
                  {generarPedido(lead, "formal")}
                </pre>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {[
                    { fmt: "formal",   label: "Pedido" },
                    { fmt: "discreto", label: "Discreto" },
                    { fmt: "colegas",  label: "Colegas" },
                  ].map(({ fmt, label }) => (
                    <button key={fmt}
                      onClick={e => { e.stopPropagation(); copiar(fmt); }}
                      style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                        border: "1px solid #c7d3df", flex: 1,
                        background: copiadoTipo === fmt ? "#d4e5f7" : "#f2f6fa",
                        color: copiadoTipo === fmt ? "#1763d1" : "#46596d",
                        cursor: "pointer", whiteSpace: "nowrap" }}>
                      {copiadoTipo === fmt ? "✓ Copiado" : label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ROW 2: Matches ────────────────────────────── */}
            {matches.length > 0 && (
              <div style={SB}>
                <div style={SL}>Propiedades compatibles · {matches.length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matches.slice(0, 4).map(m => {
                    const mKey    = `${lead.id}-${m.id}`;
                    const visto   = mostrados.has(mKey);
                    const esCap   = String(m.id).startsWith("cap-");
                    const waUrl   = getWhatsappUrl(lead, m);
                    const propUrl = getMatchUrl(m);
                    const chips   = getPropertyHighlights(m);
                    return (
                      <div key={m.id} style={{
                        padding: "8px 10px", background: "#e4edf6",
                        borderRadius: 8, border: "1px solid #c5d8eb",
                        display: "flex", flexDirection: "column", gap: 4,
                      }}>
                        {/* Línea 1: Tipo · Zona · Precio + botones */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6,
                          flexWrap: "wrap", minWidth: 0 }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600,
                            color: "#102033", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {[m.tipo, m.zona,
                              m.precio ? `USD ${Number(m.precio).toLocaleString("es-AR")}` : null,
                            ].filter(Boolean).join(" · ")}
                          </span>
                          {esCap && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#7c5cc4",
                              background: "#e8e3f8", padding: "1px 5px",
                              borderRadius: 4, flexShrink: 0 }}>
                              {m._tipoCap === "colega" ? "colega" : "captación"}
                            </span>
                          )}
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            {waUrl && (
                              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10,
                                  fontWeight: 700, color: "#16a34a",
                                  background: "rgba(22,163,74,0.1)",
                                  border: "1px solid rgba(22,163,74,0.3)",
                                  textDecoration: "none", whiteSpace: "nowrap" }}>
                                WA
                              </a>
                            )}
                            {propUrl && (
                              <a href={propUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10,
                                  fontWeight: 700, color: "#3a8bc4",
                                  background: "rgba(58,139,196,0.1)",
                                  border: "1px solid rgba(58,139,196,0.3)",
                                  textDecoration: "none", whiteSpace: "nowrap" }}>
                                Ver
                              </a>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); toggleMostrado(lead.id, m.id); }}
                              style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6,
                                border: `1px solid ${visto ? "#c7d3df" : "#3a8bc4"}`,
                                background: visto ? "#f2f6fa" : "#d4e5f7",
                                color: visto ? "#5a6f84" : "#1763d1",
                                cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {visto ? "✓ Visto" : "Marcar"}
                            </button>
                          </div>
                        </div>
                        {/* Línea 2: Dirección */}
                        {m.dir && (
                          <div style={{ fontSize: 11, color: "#46596d" }}>
                            {m.dir.slice(0, 50)}{m.dir.length > 50 ? "…" : ""}
                          </div>
                        )}
                        {/* Línea 3: chips de características */}
                        {chips.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {chips.map((ch, i) => (
                              <span key={i} style={{ fontSize: 10, color: "#46596d",
                                background: "#f2f6fa", border: "1px solid #c7d3df",
                                borderRadius: 20, padding: "1px 7px", fontWeight: 500 }}>
                                {ch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {matches.length > 4 && (
                    <div style={{ fontSize: 11, color: "#3a8bc4", fontWeight: 600, padding: "3px 4px" }}>
                      +{matches.length - 4} más compatibles
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ROW 3: Notas + Calificación/Perfil ────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}>

              {/* Notas — últimas 3, solo lectura */}
              <div style={SB}>
                <div style={SL}>Notas recientes</div>
                {notas.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                    Sin notas recientes
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {notas.map((n, i) => {
                      const cfg   = TIPO_NOTA[n.tipo] || TIPO_NOTA.seguimiento;
                      const fecha = n.createdAt
                        ? new Date(n.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                        : "";
                      return (
                        <div key={i} style={{
                          display: "flex", gap: 8, alignItems: "flex-start",
                          padding: "7px 10px", background: "#f2f6fa", borderRadius: 8,
                          borderTop: "1px solid #c7d3df", borderRight: "1px solid #c7d3df",
                          borderBottom: "1px solid #c7d3df", borderLeft: `3px solid ${cfg.color}`,
                        }}>
                          <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.4 }}>{cfg.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color,
                                textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {cfg.label}
                              </span>
                              {fecha && <span style={{ fontSize: 9, color: "#94a3b8" }}>{fecha}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: "#102033", lineHeight: 1.4 }}>{n.texto}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calificación (comprador) o Perfil inversor */}
              {lead.inversor ? (
                <div style={SB}>
                  <div style={SL}>Perfil inversor</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lead.nota_inversor ? (
                      <div style={{ fontSize: 12, color: "#102033", lineHeight: 1.5,
                        padding: "7px 10px", background: "#f2f6fa",
                        borderRadius: 8, border: "1px solid #c7d3df" }}>
                        {lead.nota_inversor}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                        Sin perfil cargado
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                      {precio    && <DataPill label="Presupuesto"  value={precio} />}
                      {lead.tipo && <DataPill label="Tipo buscado" value={lead.tipo} />}
                      {lead.zona && <DataPill label="Zona"         value={lead.zona} />}
                      {lead.op   && <DataPill label="Operación"    value={lead.op} />}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={SB}>
                  <div style={SL}>Calificación</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {[
                      { key: "q_visitas_previas",   icon: "🕐", label: "¿Cuánto lleva buscando?" },
                      { key: "q_freno",             icon: "🚧", label: "¿Qué le frenó antes?" },
                      { key: "q_tiene_para_vender", icon: "🔄", label: "¿Tiene algo para vender?" },
                      { key: "q_fecha_limite",      icon: "📅", label: "¿Hay fecha límite?" },
                    ].map(s => (
                      <div key={s.key} style={{ display: "flex", alignItems: "flex-start", gap: 6,
                        padding: "5px 8px", borderRadius: 7,
                        background: lead[s.key] ? "rgba(58,139,196,0.06)" : "rgba(148,163,184,0.07)",
                        border: `1px solid ${lead[s.key] ? "#c5d8eb" : "#dde3ec"}` }}>
                        <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: "#5a6f84", fontWeight: 600 }}>{s.label}</div>
                          {lead[s.key] ? (
                            <div style={{ fontSize: 11, color: "#102033", marginTop: 1, lineHeight: 1.4 }}>
                              {lead[s.key]}
                            </div>
                          ) : (
                            <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>sin dato</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── ROW 4: Más acciones ────────────────────────── */}
            <div style={{ ...SB, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#5a6f84",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Acciones
              </span>
              <button
                onClick={e => { e.stopPropagation(); setModalPerdido(lead); }}
                style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: "1px solid rgba(233,130,58,0.35)", background: "#fff7f0",
                  color: "#e9823a", cursor: "pointer" }}>
                Marcar perdido
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(lead); }}
                style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: "1px solid rgba(220,80,80,0.35)", background: "#fff5f5",
                  color: "#dc5050", cursor: "pointer" }}>
                Eliminar lead
              </button>
              <span style={{ fontSize: 10, color: "#b0bec5", marginLeft: "auto", fontStyle: "italic" }}>
                Edición de notas · próxima versión
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── CARD CERRADA ─────────────────────────────────────────────
  return (
    <div
      onClick={onToggle}
      style={{
        background: "#f2f6fa",
        border: `1px solid ${hasNewMatch ? "#3b82f6" : "#c7d3df"}`,
        borderLeft: `4px solid ${hasNewMatch ? "#3b82f6" : sc}`,
        borderRadius: 14,
        padding: "12px 14px",
        cursor: "pointer",
        opacity: isBlurred ? 0.38 : 1,
        transition: "opacity 0.15s, box-shadow 0.15s",
        boxShadow: hasNewMatch
          ? "0 0 0 3px rgba(59,130,246,0.12), 0 2px 8px rgba(0,0,0,0.05)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 0,
        minHeight: 0,
      }}
      onMouseEnter={e => {
        if (!isBlurred) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={e => {
        if (!isBlurred) e.currentTarget.style.boxShadow = hasNewMatch
          ? "0 0 0 3px rgba(59,130,246,0.12), 0 2px 10px rgba(0,0,0,0.05)"
          : "0 1px 4px rgba(0,0,0,0.04)";
      }}
    >
      {/* Badge + nuevo match */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
          color: badge.color, background: badge.bg,
          padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>
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
        <div style={{ fontSize: 13, fontWeight: 700, color: "#102033", lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.nombre || "Sin nombre"}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 1,
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px" }}>
        {precio     && <DataPill label="Presupuesto" value={precio} />}
        {lead.tipo  && <DataPill label="Tipo"        value={lead.tipo} />}
        {lead.ambientes && <DataPill label="Ambientes" value={`${lead.ambientes} amb`} />}
        {lead.cochera === "si" && <DataPill label="Cochera" value="✓ Sí" />}
        {lead.credito === "si" && <DataPill label="Crédito" value="✓ Aprobado" />}
        {lead.etapa  && <DataPill label="Etapa"      value={lead.etapa} />}
      </div>

      {/* Matches strip */}
      <div style={{
        background: matches.length > 0 ? "#e4edf6" : "#eef4f8",
        border: `1px solid ${matches.length > 0 ? "#c5d8eb" : "#c7d3df"}`,
        borderRadius: 8, padding: "5px 9px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
          color: matches.length > 0 ? "#1763d1" : "#94a3b8" }}>
          {matches.length === 0
            ? "0 MATCHES"
            : `${matches.length} MATCH${matches.length !== 1 ? "ES" : ""}`}
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, minWidth: 0 }}>
          {matchesConFoto.slice(0, 2).map(m => (
            <img key={m.id} src={Array.isArray(m.fotos) ? m.fotos[0] : m.fotos}
              alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover",
                border: "1px solid #c7d3df", flexShrink: 0 }} />
          ))}
          {matchesConFoto.length > 2 && (
            <span style={{ fontSize: 10, color: "#5a6f84", background: "#f2f6fa",
              borderRadius: 6, padding: "2px 6px", fontWeight: 600, flexShrink: 0 }}>
              +{matchesConFoto.length - 2}
            </span>
          )}
          {matches.length > 0 && matchesConFoto.length === 0 && (
            <span style={{ fontSize: 10, color: "#5a6f84" }}>
              {matches.length === 1 ? "1 prop sin foto" : `${matches.length} props sin foto`}
            </span>
          )}
        </div>
        {matches.length > 0 && (
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{ fontSize: 10, color: "#1763d1", background: "#d4e5f7",
              border: "1px solid #c5d8eb", borderRadius: 6, padding: "2px 8px",
              cursor: "pointer", flexShrink: 0, fontWeight: 600 }}>
            Ver →
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            background: ag.bg, border: `2px solid ${ag.c}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: ag.c, flexShrink: 0,
          }}>
            {lead.ag}
          </div>
        )}
      </div>
    </div>
  );
}
