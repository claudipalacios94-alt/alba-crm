// ══════════════════════════════════════════════════════════════
// ALBA CRM — CRMLeads (orquestador)
// Filtros, tabs, grupos por temperatura, mail de pedidos
// ══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { AG, matchLeadProps, getRecommendedAction } from "../../data/constants.js";
import { computeRanking, getLeadTemperature, getLeadPriority } from "../../domain/lead.js";
import LeadCardPro from "./LeadCardPro.jsx";
import CRMKpiCard  from "./CRMKpiCard.jsx";
import { useIncidents } from "../../hooks/useIncidents.js";
import ModalPerdido from "./ModalPerdido.jsx";
import Kanban from "../Kanban.jsx";

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

function gridCols(w) {
  if (w >= 1100) return "repeat(3, minmax(0, 1fr))";
  if (w >= 640)  return "repeat(2, minmax(0, 1fr))";
  return "minmax(0, 1fr)";
}

const TEMP_SECTION = {
  caliente: { icon: "🔥", title: "Calientes", color: "#dc5050", desc: "Negociación, visita o urgencia activa" },
  tibio:    { icon: "🌤",  title: "Tibios",    color: "#d97706", desc: "Interés claro, en seguimiento"         },
  frio:     { icon: "❄️", title: "Fríos",     color: "#64748b", desc: "Sin datos, sin contacto o con objeción" },
};

