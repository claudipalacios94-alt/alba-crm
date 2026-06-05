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
  const [dryItems,  setDryItems]  = useState(null);  // array de items del dry-run
  const [mdlFilts,  setMdlFilts]  = useState({ op: "", tipo: "", precioMin: "", precioMax: "", zona: "", soloFoto: false, soloDisponible: true });
  const [selected,  setSelected]  = useState(new Set());

  const { supabase: sbClient } = useAppContext();
  const loadProperties         = usePropertyStore(s => s.loadProperties);

  // ── Dry-run ────────────────────────────────────────────────
  async function handleDryRun() {
    setSyncing(true); setSyncMsg(null);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session) throw new Error("Sin sesión activa");
      const res  = await fetch("/api/sync-mdl", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error del servidor");
      setDryItems(json.items || []);
      setSelected(new Set());
      setMdlFilts({ op: "", tipo: "", precioMin: "", precioMax: "", zona: "", soloFoto: false });
    } catch (err) {
      setSyncMsg({ ok: false, text: err.message });
      setTimeout(() => setSyncMsg(null), 8000);
    } finally { setSyncing(false); }
  }

  // ── Importar seleccionadas ─────────────────────────────────
  async function handleImport() {
    if (selected.size === 0) return;
    setSyncing(true); setSyncMsg(null);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session) throw new Error("Sin sesión activa");
      const res  = await fetch("/api/sync-mdl", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ selected_ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error del servidor");
      setDryItems(null); setSelected(new Set());
      await loadProperties();
      setSyncMsg({ ok: json.ok, text: json.message });
      setTimeout(() => setSyncMsg(null), 8000);
    } catch (err) {
      setSyncMsg({ ok: false, text: err.message });
      setTimeout(() => setSyncMsg(null), 8000);
    } finally { setSyncing(false); }
  }

  // ── Items filtrados ────────────────────────────────────────
  const mdlFiltrados = React.useMemo(() => {
    if (!dryItems) return [];
    return dryItems.filter(p => {
      if (mdlFilts.soloDisponible && p.estado_aviso !== "Disponible") return false;
      if (mdlFilts.op     && p.operacion !== mdlFilts.op)   return false;
      if (mdlFilts.tipo   && p.tipo      !== mdlFilts.tipo)  return false;
      if (mdlFilts.soloFoto && !p.tiene_foto)                return false;
      if (mdlFilts.zona   && !p.zona?.toLowerCase().includes(mdlFilts.zona.toLowerCase())) return false;
      if (mdlFilts.precioMin && p.precio < Number(mdlFilts.precioMin)) return false;
      if (mdlFilts.precioMax && p.precio > Number(mdlFilts.precioMax)) return false;
      return true;
    });
  }, [dryItems, mdlFilts]);

  const tiposMDL   = React.useMemo(() => dryItems ? [...new Set(dryItems.map(p => p.tipo).filter(Boolean))].sort() : [], [dryItems]);
  const allFilSelected = mdlFiltrados.length > 0 && mdlFiltrados.every(p => selected.has(p.external_id));

  function toggleAll() {
    const next = new Set(selected);
    if (allFilSelected) mdlFiltrados.forEach(p => next.delete(p.external_id));
    else mdlFiltrados.forEach(p => next.add(p.external_id));
    setSelected(next);
  }

  function toggleOne(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
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
          <button
            onClick={dryItems ? () => { setDryItems(null); setSelected(new Set()); } : handleDryRun}
            disabled={syncing}
            title={dryItems ? "Cerrar panel MDL" : "Ver propiedades disponibles en Mar del Inmueble"}
            style={{
              padding: mobile ? "8px 12px" : "7px 11px", borderRadius:8,
              cursor: syncing ? "wait" : "pointer",
              border:"1px solid "+(dryItems ? B.accentL+"60" : B.border),
              background: dryItems ? B.accentL+"18" : B.card,
              color: syncing ? B.dim : dryItems ? B.accentL : B.muted,
              fontSize: mobile ? 12 : 11, fontWeight:600, whiteSpace:"nowrap", flexShrink:0,
            }}>
            {syncing ? "⏳..." : dryItems ? "✕ MDL" : "🔄 MDL"}
          </button>
          {syncMsg && (
            <span style={{ fontSize: mobile ? 12 : 11, color: syncMsg.ok ? B.ok : B.hot }}>
              {syncMsg.text}
            </span>
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

      {/* Panel MDL — selección controlada */}
      {dryItems && (
        <div style={{
          marginBottom: mobile ? 16 : 20,
          background: B.card, border:"1px solid "+B.accentL+"40",
          borderRadius:10, padding: mobile ? 12 : 14,
        }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize: mobile ? 13 : 12, fontWeight:700, color:B.accentL }}>
              Mar del Inmueble — {dryItems.length} disponibles · {mdlFiltrados.length} filtradas · <span style={{ color:B.ok }}>{selected.size} seleccionadas</span>
            </span>
            <button
              onClick={handleImport}
              disabled={syncing || selected.size === 0}
              style={{
                padding:"6px 14px", borderRadius:7, cursor: selected.size===0 ? "default" : "pointer",
                border:"1px solid "+(selected.size===0 ? B.border : B.ok+"60"),
                background: selected.size===0 ? "transparent" : B.ok+"18",
                color: selected.size===0 ? B.dim : B.ok,
                fontSize:11, fontWeight:700, whiteSpace:"nowrap",
              }}>
              {syncing ? "⏳..." : `✓ Importar ${selected.size} seleccionadas`}
            </button>
          </div>

          {/* Resumen de estados */}
          {dryItems && (() => {
            const byE = {};
            dryItems.forEach(p => { byE[p.estado_aviso] = (byE[p.estado_aviso]||0)+1; });
            const ESTADO_C = { Disponible:"#2E9E6A", Vendido:"#8AAECC", Reservado:"#E8A830", Alquilado:"#9B6DC8" };
            return (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                {Object.entries(byE).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20,
                    background:(ESTADO_C[k]||B.dim)+"18", border:"1px solid "+(ESTADO_C[k]||B.dim)+"44" }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:ESTADO_C[k]||B.dim, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:ESTADO_C[k]||B.dim, fontWeight:700 }}>{k}</span>
                    <span style={{ fontSize:11, color:B.muted }}>{v}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filtros */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
            <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700,
              color:B.ok, cursor:"pointer", padding:"4px 8px", borderRadius:6,
              background: mdlFilts.soloDisponible ? B.ok+"18" : "transparent",
              border:"1px solid "+(mdlFilts.soloDisponible ? B.ok+"60" : B.border) }}>
              <input type="checkbox" checked={mdlFilts.soloDisponible}
                onChange={e => setMdlFilts(f=>({...f, soloDisponible: e.target.checked}))} />
              Solo disponibles
            </label>

            <select value={mdlFilts.op} onChange={e => setMdlFilts(f=>({...f, op: e.target.value}))}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+B.border, background:B.bg, color:B.text, fontSize:11 }}>
              <option value="">Operación: Todas</option>
              <option value="venta">Venta</option>
              <option value="alquiler">Alquiler</option>
            </select>

            <select value={mdlFilts.tipo} onChange={e => setMdlFilts(f=>({...f, tipo: e.target.value}))}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+B.border, background:B.bg, color:B.text, fontSize:11 }}>
              <option value="">Tipo: Todos</option>
              {tiposMDL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input placeholder="Zona..." value={mdlFilts.zona}
              onChange={e => setMdlFilts(f=>({...f, zona: e.target.value}))}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+B.border, background:B.bg, color:B.text, fontSize:11, width:100 }} />

            <input type="number" placeholder="USD min" value={mdlFilts.precioMin}
              onChange={e => setMdlFilts(f=>({...f, precioMin: e.target.value}))}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+B.border, background:B.bg, color:B.text, fontSize:11, width:80 }} />

            <input type="number" placeholder="USD max" value={mdlFilts.precioMax}
              onChange={e => setMdlFilts(f=>({...f, precioMax: e.target.value}))}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+B.border, background:B.bg, color:B.text, fontSize:11, width:80 }} />

            <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:B.muted, cursor:"pointer" }}>
              <input type="checkbox" checked={mdlFilts.soloFoto}
                onChange={e => setMdlFilts(f=>({...f, soloFoto: e.target.checked}))} />
              Solo con foto
            </label>

            {(mdlFilts.op||mdlFilts.tipo||mdlFilts.zona||mdlFilts.precioMin||mdlFilts.precioMax||mdlFilts.soloFoto) && (
              <button onClick={() => setMdlFilts(f=>({ ...f, op:"", tipo:"", precioMin:"", precioMax:"", zona:"", soloFoto:false }))}
                style={{ padding:"3px 8px", borderRadius:5, border:"1px solid "+B.border, background:"transparent", color:B.dim, fontSize:10, cursor:"pointer" }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla */}
          <div style={{ overflowX:"auto", maxHeight: mobile ? 320 : 400, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: mobile ? 11 : 10 }}>
              <thead style={{ position:"sticky", top:0, background:B.card, zIndex:1 }}>
                <tr>
                  <th style={{ padding:"5px 8px", borderBottom:"1px solid "+B.border }}>
                    <input type="checkbox" checked={allFilSelected} onChange={toggleAll}
                      title="Seleccionar/deseleccionar todas las filtradas" />
                  </th>
                  {["Estado","Op","Tipo","Zona","Dirección","Precio","Foto","ID"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"5px 8px", color:B.dim,
                      borderBottom:"1px solid "+B.border, fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mdlFiltrados.map((p, i) => {
                  const isSel = selected.has(p.external_id);
                  return (
                    <tr key={p.external_id}
                      onClick={() => toggleOne(p.external_id)}
                      style={{ cursor:"pointer", background: isSel ? B.accentL+"12" : i%2===0 ? "transparent" : B.surface+"33" }}>
                      <td style={{ padding:"4px 8px" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.external_id)} />
                      </td>
                      <td style={{ padding:"4px 8px", whiteSpace:"nowrap" }}>
                        {(() => {
                          const ESTADO_C = { Disponible:"#2E9E6A", Vendido:"#8AAECC", Reservado:"#E8A830", Alquilado:"#9B6DC8" };
                          const c = ESTADO_C[p.estado_aviso] || B.dim;
                          return <span style={{ color:c, fontWeight:600, fontSize:10 }}>{p.estado_aviso || "—"}</span>;
                        })()}
                      </td>
                      <td style={{ padding:"4px 8px", color: p.operacion==="venta" ? "#3a8bc4" : "#9B6DC8", fontWeight:600, textTransform:"capitalize", whiteSpace:"nowrap" }}>{p.operacion}</td>
                      <td style={{ padding:"4px 8px", color:B.text, whiteSpace:"nowrap" }}>{p.tipo}</td>
                      <td style={{ padding:"4px 8px", color:B.muted, whiteSpace:"nowrap" }}>{p.zona}</td>
                      <td style={{ padding:"4px 8px", color:B.dim, whiteSpace:"nowrap" }}>{p.dir}</td>
                      <td style={{ padding:"4px 8px", color:B.accentL, fontWeight:600, whiteSpace:"nowrap" }}>
                        {p.precio ? "USD "+Number(p.precio).toLocaleString("es-AR") : "—"}
                      </td>
                      <td style={{ padding:"4px 8px", color: p.tiene_foto ? B.ok : B.hot, textAlign:"center" }}>{p.tiene_foto ? "✓" : "✗"}</td>
                      <td style={{ padding:"4px 8px", color:B.dim, fontSize:9 }}>{p.external_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mdlFiltrados.length === 0 && (
              <div style={{ padding:"16px", textAlign:"center", color:B.dim, fontSize:11 }}>
                Sin resultados con los filtros actuales
              </div>
            )}
          </div>
        </div>
      )}

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