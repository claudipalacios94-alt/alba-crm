// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO MAPA
// Leaflet + OpenStreetMap, propiedades geolocalizadas
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

export default function Mapa({ properties }) {
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const marksRef = useRef([]);

  const [sel,     setSel]     = useState(null);
  const [filtro,  setFiltro]  = useState("Todos");
  const [loaded,  setLoaded]  = useState(false);

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo))];
  const lista = filtro === "Todos" ? properties : properties.filter(p => p.tipo === filtro);

  // ── Cargar Leaflet desde CDN ──────────────────────────────
  useEffect(() => {
    if (window.L) { setLoaded(true); return; }
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script   = document.createElement("script");
    script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload  = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Inicializar mapa ──────────────────────────────────────
  useEffect(() => {
    if (!loaded || !mapRef.current || leafRef.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { center:[-38.002, -57.555], zoom:13 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:"© OpenStreetMap", maxZoom:19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [loaded]);

  // ── Actualizar markers cuando cambia filtro ───────────────
  useEffect(() => {
    if (!loaded || !leafRef.current) return;
    const L   = window.L;
    const map = leafRef.current;

    // Limpiar markers anteriores
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];

    lista.forEach(prop => {
      if (!prop.lat || !prop.lng) return;
      const c = prop.sc?.includes("Urgente") ? B.hot : prop.sc?.includes("Atención") ? B.warm : B.ok;
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${B.card};border:2.5px solid ${c};border-radius:10px 10px 10px 2px;padding:5px 9px;font-family:'Trebuchet MS',sans-serif;font-size:11px;font-weight:700;color:${c};white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.55);cursor:pointer;transform:translateY(-100%)">
          ${prop.tipo === "Departamento" ? "Dto" : prop.tipo}
          <span style="color:${B.accentL};margin-left:4px">USD ${prop.precio ? (prop.precio/1000).toFixed(0)+"k" : "?"}</span>
        </div>`,
        iconAnchor: [0, 0],
      });
      const marker = L.marker([prop.lat, prop.lng], { icon })
        .addTo(map)
        .on("click", () => setSel(prop));
      marksRef.current.push(marker);
    });

    if (lista.length > 0) {
      const valid = lista.filter(p => p.lat && p.lng);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding:[40, 40], maxZoom:15 });
      }
    }
  }, [loaded, lista]);

  const scColor = p => p.sc?.includes("Urgente") ? B.hot : p.sc?.includes("Atención") ? B.warm : B.ok;
  const chip = act => ({
    padding:"4px 11px", borderRadius:20, fontSize:11, cursor:"pointer",
    border:`1px solid ${act ? B.accentL : B.border}`,
    background: act ? `${B.accentL}18` : "transparent",
    color: act ? B.accentL : B.muted,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14, flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Mapa de propiedades</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{lista.length} propiedades · Mar del Plata</p>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {tipos.map(t => <button key={t} onClick={() => { setFiltro(t); setSel(null); }} style={chip(filtro === t)}>{t}</button>)}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display:"flex", gap:16, marginBottom:12, flexShrink:0, flexWrap:"wrap" }}>
        {[[B.ok, "OK — <60 días"], [B.warm, "Atención — 60-90 días"], [B.hot, "Urgente — >90 días"]].map(([c, l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:c }} />
            <span style={{ fontSize:10, color:B.muted }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Contenido: mapa + lista */}
      <div style={{ flex:1, display:"flex", gap:12, minHeight:0 }}>

        {/* Mapa */}
        <div style={{ flex:1, borderRadius:12, overflow:"hidden", border:`1px solid ${B.border}`, position:"relative" }}>
          {!loaded && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              background:B.card, zIndex:10, flexDirection:"column", gap:10 }}>
              <div style={{ width:32, height:32, border:`2px solid ${B.border}`,
                borderTop:`2px solid ${B.accentL}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <span style={{ fontSize:12, color:B.muted }}>Cargando mapa...</span>
            </div>
          )}
          <div ref={mapRef} style={{ width:"100%", height:"100%" }} />
        </div>

        {/* Lista lateral */}
        <div style={{ width:230, flexShrink:0, display:"flex", flexDirection:"column", gap:8,
          overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
          {lista.map(p => {
            const c      = scColor(p);
            const isSel  = sel?.id === p.id;
            return (
              <div key={p.id}
                onClick={() => { setSel(isSel ? null : p); leafRef.current?.setView([p.lat, p.lng], 15); }}
                style={{ background: isSel ? `${B.accent}18` : B.card,
                  border: `1.5px solid ${isSel ? B.accentL : B.border}`,
                  borderLeft:`3px solid ${c}`, borderRadius:10, padding:"11px 12px",
                  cursor:"pointer", transition:"all .15s", flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:B.text }}>{p.tipo}</div>
                    <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>{p.zona}</div>
                  </div>
                  <div style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:`${c}18`, color:c, alignSelf:"flex-start" }}>{p.dias}d</div>
                </div>
                <div style={{ fontSize:11, color:B.muted, marginBottom:7, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.dir}</div>
                <div style={{ fontSize:14, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>
                  {p.precio ? `USD ${p.precio.toLocaleString()}` : "A consultar"}
                </div>
                {p.m2tot && <div style={{ fontSize:10, color:B.dim, marginTop:3 }}>{p.m2tot}m²{p.precio ? ` · USD ${Math.round(p.precio / p.m2tot).toLocaleString()}/m²` : ""}</div>}
                {p.ag && AG[p.ag] && (
                  <div style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:AG[p.ag].bg, color:AG[p.ag].c, fontWeight:700, display:"inline-block", marginTop:4 }}>{AG[p.ag].n}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup selección */}
      {sel && (
        <div style={{ position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:"#0B1628", border:`1px solid ${B.accentL}`, borderRadius:14,
          padding:"14px 20px", zIndex:1000,
          display:"flex", alignItems:"center", gap:16,
          boxShadow:"0 8px 40px rgba(0,0,0,0.7)", maxWidth:480, width:"90%" }}>
          <div style={{ width:3, alignSelf:"stretch", background:scColor(sel), borderRadius:2, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:14, fontWeight:700, color:B.text }}>{sel.tipo}</span>
              <span style={{ fontSize:11, color:B.muted }}>{sel.zona}</span>
            </div>
            <div style={{ fontSize:12, color:B.muted, marginBottom:5 }}>{sel.dir}</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:16, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>
                {sel.precio ? `USD ${sel.precio.toLocaleString()}` : "A consultar"}
              </span>
              {sel.m2tot && <span style={{ fontSize:11, color:B.dim }}>· {sel.m2tot}m²</span>}
              <span style={{ fontSize:11, color:scColor(sel) }}>{sel.dias} días en cartera</span>
            </div>
            {sel.info && <div style={{ fontSize:11, color:B.dim, marginTop:5, fontStyle:"italic" }}>{sel.info}</div>}
          </div>
          <button onClick={() => setSel(null)}
            style={{ background:"transparent", border:"none", color:B.dim, fontSize:20, cursor:"pointer", padding:"0 4px", flexShrink:0, lineHeight:1 }}>×</button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .leaflet-container { background: ${B.bg} !important; font-family: 'Trebuchet MS', sans-serif; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.7) hue-rotate(200deg); }
        .leaflet-control-zoom a { background: ${B.card} !important; color: ${B.accentL} !important; border-color: ${B.border} !important; }
        .leaflet-control-attribution { background: rgba(7,14,28,0.8) !important; color: ${B.dim} !important; font-size: 9px; }
      `}</style>
    </div>
  );
}