export default function CRMLeads({ leads, updateLead, deleteLead, properties, captaciones, supabase }) {
  const ww     = useWindowWidth();
  const mobile = ww < 768;
  useIncidents(leads);

  const [vista,          setVista]          = useState("lista");
  const [pagina,         setPagina]         = useState("compradores");
  const [fs,             setFs]             = useState("Todos");
  const [fa,             setFa]             = useState("Todos");
  const [q,              setQ]              = useState("");
  const [mostrarPerdidos,setMostrarPerdidos]= useState(false);
  const [mostrados,      setMostrados]      = useState(new Set());
  const [matchesVistos,  setMatchesVistos]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("alba_matches_vistos") || "[]")); } catch { return new Set(); }
  });
  const [modalPerdido,   setModalPerdido]   = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [exp,            setExp]            = useState(null);
  const [showMail,       setShowMail]       = useState(false);
  const [mailCopiado,    setMailCopiado]    = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("matches_mostrados").select("lead_id,prop_id")
      .then(({ data }) => {
        if (data) setMostrados(new Set(data.map(r => `${r.lead_id}-${r.prop_id}`)));
      });
  }, []);

  async function toggleMostrado(leadId, propId) {
    const key = `${leadId}-${propId}`;
    if (mostrados.has(key)) {
      await supabase.from("matches_mostrados").delete().match({ lead_id: leadId, prop_id: propId });
      setMostrados(prev => { const s = new Set(prev); s.delete(key); return s; });
    } else {
      await supabase.from("matches_mostrados").insert([{ lead_id: leadId, prop_id: propId }]);
      setMostrados(prev => new Set([...prev, key]));
    }
  }

  const todasProps = useMemo(() => {
    const capsNorm = (captaciones || []).map(c => ({
      id: "cap-" + c.id, tipo: c.tipo, zona: c.zona, precio: c.precio,
      dir: c.direccion, caracts: c.caracts, activa: true,
      _esCaptacion: true, _tipoCap: c.tipo_captacion, _url: c.url, _createdAt: c.created_at,
    }));
    return [...(properties || []), ...capsNorm];
  }, [properties, captaciones]);

  // Cache de matches: evita recalcular matchLeadProps en sort, KPIs y cards
  const matchesByLeadId = useMemo(() => {
    const map = new Map();
    for (const lead of leads) {
      map.set(lead.id, matchLeadProps(lead, todasProps));
    }
    return map;
  }, [leads, todasProps]);

  const filtBase = useMemo(() => leads.filter(l => {
    if (!mostrarPerdidos && (l.etapa === "Perdido" || l.etapa === "Cerrado")) return false;
    if (fa === "Sin asignar" && l.ag) return false;
    if (fa !== "Todos" && fa !== "Sin asignar" && l.ag !== fa) return false;
    if (q && !l.nombre?.toLowerCase().includes(q.toLowerCase())
          && !(l.zona || "").toLowerCase().includes(q.toLowerCase())
          && !(l.tel || "").includes(q)) return false;
    return true;
  }), [leads, fa, q, mostrarPerdidos]);

  const filt           = useMemo(() => filtBase.filter(l => !l.inversor), [filtBase]);
  const filtInversores = useMemo(() => filtBase.filter(l => !!l.inversor), [filtBase]);

  const matchesNuevos = useMemo(() => {
    let count = 0;
    [...filt, ...filtInversores].forEach(l => {
      (matchesByLeadId.get(l.id) || []).forEach(p => {
        if (!matchesVistos.has(`${l.id}-${p.id}`)) count++;
      });
    });
    return count;
  }, [filt, filtInversores, matchesByLeadId, matchesVistos]);

  const leadsConMatchNuevo = useMemo(() => {
    const ids = new Set();
    [...filt, ...filtInversores].forEach(l => {
      if ((matchesByLeadId.get(l.id) || []).some(p => !matchesVistos.has(`${l.id}-${p.id}`)))
        ids.add(l.id);
    });
    return ids;
  }, [filt, filtInversores, matchesByLeadId, matchesVistos]);

  function marcarMatchesVistos() {
    const nuevos = new Set(matchesVistos);
    [...filt, ...filtInversores].forEach(l => {
      (matchesByLeadId.get(l.id) || []).forEach(p => nuevos.add(`${l.id}-${p.id}`));
    });
    setMatchesVistos(nuevos);
    localStorage.setItem("alba_matches_vistos", JSON.stringify([...nuevos]));
  }

  const leadsActivos = pagina === "compradores" ? filt : filtInversores;

  const grouped = useMemo(() => {
    const sortFn = (a, b) => {
      const mA = (matchesByLeadId.get(a.id) || []).length;
      const mB = (matchesByLeadId.get(b.id) || []).length;
      const hnA = leadsConMatchNuevo.has(a.id);
      const hnB = leadsConMatchNuevo.has(b.id);
      return getLeadPriority(b, { matchCount: mB, hasNewMatch: hnB })
           - getLeadPriority(a, { matchCount: mA, hasNewMatch: hnA });
    };

    const calientes = [], tibios = [], frios = [];
    for (const l of leadsActivos) {
      const matchCount = (matchesByLeadId.get(l.id) || []).length;
      const hasNewMatch = leadsConMatchNuevo.has(l.id);
      const temp = getLeadTemperature(l, { matchCount, hasNewMatch });
      if (temp === "caliente") calientes.push(l);
      else if (temp === "tibio") tibios.push(l);
      else frios.push(l);
    }

    const targetMap = { "Caliente": "caliente", "Tibio": "tibio", "Frío": "frio" };
    const targetTemp = targetMap[fs];

    const sections = [
      { key: "caliente", leads: calientes.sort(sortFn) },
      { key: "tibio",    leads: tibios.sort(sortFn) },
      { key: "frio",     leads: frios.sort(sortFn) },
    ];

    return targetTemp
      ? sections.filter(s => s.key === targetTemp && s.leads.length > 0)
      : sections.filter(s => s.leads.length > 0);
  }, [leadsActivos, matchesByLeadId, leadsConMatchNuevo, fs]);

  const perdidosCount = leads.filter(l => l.etapa === "Perdido" || l.etapa === "Cerrado").length;

  async function setEtapa(id, etapa) {
    if (etapa === "Perdido") { setModalPerdido(leads.find(l => l.id === id)); return; }
    await updateLead(id, { etapa });
  }

  async function confirmarPerdido(lead, motivo) {
    await updateLead(lead.id, { etapa: "Perdido", motivo_perdida: motivo });
    setModalPerdido(null);
  }

  async function setAgente(id, ag) { await updateLead(id, { ag }); }

  async function ejecutarEliminar() {
    if (!confirmDelete) return;
    await deleteLead(confirmDelete.id);
    setConfirmDelete(null);
    if (exp === confirmDelete.id) setExp(null);
  }

  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.presup && l.zona)
    .sort((a, b) => a.dias - b.dias);

  function generarMail() {
    const cal = activos.filter(l => l.dias <= 2);
    const tib = activos.filter(l => l.dias > 2 && l.dias <= 7);
    const fmt = l => {
      const precio = l.presup ? `USD ${l.presup.toLocaleString()}` : "presupuesto a consultar";
      const partes = [l.tipo, l.zona && `en ${l.zona}`, precio].filter(Boolean).join(", ");
      const extras = [l.credito==="si"&&"crédito aprobado",l.cochera==="si"&&"con cochera",l.patio==="si"&&"con patio",l.ambientes&&`${l.ambientes} amb`].filter(Boolean).join(" · ");
      return `• ${partes}${extras ? ` — ${extras}` : ""}`;
    };
    let mail = `Buenos días colegas,\n\nLes comparto mis pedidos activos de Alba Inversiones:\n`;
    if (cal.length > 0) { mail += `\n🔴 URGENTES\n`; mail += cal.map(fmt).join("\n"); }
    if (tib.length > 0) { mail += `\n\n🟡 EN BÚSQUEDA\n`; mail += tib.map(fmt).join("\n"); }
    mail += `\n\nCualquier opción que encaje, me avisan.\n\nSaludos,\nAlba Inversiones · Reg. 3832`;
    return mail;
  }

  function copiarMail() {
    navigator.clipboard.writeText(generarMail());
    setMailCopiado(true);
    setTimeout(() => setMailCopiado(false), 2000);
  }

  const leadTop = useMemo(() => {
    const act = leadsActivos.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
    return act.sort((a, b) => {
      const mA = (matchesByLeadId.get(a.id) || []).length;
      const mB = (matchesByLeadId.get(b.id) || []).length;
      return computeRanking(b, mB).prioridad - computeRanking(a, mA).prioridad;
    })[0] || null;
  }, [leadsActivos, matchesByLeadId]);

  // ── KPI calculations ─────────────────────────────────────
  const { kpiActivos, kpiSinContacto, kpiAcciones, kpiConMatches } = useMemo(() => {
    let activos = 0, sinContacto = 0, acciones = 0, conMatches = 0;
    for (const l of leads) {
      const viva = l.etapa !== "Cerrado" && l.etapa !== "Perdido";
      if (viva) activos++;
      if (viva && l.dias !== null && l.dias > 3) sinContacto++;
      if (l.etapa === "Negociación" || l.etapa === "Visita") acciones++;
      if (viva && (matchesByLeadId.get(l.id) || []).length > 0) conMatches++;
    }
    return { kpiActivos: activos, kpiSinContacto: sinContacto, kpiAcciones: acciones, kpiConMatches: conMatches };
  }, [leads, matchesByLeadId]);

  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const cardSharedProps = {
    mobile, properties, captaciones, mostrados, toggleMostrado,
    updateLead, deleteLead, setEtapa, setAgente, setModalPerdido, setConfirmDelete,
  };

  // ── Layout padding must match Layout.jsx (22px 26px desktop / 14px 12px mobile)
  const lv = mobile ? 14 : 22;
  const lh = mobile ? 12 : 26;

  return (
    <div style={{
      margin: `-${lv}px -${lh}px`,
      padding: `${lv}px ${lh}px 32px`,
      background: "#dfe7ef",
      minHeight: `calc(100% + ${lv * 2}px)`,
      overflowX: "hidden",
      boxSizing: "border-box",
    }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 12, marginBottom: 20, flexWrap: mobile ? "wrap" : "nowrap" }}>

        <div>
          <h1 style={{ margin: 0, fontSize: mobile ? 22 : 26, fontWeight: 800, color: "#102033",
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1 }}>
            CRM Leads
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#46596d", fontWeight: 400 }}>
            Gestioná tus compradores e inversores
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: "none" }}>
          {/* Buscador */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 10, fontSize: 14, color: "#94a3b8" }}>🔍</span>
            <input
              placeholder="Buscar nombre, zona o teléfono..."
              value={q} onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                border: "1px solid #c7d3df", borderRadius: 10, fontSize: 13,
                background: "#f2f6fa", color: "#102033", outline: "none",
                width: mobile ? "100%" : 260,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }} />
          </div>

          {/* Filtros y acciones */}
          <button onClick={() => setMostrarPerdidos(p => !p)}
            style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              fontSize: 12, fontWeight: 600, border: "1px solid #c7d3df",
              background: mostrarPerdidos ? "#fad8d8" : "#f2f6fa",
              color: mostrarPerdidos ? "#dc5050" : "#46596d",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {mostrarPerdidos ? "Ocultar archivados" : `Archivados (${perdidosCount})`}
          </button>

          <button onClick={() => setShowMail(m => !m)}
            style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: showMail ? "#12355b" : "#f2f6fa",
              border: `1px solid ${showMail ? "#12355b" : "#c7d3df"}`,
              color: showMail ? "#fff" : "#12355b",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            ✉ Mail pedidos
          </button>

          {matchesNuevos > 0 && (
            <button onClick={marcarMatchesVistos}
              style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                fontSize: 12, fontWeight: 700, border: "1px solid rgba(37,99,235,0.3)",
                background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>
              🔔 {matchesNuevos} match{matchesNuevos > 1 ? "es" : ""} nuevo{matchesNuevos > 1 ? "s" : ""}
            </button>
          )}

          {/* Fecha */}
          <div style={{ padding: "6px 12px", borderRadius: 10, background: "#f2f6fa",
            border: "1px solid #c7d3df", fontSize: 11, color: "#46596d", fontWeight: 500,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)", whiteSpace: "nowrap" }}>
            📅 {today}
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <CRMKpiCard icon="👥" value={leads.length}   label="Leads totales"
          sub="en base de datos" color="#2563eb"
          sparkline={[Math.max(1,leads.length-8),leads.length-5,leads.length-3,leads.length-1,leads.length]} />
        <CRMKpiCard icon="🔥" value={kpiActivos}     label="Leads activos"
          sub="excluye cerrados y perdidos" color="#ea580c"
          sparkline={[kpiActivos-4,kpiActivos-2,kpiActivos-3,kpiActivos-1,kpiActivos].map(n=>Math.max(0,n))} />
        <CRMKpiCard icon="🏠" value={kpiConMatches}  label="Con matches"
          sub="tienen propiedades compatibles" color="#7c3aed"
          sparkline={[kpiConMatches-3,kpiConMatches-1,kpiConMatches-2,kpiConMatches,kpiConMatches].map(n=>Math.max(0,n))} />
        <CRMKpiCard icon="⚠️" value={kpiSinContacto} label="Sin contacto +3d"
          sub="requieren seguimiento" color="#dc2626"
          alert={kpiSinContacto > 5}
          sparkline={[kpiSinContacto+2,kpiSinContacto+1,kpiSinContacto+3,kpiSinContacto+1,kpiSinContacto].map(n=>Math.max(0,n))} />
        <CRMKpiCard icon="⚡" value={kpiAcciones}    label="Acciones hoy"
          sub="en Negociación o Visita" color="#d97706"
          sparkline={[kpiAcciones-1,kpiAcciones,kpiAcciones+1,kpiAcciones,kpiAcciones].map(n=>Math.max(0,n))} />
      </div>

      {/* Panel mail */}
      {showMail && (
        <div style={{ background: "#f2f6fa", border: "1px solid #c7d3df", borderRadius: 14,
          overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #c7d3df",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8, background: "#eef4f8" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f" }}>
              ✉ MAIL DE PEDIDOS — {activos.filter(l => l.dias <= 7).length} búsquedas activas
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copiarMail}
                style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: mailCopiado ? "#16a34a" : "#1e3a5f", border: "none",
                  color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {mailCopiado ? "✓ Copiado" : "Copiar"}
              </button>
              <a href={`mailto:?subject=Pedidos%20Alba%20Inversiones&body=${encodeURIComponent(generarMail())}`}
                style={{ padding: "6px 14px", borderRadius: 8, background: "#fff",
                  border: "1px solid #e5eaf2", color: "#64748b", fontSize: 12, fontWeight: 600,
                  textDecoration: "none" }}>
                Abrir en mail
              </a>
            </div>
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, color: "#1a2744",
            lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "-apple-system, sans-serif",
            maxHeight: 280, overflowY: "auto" }}>
            {generarMail()}
          </pre>
        </div>
      )}

      {/* ── TABS + ACCIÓN DEL DÍA ──────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12,
        marginBottom: 16, flexWrap: mobile ? "wrap" : "nowrap" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f2f6fa", borderRadius: 12,
          padding: 4, border: "1px solid #c7d3df",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0 }}>
          {[
            { id: "compradores", label: "🏠 Compradores", count: filt.length,          color: "#12355b" },
            { id: "inversores",  label: "💼 Inversores",  count: filtInversores.length, color: "#7c5cc4" },
          ].map(t => (
            <button key={t.id} onClick={() => { setPagina(t.id); setExp(null); }}
              style={{ padding: "8px 18px", borderRadius: 9, cursor: "pointer",
                fontSize: 13, fontWeight: 600, border: "none",
                background: pagina === t.id ? t.color : "transparent",
                color: pagina === t.id ? "#fff" : "#64748b",
                transition: "all 0.15s" }}>
              {t.label}
              <span style={{ marginLeft: 6, opacity: 0.75, fontSize: 11 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* Acción del día compacta */}
        {leadTop && (() => {
          const rec = getRecommendedAction(leadTop);
          const col = rec.urgencia === "alta" ? "#dc2626" : rec.urgencia === "media" ? "#d97706" : "#64748b";
          return (
            <div style={{ flex: 1, background: "#f2f6fa", border: `1px solid ${col}40`,
              borderLeft: `4px solid ${col}`, borderRadius: 12, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 40, flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: col, letterSpacing: "1px" }}>ACCIÓN</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: col, letterSpacing: "1px" }}>DEL DÍA</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2744",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {leadTop.nombre}
                  {leadTop.zona && <span style={{ fontWeight: 400, color: "#64748b" }}> · {leadTop.zona}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{rec.motivo}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col, background: `${col}15`,
                  padding: "3px 10px", borderRadius: 20, border: `1px solid ${col}35`,
                  whiteSpace: "nowrap" }}>
                  {rec.accion}
                </span>
                <button onClick={() => setExp(exp === leadTop.id ? null : leadTop.id)}
                  style={{ fontSize: 11, color: "#2563eb", background: "rgba(37,99,235,0.08)",
                    border: "1px solid rgba(37,99,235,0.2)", borderRadius: 8, padding: "3px 10px",
                    cursor: "pointer", fontWeight: 600 }}>
                  Ver →
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── TOOLBAR ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        flexWrap: "wrap" }}>

        {/* Vista switcher */}
        <div style={{ display: "flex", background: "#f2f6fa", borderRadius: 10, padding: 3,
          border: "1px solid #c7d3df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {[
            { id: "lista",  label: "⊞ Cards" },
            { id: "kanban", label: "⬜ Kanban" },
          ].map(v => (
            <button key={v.id} onClick={() => { setVista(v.id); setExp(null); }}
              style={{ padding: "5px 14px", borderRadius: 8, cursor: "pointer",
                fontSize: 12, fontWeight: 600, border: "none",
                background: vista === v.id ? "#12355b" : "transparent",
                color: vista === v.id ? "#fff" : "#64748b",
                transition: "all 0.15s" }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtro estado */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
          color: "#46596d", fontWeight: 600, flexShrink: 0 }}>
          Estado:
          <select value={fs} onChange={e => setFs(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #c7d3df",
              background: "#f2f6fa", color: "#102033", fontSize: 12, fontWeight: 600,
              cursor: "pointer", outline: "none" }}>
            <option value="Todos">Todos</option>
            <option value="Caliente">Caliente</option>
            <option value="Tibio">Tibio</option>
            <option value="Frío">Frío</option>
          </select>
        </label>

        {/* Filtro agente */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
          color: "#46596d", fontWeight: 600, flexShrink: 0 }}>
          Agente:
          <select value={fa} onChange={e => setFa(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #c7d3df",
              background: "#f2f6fa", color: "#102033", fontSize: 12, fontWeight: 600,
              cursor: "pointer", outline: "none" }}>
            <option value="Todos">Todos</option>
            <option value="C">Claudi</option>
            <option value="A">Alejandra</option>
            <option value="F">Flor</option>
            <option value="L">Lucas</option>
            <option value="Lu">Luján</option>
            <option value="Sin asignar">Sin asignar</option>
          </select>
        </label>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#5a6f84", fontWeight: 500 }}>
          {leadsActivos.length} {leadsActivos.length === 1 ? "lead" : "leads"}
          {fs === "Todos" && grouped.length > 0 && (
            <span> · {grouped.map(g => `${TEMP_SECTION[g.key].icon} ${g.leads.length}`).join("  ")}</span>
          )}
        </div>
      </div>

      {/* ── VISTA KANBAN ───────────────────────────────────── */}
      {vista === "kanban" && (
        <Kanban
          leads={leads.filter(l => !l.inversor)}
          updateLead={updateLead}
        />
      )}

      {/* ── VISTA CARDS (SECCIONES POR TEMPERATURA) ──────── */}
      {vista === "lista" && (
        <>
          {leadsActivos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: 14 }}>
              Sin resultados para los filtros aplicados
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: 14 }}>
              Ningún lead en este grupo
            </div>
          ) : (
            grouped.map(({ key, leads: groupLeads }, sectionIdx) => {
              const cfg = TEMP_SECTION[key];
              return (
                <div key={key} style={{ marginBottom: sectionIdx < grouped.length - 1 ? 28 : 0 }}>
                  {/* Cabecera de sección */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0 8px",
                    borderBottom: `2px solid ${cfg.color}40`,
                    marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color,
                      letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {cfg.title}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color,
                      background: `${cfg.color}15`, padding: "1px 8px",
                      borderRadius: 20, border: `1px solid ${cfg.color}30` }}>
                      {groupLeads.length}
                    </span>
                    {!mobile && (
                      <span style={{ fontSize: 11, color: "#64748b", fontStyle: "italic",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cfg.desc}
                      </span>
                    )}
                  </div>

                  {/* Grid de cards */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols(ww),
                    gap: 12, alignItems: "start" }}>
                    {groupLeads.map(lead => (
                      <LeadCardPro
                        key={lead.id}
                        lead={lead}
                        matches={matchesByLeadId.get(lead.id) || []}
                        isOpen={exp === lead.id}
                        onToggle={() => setExp(exp === lead.id ? null : lead.id)}
                        isBlurred={exp !== null && exp !== lead.id}
                        hasNewMatch={leadsConMatchNuevo.has(lead.id)}
                        {...cardSharedProps}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── MODAL ELIMINAR ─────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 16,
            padding: "28px 32px", maxWidth: 380, width: "90%",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, marginBottom: 12, textAlign: "center" }}>🗑</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744",
              marginBottom: 8, textAlign: "center" }}>¿Eliminar lead?</div>
            <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 24 }}>
              Vas a eliminar a <strong style={{ color: "#1a2744" }}>{confirmDelete.nombre}</strong>. No se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: 11, borderRadius: 9, cursor: "pointer",
                  background: "#f2f6fa", border: "1px solid #c7d3df", color: "#46596d", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={ejecutarEliminar}
                style={{ flex: 1, padding: 11, borderRadius: 9, cursor: "pointer",
                  background: "#dc2626", border: "none", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPerdido && (
        <ModalPerdido lead={modalPerdido}
          onConfirmar={confirmarPerdido}
          onCancelar={() => setModalPerdido(null)} />
      )}
    </div>
  );
}
