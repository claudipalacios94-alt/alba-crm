// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCardPro v4
// Card cerrada + Ficha expandida (centro operativo)
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { AG, ETAPAS, TIPOS_PROP_LEAD, getRecommendedAction } from "../../data/constants.js";
import { computeRanking } from "../../domain/lead.js";
import { parsearNotas, serializarNotas, crearNota, TIPO_NOTA } from "../../domain/nota.js";
import { supabase } from "../../hooks/supabaseClient.js";

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
    || (typeof match.info === "object" && match.info !== null
        ? match.info.url || match.info.link
        : null)
    || null;
  return typeof url === "string" && url ? url : null;
}

function _textoLibre(match) {
  return [
    typeof match.caracts     === "string" ? match.caracts     : "",
    typeof match.descripcion === "string" ? match.descripcion : "",
    typeof match.contenido   === "string" ? match.contenido   : "",
    typeof match.info        === "string" ? match.info        : "",
  ].join(" ");
}

function getAmbientesLabel(match) {
  if (match.ambientes) return `${match.ambientes} amb`;
  const m = _textoLibre(match).match(/(\d+)\s*amb(?:ientes?)?/i);
  return m ? `${m[1]} amb` : null;
}

function getM2Label(match) {
  if (match.m2cub)               return `${match.m2cub} m² cub`;
  if (match.m2tot)               return `${match.m2tot} m²`;
  if (match.metros)              return `${match.metros} m²`;
  if (match.superficie_cubierta) return `${match.superficie_cubierta} m² cub`;
  if (match.superficie_total)    return `${match.superficie_total} m²`;
  if (match.superficie)          return `${match.superficie} m²`;
  if (typeof match.info === "object" && match.info !== null) {
    if (match.info.m2cub) return `${match.info.m2cub} m² cub`;
    if (match.info.m2tot) return `${match.info.m2tot} m²`;
    if (match.info.m2)    return `${match.info.m2} m²`;
  }
  const text = _textoLibre(match);
  const cubMatch = text.match(/(\d+)\s*m[²2]?t?s?\.?\s*(?:cub(?:iertos?)?)/i);
  if (cubMatch) return `${cubMatch[1]} m² cub`;
  const totMatch = text.match(/(\d+)\s*(?:m[²2]|metros?|mts?)(?!\w)/i);
  if (totMatch) return `${totMatch[1]} m²`;
  return null;
}

const HIGHLIGHTS_PUBLICOS = [
  "Luminoso", "Buen estado", "Patio", "Balcón", "Cochera",
  "Al frente", "Vista abierta", "Reciclado", "Apto crédito",
  "A una cuadra del mar", "Bajas expensas",
];

function getPropertyHighlights(match) {
  const found = [];
  if ((match.cochera === "si" || match.cochera === true) && !found.includes("Cochera")) found.push("Cochera");
  if ((match.balcon  === "si" || match.balcon  === true) && !found.includes("Balcón"))  found.push("Balcón");
  if ((match.patio   === "si" || match.patio   === true) && !found.includes("Patio"))   found.push("Patio");
  if (found.length >= 3) return found;
  const text = _textoLibre(match).toLowerCase();
  for (const h of HIGHLIGHTS_PUBLICOS) {
    if (found.length >= 3) break;
    if (!found.includes(h) && text.includes(h.toLowerCase())) found.push(h);
  }
  return found;
}

