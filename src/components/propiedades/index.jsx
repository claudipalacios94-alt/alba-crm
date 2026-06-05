// ══════════════════════════════════════════════════════════════
// ALBA CRM — Propiedades (orquestador)
// Header, filtros, secciones por categoría, toggle venta/alquiler
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B } from "../../data/constants.js";
import { agruparPropiedadesPorCategoria, filtrarPropiedades, getTiposUnicos } from "../../domain/property.js";
import PropSeccion    from "./PropSeccion.jsx";
import AlquileresView from "./AlquileresView.jsx";
import { useAppContext }    from "../../context/SupabaseContext.jsx";
import { usePropertyStore } from "../../store/usePropertyStore.js";

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}

export default function Propiedades({ properties, rentals = [], leads = [], supabase, updateProperty, deleteProperty }) {
  const mobile = useIsMobile(768);
  const [tab,      setTab]      = useState("venta");
  const [ft,       setFt]       = useState("Todos");
  const [q,        setQ]        = useState("");
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState(null);
  const [dryResult, setDryResult] = useState(null); // preview pendiente de confirmar

  const { supabase: sbClient } = useAppContext();
  const loadProperties         = usePropertyStore(s => s.loadProperties);

  async function callSync(dryRun) {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session) throw new Error("Sin sesión activa");

      const res  = await fetch("/api/sync-mdl", {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dry_run: dryRun }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error del servidor");

      if (dryRun) {
        setDryResult(json);
      } else {
        setDryResult(null);
        await loadProperties();
        setSyncMsg({ ok: json.ok, text: json.message });
        setTimeout(() => setSyncMsg(null), 8000);
      }
    } catch (err) {
      setSyncMsg({ ok: false, text: err.message });
      setTimeout(() => setSyncMsg(null), 8000);
    } finally {
      setSyncing(false);
    }
  }

  const tipos    = getTiposUnicos(properties);
  const filtered = filtrarPropiedades(properties, { tipo: ft, q });
  const { retasadas, destacadas, hon3, hon6, colegas, resto } = agruparPropiedadesPorCategoria(filtered);

  const ch = act => ({
    padding: mobile ? "6px 12px" : "4px 10px", borderRadius:20, fontSize: mobile ? 12 : 11, cursor:"pointer",
    border:"1px solid "+(act ? B.accentL : B.border),
    background: act ? B.accentL+"18" : "transparent",
    color: act ? B.accentL : "#8AAECC",
  });

  const seccionProps = { leads, supabase, updateProperty, deleteProperty, mobile };

  return (
    <div style={{ overflowX:"hidden" }}>
      {/* Header */}
      <div style={{ marginBottom: mobile ? 14 : 16, display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap: mobile ? 10 : 10 }}>
        <div>
          <h1 style={{ fontSize: mobile ? 18 : 20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>
            {tab === "venta" ? "Propiedades en venta" : "Alquileres"}
          </h1>
          <p style={{ fontSize: mobile ? 11 : 12, color:"#8AAECC", margin:"3px 0 0" }}>
            {tab === "venta"
              ? `${filtered.length} de ${properties.length} propiedades`
              : `${rentals.length} propiedades en gestión`}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 10,
          flexWrap: mobile ? "wrap" : "nowrap", width: mobile ? "100%" : "auto" }}>
          {tab === "venta" && (
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
              style={{ padding: mobile ? "8px 12px" : "7px 12px", borderRadius:8,
                border:"1px solid "+B.border, background:B.card, color:B.text,
                fontSize: mobile ? 13 : 12, outline:"none",
                width: mobile ? "100%" : 180, flex: mobile ? 1 : "none", order: mobile ? 1 : 0 }} />
          )}
          {/* Botón MDL — dry-run primero, confirmar para escribir */}
          {!dryResult ? (
            <button
              onClick={() => callSync(true)}
              disabled={syncing}
              title="Vista previa: ver qué importaría Mar del Inmueble (sin escribir)"
              style={{
                padding: mobile ? "8px 12px" : "7px 11px", borderRadius:8,
                cursor: syncing ? "wait" : "pointer",
                border:"1px solid "+B.border, background: B.card,
                color: syncing ? B.dim : B.muted,
                fontSize: mobile ? 12 : 11, fontWeight:600, whiteSpace:"nowrap", flexShrink:0,
              }}>
              {syncing ? "⏳..." : "🔄 MDL"}
            </button>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, color: B.muted }}>
                Vista previa: {dryResult.would_create} nuevas · {dryResult.would_update} a actualizar
              </span>
              <button
                onClick={() => callSync(false)}
                disabled={syncing}
                style={{
                  padding:"5px 10px", borderRadius:6, cursor:"pointer",
                  border:"1px solid "+B.ok+"60", background: B.ok+"18",
                  color: B.ok, fontSize:11, fontWeight:700,
                }}>
                {syncing ? "⏳..." : "✓ Confirmar"}
              </button>
              <button
                onClick={() => setDryResult(null)}
                disabled={syncing}
                style={{
                  padding:"5px 8px", borderRadius:6, cursor:"pointer",
                  border:"1px solid "+B.border, background:"transparent",
                  color: B.muted, fontSize:11,
                }}>
                ✕
              </button>
            </div>
          )}
          {syncMsg && (
            <span style={{
              fontSize: mobile ? 12 : 11,
              color: syncMsg.ok ? B.ok : B.hot,
              whiteSpace: mobile ? "normal" : "nowrap",
            }}>{syncMsg.text}</span>
          )}
          <div style={{ display:"flex", background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:3, flexShrink:0 }}>
            {[
              { id:"venta",    label:"🏠 Venta",   count: properties.length },
              { id:"alquiler", label:"🔑 Alquiler", count: rentals.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: mobile ? "7px 14px" : "5px 14px", borderRadius:7, cursor:"pointer",
                  fontSize: mobile ? 13 : 12, fontWeight:600, border:"none",
                  background: tab === t.id ? B.accent : "transparent",
                  color: tab === t.id ? "#fff" : "#8AAECC" }}>
                {t.label} <span style={{ opacity:0.7, fontSize: mobile ? 11 : 10 }}>({t.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros tipo */}
      {tab === "venta" && (
        <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 6 : 5, marginBottom: mobile ? 16 : 20 }}>
          {tipos.map(t => <button key={t} onClick={() => setFt(t)} style={ch(ft === t)}>{t}</button>)}
        </div>
      )}

      {/* Contenido */}
      {tab === "venta" ? (
        <>
          <PropSeccion titulo="🔥 Retasadas — precio reducido" color="#FF6B35" props={retasadas} {...seccionProps} />
          <PropSeccion titulo="Destacadas"                      color="#E8A830" props={destacadas} {...seccionProps} />
          <PropSeccion titulo="Honorarios 3%"                   color="#2E9E6A" props={hon3}       {...seccionProps} />
          <PropSeccion titulo="Honorarios 6%"                   color="#3EAA72" props={hon6}       {...seccionProps} />
          <PropSeccion titulo="Compartidas por colegas"         color="#9B6DC8" props={colegas}    {...seccionProps} />
          <PropSeccion titulo="Sin categoría"                   color="#4A6A90" props={resto}      {...seccionProps} />
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", padding: mobile ? "50px 20px" : "40px", color:"#8AAECC", fontSize: mobile ? 14 : 13 }}>
              Sin propiedades
            </div>
          )}
        </>
      ) : (
        <AlquileresView rentals={rentals} mobile={mobile} />
      )}
    </div>
  );
}