function generarWhatsappMatch(lead, match) {
  const lines = [];
  const encabezado = [match.tipo, match.zona].filter(Boolean).join(" · ");
  if (encabezado) lines.push(encabezado);
  if (match.dir)    lines.push(match.dir);
  if (match.precio) lines.push(`USD ${Number(match.precio).toLocaleString("es-AR")}`);
  const dims = [getAmbientesLabel(match), getM2Label(match)].filter(Boolean).join(" · ");
  if (dims) lines.push(dims);
  const highlights = getPropertyHighlights(match);
  if (highlights.length) lines.push(highlights.join(" · "));
  const url = getMatchUrl(match);
  if (url) lines.push(url);
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

// Estilos compartidos para secciones
const SL = {
  fontSize: 10, fontWeight: 800, color: "#5a6f84",
  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
};
const SB = {
  background: "#eef4f8", border: "1px solid #c7d3df",
  borderRadius: 12, padding: "12px 14px",
};

// Campos de calificación (definidos a nivel de módulo para evitar recreación)
const CALIF_SENALES = [
  { key: "q_visitas_previas",   icon: "🕐", label: "¿Cuánto lleva buscando?",  ph: "ej: 3 meses, desde enero..." },
  { key: "q_freno",             icon: "🚧", label: "¿Qué le frenó antes?",     ph: "ej: precio, ubicación..." },
  { key: "q_tiene_para_vender", icon: "🔄", label: "¿Tiene algo para vender?", ph: "ej: no / depto en Centro..." },
  { key: "q_fecha_limite",      icon: "📅", label: "¿Hay fecha límite?",       ph: "ej: vence alquiler agosto..." },
];

// ── AI helper (módulo-level, sin estado React) ────────────────
async function fetchAI(prompt) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  const resp = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.content?.[0]?.text || "Sin respuesta";
}

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

  // ── State ─────────────────────────────────────────────────
  const [copiadoTipo,  setCopiadoTipo]  = useState(null);
  // datos editables
  const [editDatos,    setEditDatos]    = useState(false);
  const [editBuf,      setEditBuf]      = useState({});
  const [editSaving,   setEditSaving]   = useState(false);
  // notas
  const [notaTexto,    setNotaTexto]    = useState("");
  const [notaTipo,     setNotaTipo]     = useState("seguimiento");
  const [notasSaving,  setNotasSaving]  = useState(false);
  // calificación
  const [califEdit,    setCalifEdit]    = useState(null);
  const [califVal,     setCalifVal]     = useState("");
  const [califSaving,  setCalifSaving]  = useState(false);
  // inversor
  const [editInv,      setEditInv]      = useState(false);
  const [invBuf,       setInvBuf]       = useState("");
  // IA
  const [aiLoading,    setAiLoading]    = useState(null);
  const [aiResult,     setAiResult]     = useState(null);
  const [aiCopiado,    setAiCopiado]    = useState(false);
  // pedido para colegas
  const [pcFormat,     setPcFormat]     = useState("formal");
  const [pcText,       setPcText]       = useState(() => lead.pedido_colegas || generarPedido(lead, "formal"));
  const [pcSaved,      setPcSaved]      = useState(false);
  const [pcCopiado,    setPcCopiado]    = useState(false);

  const rec        = getRecommendedAction(lead);
  const todasNotas = parsearNotas(lead.nota);

  // ── Acciones ─────────────────────────────────────────────
  function copiar(formato) {
    navigator.clipboard.writeText(generarPedido(lead, formato));
    setCopiadoTipo(formato);
    setTimeout(() => setCopiadoTipo(null), 2000);
  }

  async function guardarNota() {
    if (!notaTexto.trim()) return;
    setNotasSaving(true);
    const nuevas = [...todasNotas, crearNota(notaTexto, notaTipo)];
    await updateLead(lead.id, { nota: serializarNotas(nuevas) });
    setNotaTexto("");
    setNotaTipo("seguimiento");
    setNotasSaving(false);
  }

  async function borrarNota(notaId) {
    const nuevas = todasNotas.filter(n => n.id !== notaId);
    await updateLead(lead.id, { nota: serializarNotas(nuevas) });
  }

  function startEditDatos() {
    setEditBuf({
      nombre:           lead.nombre           || "",
      tel:              lead.tel              || "",
      zona:             lead.zona             || "",
      presup:           lead.presup           || "",
      tipo:             lead.tipo             || "",
      ambientes:        lead.ambientes        || "",
      m2min:            lead.m2min            || "",
      cochera:          lead.cochera          || "",
      balcon:           lead.balcon           || "",
      patio:            lead.patio            || "",
      proxaccion:       lead.proxaccion       || "",
      proxaccion_tipo:  lead.proxaccion_tipo  || "",
      proxaccion_fecha: lead.proxaccion_fecha ? lead.proxaccion_fecha.slice(0, 10) : "",
      last_contact_at:  lead.last_contact_at  ? lead.last_contact_at.slice(0, 10)  : "",
    });
    setEditDatos(true);
  }

  async function saveEditDatos() {
    setEditSaving(true);
    const updates = { ...editBuf };
    updates.presup    = updates.presup    ? Number(updates.presup)    : null;
    updates.ambientes = updates.ambientes ? Number(updates.ambientes) : null;
    updates.m2min     = updates.m2min     ? Number(updates.m2min)     : null;
    updates.cochera   = updates.cochera   === "si" ? "si" : null;
    updates.balcon    = updates.balcon    === "si" ? "si" : null;
    updates.patio     = updates.patio     === "si" ? "si" : null;
    if (!updates.proxaccion_fecha) updates.proxaccion_fecha = null;
    updates.last_contact_at = updates.last_contact_at
      ? new Date(updates.last_contact_at + "T12:00:00").toISOString()
      : null;
    await updateLead(lead.id, updates);
    setEditDatos(false);
    setEditSaving(false);
  }

  async function guardarCalif(key) {
    setCalifSaving(true);
    await updateLead(lead.id, { [key]: califVal.trim() || null });
    setCalifEdit(null);
    setCalifSaving(false);
  }

  async function borrarCalif(key) {
    await updateLead(lead.id, { [key]: null });
  }

  async function guardarInversor() {
    await updateLead(lead.id, { nota_inversor: invBuf.trim() || null });
    setEditInv(false);
  }

  async function callAI(type) {
    setAiLoading(type);
    setAiResult(null);
    try {
      const notasRecientes = todasNotas.slice(-2).map(n => `[${n.tipo}] ${n.texto}`).join(" | ");
      const reqs = [
        lead.cochera  === "si" && "cochera",
        lead.balcon   === "si" && "balcón",
        lead.patio    === "si" && "patio",
        lead.credito  === "si" && "crédito aprobado",
        lead.m2min    && `min ${lead.m2min}m²`,
      ].filter(Boolean).join(", ");
      let prompt = "";

      if (type === "pedido") {
        prompt = `Sos asistente inmobiliario de Alba Inversiones en Mar del Plata.
Mejorá este pedido para compartir en grupos de WhatsApp de colegas. Máximo 5 líneas. Profesional y claro.

Lead: ${lead.nombre || "Sin nombre"}
Tipo: ${lead.tipo || "—"} | Zona: ${lead.zona || "—"} | Presup: ${lead.presup ? `USD ${lead.presup}` : "—"}
Ambientes: ${lead.ambientes || "—"} | Requisitos: ${reqs || "ninguno"}
Notas: ${notasRecientes || "sin notas"}

Respondé con:
1. Pedido mejorado (texto listo para copiar)
2. Datos faltantes útiles a completar`;

      } else if (type === "whatsapp") {
        const m = matches[0];
        if (m) {
          const dims = [getAmbientesLabel(m), getM2Label(m)].filter(Boolean).join(" · ");
          const hl   = getPropertyHighlights(m).join(" · ");
          prompt = `Generá un mensaje de WhatsApp para ${lead.nombre || "el cliente"} presentándole esta propiedad.
Máximo 5 líneas. Español rioplatense, profesional y cordial. Terminá con pregunta abierta.

Propiedad: ${[m.tipo, m.zona, m.dir, m.precio ? `USD ${Number(m.precio).toLocaleString("es-AR")}` : null].filter(Boolean).join(" · ")}
Características: ${[dims, hl].filter(Boolean).join(" · ")}`;
        } else {
          prompt = `Generá un mensaje de WhatsApp de seguimiento para ${lead.nombre || "el cliente"} que busca ${lead.tipo || "una propiedad"} en ${lead.zona || "Mar del Plata"}.
Máximo 4 líneas. Amigable y profesional, español rioplatense. Terminá con pregunta abierta.`;
        }

      } else {
        prompt = `Sos asistente comercial inmobiliario. Determiná la próxima acción concreta para este lead.

Lead: ${lead.nombre || "Sin nombre"} | Etapa: ${lead.etapa || "—"} | Contacto: ${lead.dias !== null ? `hace ${lead.dias} días` : "sin registro"}
Notas: ${notasRecientes || "ninguna"} | Próx. acción: ${lead.proxaccion || "ninguna"}
Calificación: visitas=${lead.q_visitas_previas || "—"} | freno=${lead.q_freno || "—"} | fecha límite=${lead.q_fecha_limite || "—"}

Respondé con:
1. Acción: (texto breve)
2. Urgencia: alta/media/baja
3. Motivo: (1 oración)
4. Texto sugerido: (opcional, máx 2 líneas)`;
      }

      const text = await fetchAI(prompt);
      setAiResult({ type, text });
    } catch (err) {
      setAiResult({ type, text: `Error: ${err.message}` });
    } finally {
      setAiLoading(null);
    }
  }

  async function guardarPedido() {
    await updateLead(lead.id, {
      pedido_colegas:            pcText,
      pedido_colegas_updated_at: new Date().toISOString(),
    });
    setPcSaved(true);
    setTimeout(() => setPcSaved(false), 2000);
  }

  // ── FICHA EXPANDIDA ──────────────────────────────────────────
  if (isOpen) {
    const recUrgColor = rec.urgencia === "alta" ? "#dc5050"
                      : rec.urgencia === "media" ? "#e9823a"
                      : "#46596d";

    const inp = {
      width: "100%", padding: "5px 8px", borderRadius: 7,
      border: "1px solid #c7d3df", background: "#f9fbfd",
      color: "#102033", fontSize: 11, outline: "none", boxSizing: "border-box",
    };
    const lbl = {
      fontSize: 10, color: "#5a6f84", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.06em",
      display: "block", marginBottom: 3,
    };
    const btnSm = {
      fontSize: 10, padding: "2px 8px", borderRadius: 6,
      border: "1px solid #c7d3df", background: "#f2f6fa",
      color: "#46596d", cursor: "pointer",
    };

    const califRespondidas = CALIF_SENALES.filter(s => lead[s.key]).length;

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
            background: "#eef4f8", borderBottom: "1px solid #c7d3df",
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          }}>
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
            {lead.tel && (
              <span style={{ fontSize: 11, color: "#46596d", flexShrink: 0, whiteSpace: "nowrap" }}>
                📞 {lead.tel.slice(0, 13)}{lead.tel.length > 13 ? "…" : ""}
              </span>
            )}
            {lead.tel && (
              <a href={`https://wa.me/${lead.tel.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: "#16a34a", background: "rgba(22,163,74,0.1)",
                  border: "1px solid rgba(22,163,74,0.25)", textDecoration: "none", flexShrink: 0 }}>
                WA
              </a>
            )}
            <button
              onClick={e => { e.stopPropagation(); updateLead(lead.id, { last_contact_at: new Date().toISOString() }); }}
              style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: "1px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.08)",
                color: "#16a34a", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              ✓ Contacté hoy
            </button>
            <button onClick={e => { e.stopPropagation(); copiar("formal"); }}
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
          <div style={{ maxHeight: "65vh", overflowY: "auto", overflowX: "hidden",
            padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── ROW 1: Brief · Datos · Grupos ─────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
              gap: 12, alignItems: "start",
            }}>
              {/* COL 1: Brief + Gestión */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

                <div style={SB}>
                  <div style={SL}>Gestión</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={lbl}>Etapa</label>
                      <select value={lead.etapa || ""}
                        onChange={e => { e.stopPropagation(); setEtapa(lead.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ ...inp, cursor: "pointer", fontWeight: 600 }}>
                        {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Agente</label>
                      <select value={lead.ag || ""}
                        onChange={e => { e.stopPropagation(); setAgente(lead.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ ...inp, cursor: "pointer", fontWeight: 600 }}>
                        <option value="">Sin asignar</option>
                        {Object.entries(AG).map(([key, val]) => (
                          <option key={key} value={key}>{val.n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* COL 2: Datos del pedido (con modo edición) */}
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
                  <div style={{ ...SL, marginBottom: 0 }}>Datos del pedido</div>
                  {!editDatos ? (
                    <button onClick={startEditDatos}
                      style={{ ...btnSm, color: "#3a8bc4", fontWeight: 600 }}>
                      ✏️ Editar
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={saveEditDatos} disabled={editSaving}
                        style={{ fontSize: 10, padding: "2px 10px", borderRadius: 6,
                          border: "none", background: "#3a8bc4",
                          color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        {editSaving ? "..." : "Guardar"}
                      </button>
                      <button onClick={() => setEditDatos(false)} style={btnSm}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {editDatos ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      <div>
                        <label style={lbl}>Nombre</label>
                        <input style={inp} value={editBuf.nombre}
                          onChange={e => setEditBuf(b => ({ ...b, nombre: e.target.value }))} />
                      </div>
                      <div>
                        <label style={lbl}>Teléfono</label>
                        <input style={inp} value={editBuf.tel}
                          onChange={e => setEditBuf(b => ({ ...b, tel: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      <div>
                        <label style={lbl}>Zona</label>
                        <input style={inp} value={editBuf.zona}
                          onChange={e => setEditBuf(b => ({ ...b, zona: e.target.value }))} />
                      </div>
                      <div>
                        <label style={lbl}>Presupuesto (USD)</label>
                        <input style={inp} type="number" value={editBuf.presup}
                          onChange={e => setEditBuf(b => ({ ...b, presup: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      <div>
                        <label style={lbl}>Tipo</label>
                        <select style={{ ...inp, cursor: "pointer" }} value={editBuf.tipo}
                          onChange={e => setEditBuf(b => ({ ...b, tipo: e.target.value }))}>
                          <option value="">—</option>
                          {TIPOS_PROP_LEAD.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Ambientes</label>
                        <input style={inp} type="number" min="1" value={editBuf.ambientes}
                          onChange={e => setEditBuf(b => ({ ...b, ambientes: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                      <div>
                        <label style={lbl}>M² mín</label>
                        <input style={inp} type="number" value={editBuf.m2min}
                          onChange={e => setEditBuf(b => ({ ...b, m2min: e.target.value }))} />
                      </div>
                      {[{ k: "cochera", l: "Cochera" }, { k: "balcon", l: "Balcón" }, { k: "patio", l: "Patio" }].map(({ k, l }) => (
                        <div key={k}>
                          <label style={lbl}>{l}</label>
                          <select style={{ ...inp, cursor: "pointer" }} value={editBuf[k]}
                            onChange={e => setEditBuf(b => ({ ...b, [k]: e.target.value }))}>
                            <option value="">No</option>
                            <option value="si">Sí</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label style={lbl}>Último contacto</label>
                      <input style={inp} type="date" value={editBuf.last_contact_at}
                        onChange={e => setEditBuf(b => ({ ...b, last_contact_at: e.target.value }))} />
                    </div>
                    <div>
                      <label style={lbl}>Próxima acción</label>
                      <input style={inp} value={editBuf.proxaccion}
                        onChange={e => setEditBuf(b => ({ ...b, proxaccion: e.target.value }))}
                        placeholder="ej: Llamar para confirmar visita" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      <div>
                        <label style={lbl}>Tipo de acción</label>
                        <input style={inp} value={editBuf.proxaccion_tipo}
                          onChange={e => setEditBuf(b => ({ ...b, proxaccion_tipo: e.target.value }))}
                          placeholder="ej: Llamada" />
                      </div>
                      <div>
                        <label style={lbl}>Fecha acción</label>
                        <input style={inp} type="date" value={editBuf.proxaccion_fecha}
                          onChange={e => setEditBuf(b => ({ ...b, proxaccion_fecha: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", marginTop: 6 }}>
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
                )}
              </div>

              {/* COL 3: Pedido para grupos */}
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={SL}>Pedido para grupos</div>
                {/* Variantes — cargan texto en textarea y copian */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {[
                    { fmt: "formal",   label: "Pedido" },
                    { fmt: "discreto", label: "Discreto" },
                    { fmt: "colegas",  label: "Colegas" },
                  ].map(({ fmt, label }) => {
                    const activo = pcFormat === fmt;
                    const copiado = copiadoTipo === fmt;
                    return (
                      <button key={fmt}
                        onClick={e => {
                          e.stopPropagation();
                          const texto = generarPedido(lead, fmt);
                          setPcFormat(fmt);
                          setPcText(texto);
                          navigator.clipboard.writeText(texto);
                          setCopiadoTipo(fmt);
                          setTimeout(() => setCopiadoTipo(null), 1500);
                        }}
                        style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${copiado ? "#16a34a" : activo ? "#3a8bc4" : "#c7d3df"}`,
                          flex: 1,
                          background: copiado ? "rgba(22,163,74,0.1)" : activo ? "#e8f1fb" : "#f2f6fa",
                          color: copiado ? "#16a34a" : activo ? "#12355b" : "#46596d",
                          cursor: "pointer", whiteSpace: "nowrap" }}>
                        {copiado ? "✓ Copiado" : label}
                      </button>
                    );
                  })}
                </div>
                {/* Textarea editable */}
                <textarea
                  value={pcText}
                  onChange={e => setPcText(e.target.value)}
                  rows={6}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8,
                    border: "1px solid #c7d3df", background: "#f9fbfd",
                    color: "#102033", fontSize: 11, outline: "none",
                    resize: "vertical", fontFamily: "inherit", lineHeight: 1.6,
                    boxSizing: "border-box",
                  }}
                />
                {/* Acciones */}
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={e => { e.stopPropagation(); guardarPedido(); }}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, fontWeight: 700,
                      border: "none", background: pcSaved ? "#16a34a" : "#3a8bc4",
                      color: "#fff", cursor: "pointer", transition: "background 0.2s" }}>
                    {pcSaved ? "✓ Guardado" : "Guardar"}
                  </button>
                  <button onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(pcText);
                      setPcCopiado(true);
                      setTimeout(() => setPcCopiado(false), 1500);
                    }}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
                      border: "1px solid #c7d3df", background: "#f2f6fa",
                      color: pcCopiado ? "#16a34a" : "#46596d", cursor: "pointer" }}>
                    {pcCopiado ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Matches ────────────────────────────── */}
            {matches.length > 0 && (
              <div style={SB}>
                <div style={SL}>Propiedades compatibles · {matches.length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matches.map(m => {
                    const mKey    = `${lead.id}-${m.id}`;
                    const visto   = mostrados.has(mKey);
                    const esCap   = String(m.id).startsWith("cap-");
                    const waUrl   = getWhatsappUrl(lead, m);
                    const propUrl = getMatchUrl(m);
                    const chips   = getPropertyHighlights(m);
                    const dims    = [getAmbientesLabel(m), getM2Label(m)].filter(Boolean).join(" · ");
                    return (
                      <div key={m.id} style={{
                        padding: "8px 10px", background: "#e4edf6",
                        borderRadius: 8, border: "1px solid #c5d8eb",
                        display: "flex", flexDirection: "column", gap: 4,
                      }}>
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
                            <button onClick={e => { e.stopPropagation(); toggleMostrado(lead.id, m.id); }}
                              style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6,
                                border: `1px solid ${visto ? "#c7d3df" : "#3a8bc4"}`,
                                background: visto ? "#f2f6fa" : "#d4e5f7",
                                color: visto ? "#5a6f84" : "#1763d1",
                                cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {visto ? "✓ Visto" : "Marcar"}
                            </button>
                          </div>
                        </div>
                        {m.dir && (
                          <div style={{ fontSize: 11, color: "#46596d" }}>
                            {m.dir.slice(0, 60)}{m.dir.length > 60 ? "…" : ""}
                          </div>
                        )}
                        {(dims || chips.length > 0) && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {dims && (
                              <span style={{ fontSize: 10, color: "#3a8bc4", fontWeight: 600 }}>{dims}</span>
                            )}
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
                </div>
              </div>
            )}

            {/* ── ROW 3: Notas (editor) + Calificación ──────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}>
              {/* Notas — editor completo */}
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={SL}>Notas · {todasNotas.length}</div>

                {/* Input nueva nota */}
                <div style={{ display: "flex", gap: 5 }}>
                  <input
                    value={notaTexto}
                    onChange={e => setNotaTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") guardarNota(); }}
                    placeholder="Agregar nota..."
                    style={{ flex: 1, padding: "6px 9px", borderRadius: 7,
                      border: "1px solid #c7d3df", background: "#f9fbfd",
                      color: "#102033", fontSize: 11, outline: "none" }}
                  />
                  <button onClick={guardarNota} disabled={notasSaving || !notaTexto.trim()}
                    style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer",
                      background: notaTexto.trim() ? "#3a8bc4" : "#c7d3df",
                      border: "none", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    {notasSaving ? "…" : "+"}
                  </button>
                </div>

                {/* Selector de tipo */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(TIPO_NOTA).map(([key, cfg]) => (
                    <button key={key} onClick={() => setNotaTipo(key)}
                      style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        border: `1px solid ${cfg.color}`,
                        background: notaTipo === key ? cfg.color : "transparent",
                        color: notaTipo === key ? "#fff" : cfg.color,
                        cursor: "pointer" }}>
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Historial */}
                {todasNotas.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                    Sin notas aún
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5,
                    maxHeight: 240, overflowY: "auto" }}>
                    {[...todasNotas].reverse().map((n, i) => {
                      const cfg   = TIPO_NOTA[n.tipo] || TIPO_NOTA.seguimiento;
                      const fecha = n.createdAt
                        ? new Date(n.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                        : "";
                      return (
                        <div key={n.id || i} style={{
                          display: "flex", gap: 8, alignItems: "flex-start",
                          padding: "7px 10px", background: "#f2f6fa", borderRadius: 8,
                          borderTop: "1px solid #c7d3df",
                          borderRight: "1px solid #c7d3df",
                          borderBottom: "1px solid #c7d3df",
                          borderLeft: `3px solid ${cfg.color}`,
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
                          {n.id && n.id !== "legacy" && (
                            <button onClick={() => borrarNota(n.id)}
                              style={{ background: "transparent", border: "none",
                                color: "#b0bec5", cursor: "pointer", fontSize: 12,
                                padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calificación — editable con paleta light */}
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <div style={{ ...SL, marginBottom: 0 }}>Calificación</div>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {califRespondidas}/{CALIF_SENALES.length}
                  </span>
                </div>

                {/* Barra progreso */}
                <div style={{ height: 3, background: "#c7d3df", borderRadius: 2, overflow: "hidden", marginBottom: 2 }}>
                  <div style={{
                    height: "100%",
                    width: `${(califRespondidas / CALIF_SENALES.length) * 100}%`,
                    background: califRespondidas <= 1 ? "#dc5050"
                              : califRespondidas <= 2 ? "#e9823a"
                              : califRespondidas <= 3 ? "#3a8bc4"
                              : "#16a34a",
                    borderRadius: 2, transition: "width 0.3s",
                  }} />
                </div>

                {CALIF_SENALES.map(s => {
                  const enEdicion  = califEdit === s.key;
                  const tieneValor = !!lead[s.key];
                  return (
                    <div key={s.key}>
                      {enEdicion ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input autoFocus value={califVal}
                            onChange={e => setCalifVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") guardarCalif(s.key);
                              if (e.key === "Escape") setCalifEdit(null);
                            }}
                            placeholder={s.ph}
                            style={{ flex: 1, padding: "4px 8px", borderRadius: 6,
                              border: "1px solid #3a8bc4", background: "#f9fbfd",
                              color: "#102033", fontSize: 11, outline: "none" }} />
                          <button onClick={() => guardarCalif(s.key)} disabled={califSaving}
                            style={{ padding: "4px 10px", borderRadius: 6, background: "#3a8bc4",
                              border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            {califSaving ? "…" : "OK"}
                          </button>
                          <button onClick={() => setCalifEdit(null)} style={btnSm}>✕</button>
                        </div>
                      ) : (
                        <div onClick={() => { setCalifEdit(s.key); setCalifVal(lead[s.key] || ""); }}
                          style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px",
                            borderRadius: 6, cursor: "pointer",
                            background: tieneValor ? "rgba(58,139,196,0.06)" : "rgba(148,163,184,0.06)",
                            border: `1px solid ${tieneValor ? "#c5d8eb" : "#dde3ec"}` }}>
                          <span style={{ fontSize: 12, flexShrink: 0 }}>{s.icon}</span>
                          <span style={{ fontSize: 11, color: "#5a6f84", flex: 1, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                          {tieneValor ? (
                            <>
                              <span style={{ fontSize: 11, color: "#102033", fontStyle: "italic",
                                maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {lead[s.key]}
                              </span>
                              <button onClick={e => { e.stopPropagation(); borrarCalif(s.key); }}
                                style={{ background: "transparent", border: "none",
                                  color: "#b0bec5", cursor: "pointer", fontSize: 11,
                                  padding: "0 2px", flexShrink: 0 }}>
                                ✕
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>sin dato</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Prob + crédito */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 4 }}>
                  <div>
                    <label style={lbl}>Prob. cierre %</label>
                    <input type="number" min="0" max="100"
                      defaultValue={lead.prob || ""}
                      onBlur={e => { const v = Number(e.target.value); updateLead(lead.id, { prob: v || null }); }}
                      style={{ ...inp }} />
                  </div>
                  <div>
                    <label style={lbl}>Crédito</label>
                    <select value={lead.credito || ""}
                      onChange={e => updateLead(lead.id, { credito: e.target.value || null })}
                      style={{ ...inp, cursor: "pointer" }}>
                      <option value="">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 4: Perfil inversor (solo si lead.inversor) ─ */}
            {lead.inversor && (
              <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ ...SL, marginBottom: 0 }}>Perfil inversor</div>
                  {!editInv ? (
                    <button onClick={() => { setInvBuf(lead.nota_inversor || ""); setEditInv(true); }}
                      style={{ ...btnSm, color: "#3a8bc4", fontWeight: 600 }}>
                      ✏️ Editar
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={guardarInversor}
                        style={{ fontSize: 10, padding: "2px 10px", borderRadius: 6,
                          border: "none", background: "#3a8bc4",
                          color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        Guardar
                      </button>
                      <button onClick={() => setEditInv(false)} style={btnSm}>Cancelar</button>
                    </div>
                  )}
                </div>
                {editInv ? (
                  <textarea
                    value={invBuf}
                    onChange={e => setInvBuf(e.target.value)}
                    rows={3}
                    placeholder="ej: Busca renta 6%, 2 unidades, zona Güemes o Centro, plazo 6 meses..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8,
                      border: "1px solid #c7d3df", background: "#f9fbfd",
                      color: "#102033", fontSize: 11, outline: "none",
                      resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
                  />
                ) : (
                  <div>
                    {lead.nota_inversor ? (
                      <div style={{ fontSize: 12, color: "#102033", lineHeight: 1.5,
                        padding: "7px 10px", background: "#f2f6fa",
                        borderRadius: 8, border: "1px solid #c7d3df" }}>
                        {lead.nota_inversor}
                      </div>
                    ) : (
                      <div onClick={() => { setInvBuf(""); setEditInv(true); }}
                        style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic",
                          cursor: "pointer", padding: "7px 10px" }}>
                        + Agregar perfil de inversión
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 8 }}>
                      {precio    && <DataPill label="Presupuesto"  value={precio} />}
                      {lead.tipo && <DataPill label="Tipo buscado" value={lead.tipo} />}
                      {lead.zona && <DataPill label="Zona"         value={lead.zona} />}
                      {lead.op   && <DataPill label="Operación"    value={lead.op} />}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ROW 5: Asistente IA ───────────────────────── */}
            <div style={{ ...SB, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={SL}>Asistente IA</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { type: "pedido",   label: "✨ Mejorar pedido",  desc: "Pedido optimizado + datos faltantes" },
                  { type: "whatsapp", label: "💬 Mensaje WA",       desc: matches.length > 0 ? "Con primer match" : "Seguimiento" },
                  { type: "accion",   label: "🎯 Próxima acción",   desc: "Qué hacer ahora" },
                ].map(({ type, label, desc }) => (
                  <button key={type}
                    onClick={e => { e.stopPropagation(); callAI(type); }}
                    disabled={!!aiLoading}
                    style={{ flex: 1, minWidth: 110, padding: "8px 10px", borderRadius: 9,
                      border: `1px solid ${aiResult?.type === type ? "#3a8bc4" : "#c7d3df"}`,
                      background: aiResult?.type === type ? "#d4e5f7" : "#f2f6fa",
                      color: "#102033",
                      cursor: aiLoading ? "not-allowed" : "pointer",
                      display: "flex", flexDirection: "column", gap: 2,
                      opacity: aiLoading && aiLoading !== type ? 0.5 : 1,
                      transition: "opacity 0.15s, border-color 0.15s" }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>
                      {aiLoading === type ? "Consultando…" : label}
                    </span>
                    <span style={{ fontSize: 10, color: "#5a6f84" }}>{desc}</span>
                  </button>
                ))}
              </div>

              {aiResult && (
                <div style={{ background: "#f2f6fa", border: "1px solid #c7d3df",
                  borderRadius: 9, padding: "10px 12px",
                  display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#3a8bc4",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {{ pedido: "Pedido mejorado", whatsapp: "Mensaje WhatsApp", accion: "Próxima acción" }[aiResult.type]}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => {
                        navigator.clipboard.writeText(aiResult.text);
                        setAiCopiado(true);
                        setTimeout(() => setAiCopiado(false), 2000);
                      }} style={{ ...btnSm, color: aiCopiado ? "#16a34a" : "#3a8bc4", fontWeight: 600 }}>
                        {aiCopiado ? "✓ Copiado" : "Copiar"}
                      </button>
                      <button onClick={() => setAiResult(null)} style={btnSm}>✕</button>
                    </div>
                  </div>
                  <pre style={{ margin: 0, fontSize: 12, color: "#102033", lineHeight: 1.6,
                    whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                    {aiResult.text}
                  </pre>
                </div>
              )}
            </div>

            {/* ── ROW 6: Acciones peligrosas ─────────────────── */}
            <div style={{ ...SB, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#5a6f84",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Acciones
              </span>
              <button onClick={e => { e.stopPropagation(); setModalPerdido(lead); }}
                style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: "1px solid rgba(233,130,58,0.35)", background: "#fff7f0",
                  color: "#e9823a", cursor: "pointer" }}>
                Marcar perdido
              </button>
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(lead); }}
                style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: "1px solid rgba(220,80,80,0.35)", background: "#fff5f5",
                  color: "#dc5050", cursor: "pointer" }}>
                Eliminar lead
              </button>
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
        {precio              && <DataPill label="Presupuesto" value={precio} />}
        {lead.tipo           && <DataPill label="Tipo"        value={lead.tipo} />}
        {lead.ambientes      && <DataPill label="Ambientes"   value={`${lead.ambientes} amb`} />}
        {lead.cochera === "si" && <DataPill label="Cochera"   value="✓ Sí" />}
        {lead.credito === "si" && <DataPill label="Crédito"   value="✓ Aprobado" />}
        {lead.etapa          && <DataPill label="Etapa"       value={lead.etapa} />}
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
