// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CAPTACIÓN RÁPIDA v3
// Texto libre → IA extrae campos → cards editables + mapa live
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

async function nominatim(dir) {
  if (!dir) return { lat: null, lng: null };
  const query = encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina");
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ar`,
      { headers: { "Accept-Language": "es" } }
    );
    const d = await r.json();
    if (d.length > 0) {
      const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
      if (lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40)
        return { lat, lng };
    }
  } catch(e) {}
  return { lat: null, lng: null };
}

function parsearTextoLocal(texto) {
  const t = texto.toLowerCase();

  // ── Tipo de inmueble ───────────────────────────────────────
  const tipo =
    /tipo de inmueble:\s*departamento|departamento|depto|dpto/i.test(texto) ? "Departamento" :
    /tipo de inmueble:\s*ph|\bph\b|planta alta/i.test(texto)                ? "PH" :
    /tipo de inmueble:\s*d[úu]plex|duplex|d[úu]plex/i.test(texto)          ? "Dúplex" :
    /tipo de inmueble:\s*local|\blocal\b|comercial/i.test(texto)            ? "Local" :
    /tipo de inmueble:\s*terreno|terreno|lote/i.test(texto)                 ? "Terreno" :
    /tipo de inmueble:\s*casa|\bcasa\b|chalet|vivienda/i.test(texto)        ? "Casa" : null;

  // ── Operación ──────────────────────────────────────────────
  const operacion =
    /tipo operaci[oó]n:\s*alquiler|alquil/i.test(texto) ? "alquiler" : "venta";

  // ── Precio — múltiples formatos ────────────────────────────
  // "U$D  141,900" / "USD 85.000" / "$ 141900"
  const precioMatch =
    texto.match(/u\$d\s*([\d]{1,3}(?:[.,][\d]{3})*)/i) ||
    texto.match(/usd?\s*([\d]{1,3}(?:[.,][\d]{3})*)/i) ||
    texto.match(/u\$s?\s*([\d]{1,3}(?:[.,][\d]{3})*)/i) ||
    texto.match(/([\d]{2,3}[.,][\d]{3})\s*(?:usd?|u\$)/i);
  const precioRaw = precioMatch ? precioMatch[1].replace(/\./g,"").replace(",","") : null;
  const precio = precioRaw ? parseInt(precioRaw) : null;

  // ── Ambientes ──────────────────────────────────────────────
  const ambMatch =
    texto.match(/ambientes:\s*\n?\s*(\d)/i) ||
    texto.match(/(\d)\s*amb(?:ientes?)?/i);
  const ambientes = ambMatch ? parseInt(ambMatch[1]) : null;

  // ── Dormitorios ────────────────────────────────────────────
  const dormMatch = texto.match(/dormitorios:\s*\n?\s*(\d)/i);
  const dormitorios = dormMatch ? parseInt(dormMatch[1]) : null;

  // ── Superficie ─────────────────────────────────────────────
  // "Sup. cubierta:\n70.00 m²" / "70 m²"
  const m2cubMatch = texto.match(/sup(?:\.|erficie)?\s*cubierta:\s*\n?\s*([\d.,]+)\s*m/i);
  const m2Match    = texto.match(/superficie\s+total:\s*([\d.,]+)\s*m/i)
    || texto.match(/([\d]{2,4})[.,]?\d*\s*m[²2]/i);
  const m2cub = m2cubMatch ? parseFloat(m2cubMatch[1]) : null;
  const m2tot = m2Match ? parseFloat(m2Match[1].replace(",",".")) : m2cub;

  // ── Dirección ──────────────────────────────────────────────
  // "Dirección: corrientes 2244" / "corrientes 2244"
  let direccion = null;
  const dirMatch =
    texto.match(/direcci[oó]n:\s*([^\n\r]+)/i) ||
    texto.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s\.]{3,25})\s+(\d{3,5})\b/);
  if (dirMatch) {
    direccion = dirMatch[1]
      ? dirMatch[1].trim().replace(/\s+/g," ")
      : null;
    if (dirMatch[2]) direccion = (dirMatch[1]||"").trim() + " " + dirMatch[2];
    // Capitalizar
    if (direccion) direccion = direccion.split(" ")
      .map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(" ");
  }

  // ── Zona/barrio ────────────────────────────────────────────
  const BARRIOS = [
    "la perla","chauvin","centro","güemes","punta mogotes","alfar",
    "bosque grande","san carlos","los pinares","playa grande","divino rostro",
    "constitución","pompeya","santa rosa","floresta","libertad","san jorge",
    "las heras","camet","villa primera","santa monica","luro","caisamar",
    "estrada","chapadmalal","batán","sierra de los padres","peralta ramos",
    "villa del parque","nueva pompey","félix u. camet","bernardino rivadavia",
  ];
  // Intentar "Barrio: CENTRO" primero
  const barrioMatch = texto.match(/barrio:\s*([^\n\r]+)/i);
  let zona = null;
  if (barrioMatch) {
    zona = barrioMatch[1].trim().toLowerCase();
    // Normalizar a nombre conocido
    zona = BARRIOS.find(b => zona.includes(b)) || zona;
    zona = zona.charAt(0).toUpperCase() + zona.slice(1);
  } else {
    const found = BARRIOS.find(b => t.includes(b));
    zona = found ? found.charAt(0).toUpperCase()+found.slice(1) : null;
  }

  // ── Cochera ────────────────────────────────────────────────
  const cochera = /cochera/i.test(texto) && !/sin cochera/i.test(texto) ? "si"
    : /sin cochera/i.test(texto) ? "no" : null;

  // ── Teléfono ───────────────────────────────────────────────
  const telMatch = texto.match(/(?:\+?54\s*9?\s*)?(?:223|2235|2236|2234|2238)[\s\-]?(\d[\d\s\-]{5,9}\d)/);
  const telefono = telMatch ? telMatch[0].replace(/[\s\-]/g,"") : null;

  // ── Características relevantes ─────────────────────────────
  const caracts = [
    ambientes && `${ambientes} amb`,
    dormitorios && `${dormitorios} dorm`,
    m2cub && `${m2cub}m² cub`,
    /balc[oó]n/i.test(texto) && "balcón",
    /pileta|piscina/i.test(texto) && "pileta",
    /parrilla/i.test(texto) && "parrilla",
    cochera === "si" && "cochera",
    /amoblado|amueblado|con muebles/i.test(texto) && "amoblado",
    /luminoso/i.test(texto) && "luminoso",
  ].filter(Boolean).join(", ") || null;

  return {
    tipo, precio, ambientes, m2tot, m2cub, zona, telefono, cochera,
    operacion, direccion, caracts, dormitorios,
    campos_faltantes: [!tipo&&"tipo",!zona&&"zona",!precio&&"precio"].filter(Boolean),
    fuera_de_mdp: false,
  };
}

async function analizarConIA(texto) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    if (res.ok) {
      const text = await res.text();
      const trimmed = text.replace(/```json|```/g, "").trim();
      if (trimmed && trimmed !== "{}") {
        const parsed = JSON.parse(trimmed);
        if (parsed.tipo || parsed.precio || parsed.zona) return parsed;
      }
    }
  } catch(e) {}
  // Sin creditos IA o respuesta vacia — usar parser local
  return parsearTextoLocal(texto);
}

function MapaCaptaciones({ items }) {
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const marksRef = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || leafRef.current) return;
    const map = window.L.map(mapRef.current, { center: [-38.002, -57.555], zoom: 13 });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, [ready]);

  useEffect(() => {
    if (!ready || !leafRef.current) return;
    const map = leafRef.current;
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];
    const conCoords = items.filter(i => i.lat && i.lng);
    conCoords.forEach(item => {
      const agObj = AG[item.ag];
      const color = agObj ? agObj.bg : "#E8A830";
      const icon = window.L.divIcon({
        className: "",
        html: `<div style="background:#0F1E35;border:2.5px solid ${color};border-radius:10px 10px 10px 2px;padding:5px 9px;font-size:11px;font-weight:700;color:${color};white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.55);transform:translateY(-100%)">${item.tipo||"Prop"} ${item.precio?"USD "+(item.precio/1000).toFixed(0)+"k":""}</div>`,
        iconAnchor: [0, 0],
      });
      const marker = window.L.marker([item.lat, item.lng], { icon }).addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;font-size:12px;min-width:160px"><strong>${item.tipo||"Propiedad"}</strong><br/>${item.zona||""} ${item.direccion?"· "+item.direccion:""}<br/>${item.precio?"USD "+Number(item.precio).toLocaleString():"Sin precio"}<br/>${item.ambientes?item.ambientes+" amb · ":""}${item.m2tot?item.m2tot+"m²":""}</div>`);
      marksRef.current.push(marker);
    });
    if (conCoords.length > 0) {
      const bounds = window.L.latLngBounds(conCoords.map(i => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [ready, items]);

  const conCoords = items.filter(i => i.lat && i.lng);
  return (
    <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, fontWeight:700, color:B.accentL }}>📍 Mapa de captaciones</span>
        <span style={{ fontSize:11, color:"#4A6A90" }}>{conCoords.length} con ubicación</span>
      </div>
      {conCoords.length === 0 ? (
        <div style={{ padding:"24px", textAlign:"center", color:"#4A6A90", fontSize:12 }}>Las captaciones con dirección aparecerán aquí</div>
      ) : (
        <div ref={mapRef} style={{ height:300 }} />
      )}
      <style>{`.leaflet-container{background:${B.bg}!important}.leaflet-tile{filter:brightness(0.85) saturate(0.7) hue-rotate(200deg)}.leaflet-control-zoom a{background:${B.card}!important;color:${B.accentL}!important;border-color:${B.border}!important}.leaflet-control-attribution{background:rgba(7,14,28,0.8)!important;color:#4A6A90!important;font-size:9px}.leaflet-popup-content-wrapper{background:#0F1E35;border:1px solid #1E3A5F;color:#C8D8E8;border-radius:8px}.leaflet-popup-tip{background:#0F1E35}`}</style>
    </div>
  );
}

function CaptacionCard({ item, supabase, onConvertir, onEliminar, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    tipo: item.tipo||"", zona: item.zona||"", direccion: item.direccion||"",
    precio: item.precio||"", ambientes: item.ambientes||"", m2tot: item.m2tot||"",
    cochera: item.cochera||"", nombre_propietario: item.nombre_propietario||"",
    telefono: item.telefono||"", caracts: item.caracts||"",
    operacion: item.operacion||"venta", nota: item.nota||"",
    ag: item.ag||"", inmobiliaria: item.inmobiliaria||"",
    url: item.url||"", nota_interna: item.nota_interna||"",
  });

  const agObj = AG[item.ag];
  const diasVida = Math.floor((new Date() - new Date(item.created_at)) / 86400000);
  const expirada = diasVida >= 21;
  const proxExpira = diasVida >= 18 && diasVida < 21;
  const esCompartida = !!item.inmobiliaria;
  const borderColor = esCompartida ? "#9B6DC8" : B.accentL;
  const chips = [item.ambientes&&`${item.ambientes} amb`,item.m2tot&&`${item.m2tot}m²`,item.cochera==="si"&&"🚗 cochera",item.cochera==="no"&&"❌ s/cochera"].filter(Boolean);

  async function guardarEdicion() {
    setSaving(true);
    const updates = {
      tipo:form.tipo||null, zona:form.zona||null, direccion:form.direccion||null,
      precio:form.precio?Number(form.precio):null, ambientes:form.ambientes?Number(form.ambientes):null,
      m2tot:form.m2tot?Number(form.m2tot):null, cochera:form.cochera||null,
      nombre_propietario:form.nombre_propietario||null, telefono:form.telefono||null,
      caracts:form.caracts||null, operacion:form.operacion||"venta", nota:form.nota||null,
      ag:form.ag||null, inmobiliaria:form.inmobiliaria||null, url:form.url||null,
      nota_interna:form.nota_interna||null,
    };
    if (form.direccion !== item.direccion) {
      const c = await nominatim(form.direccion || form.zona);
      if (c.lat) { updates.lat = c.lat; updates.lng = c.lng; }
    }
    const { error } = await supabase.from("captaciones").update(updates).eq("id", item.id);
    if (!error) { onUpdate(item.id, updates); setEditing(false); }
    setSaving(false);
  }

  const inp = { width:"100%", background:B.bg, border:"1px solid "+B.border, borderRadius:6, padding:"6px 9px", color:B.text, fontSize:12, outline:"none", boxSizing:"border-box" };
  const fmtFecha = iso => new Date(iso).toLocaleDateString("es-AR",{ day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

  return (
    <div style={{ background:B.card, border:`1px solid ${open?borderColor:B.border}`, borderLeft:`3px solid ${borderColor}`, borderRadius:10, overflow:"hidden" }}>
      <div onClick={() => !editing && setOpen(o=>!o)} style={{ padding:"11px 13px", cursor:editing?"default":"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, flexWrap:"wrap" }}>
          {item.tipo && <span style={{ fontSize:11, padding:"1px 7px", borderRadius:12, background:B.accentL+"18", color:B.accentL }}>{item.tipo}</span>}
          {item.operacion && <span style={{ fontSize:11, padding:"1px 7px", borderRadius:12, background:"#4A6A9020", color:"#8AAECC" }}>{item.operacion}</span>}
          {agObj && <span style={{ fontSize:10, padding:"1px 5px", borderRadius:3, background:agObj.bg, color:agObj.c, fontWeight:600 }}>{agObj.n}</span>}
          {esCompartida && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:12, background:"#9B6DC820", color:"#9B6DC8", border:"1px solid #9B6DC840", fontWeight:600 }}>🤝 {item.inmobiliaria}</span>}
          {item.lat && <span style={{ fontSize:10, color:"#2E9E6A" }}>📍</span>}
          {expirada && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8, background:"rgba(204,34,51,0.2)", color:"#CC2233", fontWeight:700 }}>🔴 Expirada</span>}
          {proxExpira && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8, background:"rgba(232,168,48,0.2)", color:"#E8A830", fontWeight:700 }}>⏰ {21-diasVida}d</span>}
          <span style={{ fontSize:11, color:"#4A6A90", marginLeft:"auto" }}>{fmtFecha(item.created_at)}</span>
          <span style={{ fontSize:12, color:B.accentL }}>{open?"▲":"▼"}</span>
        </div>
        {(item.zona||item.direccion) && <div style={{ fontSize:12, color:"#8AAECC", marginBottom:4 }}>{[item.zona,item.direccion].filter(Boolean).join(" · ")}</div>}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {item.precio && <span style={{ fontSize:15, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>USD {Number(item.precio).toLocaleString()}</span>}
          {chips.map((c,i) => <span key={i} style={{ fontSize:10, padding:"1px 7px", borderRadius:10, background:"rgba(42,91,173,0.15)", color:"#8AAECC", border:"1px solid #1E3A5F" }}>{c}</span>)}
        </div>
      </div>

      {open && !editing && (
        <div style={{ borderTop:`1px solid ${B.border}`, padding:"11px 13px", background:"rgba(10,21,37,0.4)", display:"flex", flexDirection:"column", gap:8 }}>
          {item.nombre_propietario && (
            <div style={{ fontSize:12, color:"#8AAECC" }}>
              👤 {item.nombre_propietario}
              {item.telefono && <a href={`https://wa.me/${item.telefono.replace(/\D/g,"")}`} target="_blank" style={{ marginLeft:8, color:"#2E9E6A", textDecoration:"none", fontSize:11 }}>💬 {item.telefono}</a>}
            </div>
          )}
          {item.caracts && <div style={{ fontSize:12, color:"#8AAECC" }}>✅ {item.caracts}</div>}
          {item.nota && <div style={{ fontSize:11, color:"#6A8AAE", fontStyle:"italic" }}>"{item.nota}"</div>}
          {item.nota_interna && <div style={{ fontSize:12, color:"#8AAECC", background:"rgba(42,91,173,0.08)", borderRadius:6, padding:"6px 9px", borderLeft:`2px solid ${B.accentL}` }}>📝 {item.nota_interna}</div>}
          {item.url && <a href={item.url} target="_blank" style={{ fontSize:11, color:B.accentL, textDecoration:"none" }}>🔗 Ver en portal</a>}
          {item.contenido && <div style={{ fontSize:10, color:"#4A6A90", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{item.contenido}</div>}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
            <button onClick={()=>setEditing(true)} style={{ flex:1, padding:"7px", borderRadius:7, cursor:"pointer", background:B.accent+"22", border:`1px solid ${B.accentL}60`, color:B.accentL, fontSize:12, fontWeight:600 }}>✏️ Editar</button>
            <button onClick={()=>onConvertir(item)} style={{ flex:1, padding:"7px", borderRadius:7, cursor:"pointer", background:"#2E9E6A18", border:"1px solid #2E9E6A40", color:"#2E9E6A", fontSize:12, fontWeight:600 }}>✓ Convertida</button>
            <button onClick={()=>onEliminar(item)} style={{ padding:"7px 12px", borderRadius:7, cursor:"pointer", background:"transparent", border:`1px solid ${B.hot}40`, color:B.hot, fontSize:12 }}>🗑</button>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ borderTop:`1px solid ${B.accentL}40`, padding:"11px 13px", background:"rgba(10,21,37,0.6)", display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ fontSize:11, fontWeight:700, color:B.accentL, marginBottom:2 }}>Editando captación</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
                <option value="">Sin tipo</option>
                {["Departamento","Casa","PH","Dúplex","Local","Terreno","Otro"].map(t=><option key={t}>{t}</option>)}
              </select></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>OPERACIÓN</label>
              <select value={form.operacion} onChange={e=>setForm(f=>({...f,operacion:e.target.value}))} style={inp}>
                <option value="venta">Venta</option><option value="alquiler">Alquiler</option>
              </select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>ZONA</label><input value={form.zona} onChange={e=>setForm(f=>({...f,zona:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>DIRECCIÓN</label><input value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>PRECIO USD</label><input type="number" value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>AMBIENTES</label><input type="number" value={form.ambientes} onChange={e=>setForm(f=>({...f,ambientes:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>M²</label><input type="number" value={form.m2tot} onChange={e=>setForm(f=>({...f,m2tot:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>COCHERA</label>
              <select value={form.cochera} onChange={e=>setForm(f=>({...f,cochera:e.target.value}))} style={inp}>
                <option value="">Sin datos</option><option value="si">Con cochera</option><option value="no">Sin cochera</option>
              </select></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>AGENTE</label>
              <select value={form.ag} onChange={e=>setForm(f=>({...f,ag:e.target.value}))} style={inp}>
                <option value="">Sin agente</option>
                {Object.entries(AG).map(([k,v])=><option key={k} value={k}>{v.n}</option>)}
              </select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>PROPIETARIO</label><input value={form.nombre_propietario} onChange={e=>setForm(f=>({...f,nombre_propietario:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>TELÉFONO</label><input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} style={inp} /></div>
          </div>
          <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>CARACTERÍSTICAS</label><input value={form.caracts} onChange={e=>setForm(f=>({...f,caracts:e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>NOTA</label><input value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} style={inp} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <div><label style={{ fontSize:10, color:"#9B6DC8", display:"block", marginBottom:2 }}>🤝 INMOBILIARIA</label><input value={form.inmobiliaria} onChange={e=>setForm(f=>({...f,inmobiliaria:e.target.value}))} placeholder="ej: RE/MAX..." style={{...inp,borderColor:form.inmobiliaria?"#9B6DC8":B.border}} /></div>
            <div><label style={{ fontSize:10, color:"#4A8ABE", display:"block", marginBottom:2 }}>🔗 LINK</label><input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." style={{...inp,borderColor:form.url?"#4A8ABE":B.border}} /></div>
          </div>
          <div><label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:2 }}>📝 NOTA INTERNA</label><input value={form.nota_interna} onChange={e=>setForm(f=>({...f,nota_interna:e.target.value}))} style={inp} /></div>
          <div style={{ display:"flex", gap:7, marginTop:4 }}>
            <button onClick={guardarEdicion} disabled={saving} style={{ flex:1, padding:"8px", borderRadius:7, cursor:saving?"default":"pointer", background:saving?B.border:B.accent, border:`1px solid ${saving?B.border:B.accentL}`, color:saving?"#8AAECC":"#fff", fontSize:12, fontWeight:700 }}>{saving?"Guardando...":"Guardar"}</button>
            <button onClick={()=>setEditing(false)} style={{ padding:"8px 14px", borderRadius:7, cursor:"pointer", background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Captaciones({ supabase }) {
  const [items,       setItems]       = useState([]);
  const [input,       setInput]       = useState("");
  const [ag,          setAg]          = useState("");
  const [nota,        setNota]        = useState("");
  const [analizando,  setAnalizando]  = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [campos,      setCampos]      = useState(null);
  const [completos,   setCompletos]   = useState({});
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [loaded,      setLoaded]      = useState(false);
  const [vistaActiva, setVistaActiva] = useState("cards");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("captaciones").select("*").eq("convertida", false).order("created_at", { ascending: false });
      const items = data || [];
      const hoy = new Date();
      const aEliminar = items.filter(i => Math.floor((hoy-new Date(i.created_at))/86400000)>=24 && i.expiracion_notificada);
      for (const i of aEliminar) await supabase.from("captaciones").delete().eq("id", i.id);
      const aNotificar = items.filter(i => Math.floor((hoy-new Date(i.created_at))/86400000)>=21 && !i.expiracion_notificada);
      for (const i of aNotificar) await supabase.from("captaciones").update({ expiracion_notificada: true }).eq("id", i.id);
      setItems(items.filter(i => !aEliminar.find(e => e.id===i.id)));
      setLoaded(true);
    }
    load();
  }, []);

  function prerellenar(result) {
    setCampos(result || {});
    if (result) {
      const pre = {};
      ["tipo","zona","direccion","precio","ambientes","m2tot","cochera",
       "nombre_propietario","telefono","caracts","operacion"].forEach(k => {
        if (result[k] !== null && result[k] !== undefined) pre[k] = result[k];
      });
      setCompletos(pre);
    }
  }

  async function analizar() {
    if (!input.trim() || analizando) return;
    setAnalizando(true); setCampos(null); setCompletos({});
    const result = await analizarConIA(input);
    prerellenar(result);
    setAnalizando(false);
  }

  function analizarLocal() {
    if (!input.trim()) return;
    setCampos(null); setCompletos({});
    const result = parsearTextoLocal(input);
    prerellenar(result);
  }

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    const get = k => completos[k] !== undefined ? completos[k] : campos?.[k] ?? null;
    const dir = get("direccion"), zona = get("zona");
    let lat = null, lng = null;
    if (dir) { const c = await nominatim(dir); lat=c.lat; lng=c.lng; }
    if (!lat && zona) { const c = await nominatim(zona); lat=c.lat; lng=c.lng; }
    const { data, error } = await supabase.from("captaciones").insert([{
      contenido: input.trim(), tipo:get("tipo"), zona, direccion:dir,
      precio:get("precio")?Number(get("precio")):null,
      ambientes:get("ambientes")?Number(get("ambientes")):null,
      m2tot:get("m2tot")?Number(get("m2tot")):null,
      cochera:get("cochera"), nombre_propietario:get("nombre_propietario"),
      telefono:get("telefono"), caracts:get("caracts"),
      operacion:get("operacion")||"venta", nota:nota.trim()||null,
      ag:ag||null, lat, lng, convertida:false,
    }]).select().single();
    if (!error && data) {
      setItems(p=>[data,...p]);
      setInput(""); setNota(""); setCampos(null); setCompletos({});
    }
    setGuardando(false);
  }

  async function eliminar() {
    if (!confirmDel) return;
    await supabase.from("captaciones").delete().eq("id", confirmDel.id);
    setItems(p=>p.filter(i=>i.id!==confirmDel.id));
    setConfirmDel(null);
  }

  async function convertir(item) {
    await supabase.from("captaciones").update({ convertida: true }).eq("id", item.id);
    setItems(p=>p.filter(i=>i.id!==item.id));
  }

  const inpS = { width:"100%", background:B.card, border:`1px solid ${B.border}`, borderRadius:7, padding:"7px 10px", color:B.text, fontSize:12, outline:"none", boxSizing:"border-box" };
  const conUbicacion = items.filter(i=>i.lat&&i.lng).length;

  const CAMPOS_DEF = [
    { k:"tipo",      label:"Tipo",        type:"select", opts:["","Departamento","Casa","PH","Dúplex","Local","Terreno","Otro"] },
    { k:"operacion", label:"Operación",   type:"select", opts:["venta","alquiler"] },
    { k:"zona",      label:"Zona/barrio", type:"text",   placeholder:"ej: La Perla", full:true },
    { k:"direccion", label:"Dirección",   type:"text",   placeholder:"ej: San Martín 1234", full:true },
    { k:"precio",    label:"Precio USD",  type:"number", placeholder:"85000" },
    { k:"ambientes", label:"Ambientes",   type:"number", placeholder:"2" },
    { k:"m2tot",     label:"M²",          type:"number", placeholder:"50" },
    { k:"cochera",   label:"Cochera",     type:"select", opts:["","si","no"] },
    { k:"nombre_propietario", label:"Propietario", type:"text" },
    { k:"telefono",  label:"Teléfono",    type:"text" },
    { k:"caracts",   label:"Características", type:"text", placeholder:"ej: luminoso, balcón...", full:true },
  ];

  return (
    <div style={{ overflowY:"auto", maxWidth:700, display:"flex", flexDirection:"column", gap:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Captación rápida</h1>
          <p style={{ fontSize:12, color:"#8AAECC", margin:"3px 0 0" }}>Pegá texto, link o WhatsApp — la IA extrae todo</p>
        </div>
        <div style={{ display:"flex", gap:4, background:B.card, borderRadius:8, padding:3, border:`1px solid ${B.border}` }}>
          {["cards","mapa"].map(v => (
            <button key={v} onClick={()=>setVistaActiva(v)}
              style={{ padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600,
                background:vistaActiva===v?B.accent:"transparent",
                color:vistaActiva===v?"#fff":"#8AAECC", border:"none" }}>
              {v==="cards"?`📋 Cards (${items.length})`:`📍 Mapa (${conUbicacion})`}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
        <textarea value={input} onChange={e=>{ setInput(e.target.value); setCampos(null); setCompletos({}); }}
          placeholder="Pegá acá el texto de WhatsApp, descripción del portal, dirección y precio... lo que tengas"
          rows={5} style={{ ...inpS, resize:"none", lineHeight:1.6 }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:3 }}>AGENTE</label>
            <select value={ag} onChange={e=>setAg(e.target.value)} style={inpS}>
              <option value="">Sin especificar</option>
              {Object.entries(AG).map(([k,v])=><option key={k} value={k}>{v.n}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:3 }}>NOTA RÁPIDA</label>
            <input value={nota} onChange={e=>setNota(e.target.value)} style={inpS} placeholder="ej: paga honorarios" />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <button onClick={analizarLocal} disabled={!input.trim()}
            style={{ padding:11, borderRadius:9, cursor:input.trim()?"pointer":"default",
              background:input.trim()?"#1E3A5F":B.border,
              border:`1px solid ${input.trim()?B.accentL:B.border}`,
              color:input.trim()?B.accentL:"#8AAECC", fontSize:13, fontWeight:700 }}>
            📋 Analizar
          </button>
          <button onClick={analizar} disabled={analizando||!input.trim()}
            style={{ padding:11, borderRadius:9, cursor:input.trim()&&!analizando?"pointer":"default",
              background:input.trim()&&!analizando?B.accent:B.border,
              border:`1px solid ${input.trim()&&!analizando?B.accentL:B.border}`,
              color:input.trim()&&!analizando?"#fff":"#8AAECC", fontSize:13, fontWeight:700 }}>
            {analizando?"✨ Analizando...":"✨ Analizar con IA"}
          </button>
        </div>
      </div>

      {/* Resultado IA */}
      {campos && (
        <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:B.accentL, letterSpacing:"0.8px" }}>DATOS DETECTADOS — editá lo que haga falta</div>
          {campos.fuera_de_mdp && (
            <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(232,100,80,0.15)", border:"1px solid rgba(232,100,80,0.4)", fontSize:12, color:"#E86450" }}>
              ⚠ Parece ser de <strong>{campos.ciudad_detectada||"otra ciudad"}</strong>. ¿Guardás igual?
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {CAMPOS_DEF.filter(f=>!f.full&&(f.type==="select"||["precio","ambientes","m2tot"].includes(f.k)===false)).slice(0,2).map(({ k, label, type, opts }) => {
              const val = completos[k]!==undefined?completos[k]:(campos[k]||"");
              const detected = !!campos[k];
              return (
                <div key={k}>
                  <label style={{ fontSize:10, color:detected?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{detected?"✓ ":""}{label.toUpperCase()}</label>
                  <select value={val} onChange={e=>setCompletos(p=>({...p,[k]:e.target.value}))} style={inpS}>
                    {opts.map(o=><option key={o} value={o}>{o||"—"}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
          {/* Zona y dirección — full width */}
          {["zona","direccion"].map(k => {
            const def = CAMPOS_DEF.find(f=>f.k===k);
            const val = completos[k]!==undefined?completos[k]:(campos[k]||"");
            const detected = !!campos[k];
            return (
              <div key={k}>
                <label style={{ fontSize:10, color:detected?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{detected?"✓ ":""}{def.label.toUpperCase()}</label>
                <input value={val} onChange={e=>setCompletos(p=>({...p,[k]:e.target.value}))}
                  placeholder={def.placeholder||""} style={{...inpS,borderColor:detected?"#2E9E6A40":inpS.border}} />
              </div>
            );
          })}
          {/* Precio, ambientes, m2 — 3 cols */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {["precio","ambientes","m2tot"].map(k => {
              const def = CAMPOS_DEF.find(f=>f.k===k);
              const val = completos[k]!==undefined?completos[k]:(campos[k]||"");
              const detected = !!campos[k];
              return (
                <div key={k}>
                  <label style={{ fontSize:10, color:detected?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{detected?"✓ ":""}{def.label.toUpperCase()}</label>
                  <input type="number" value={val} onChange={e=>setCompletos(p=>({...p,[k]:e.target.value}))}
                    placeholder={def.placeholder||""} style={{...inpS,borderColor:detected?"#2E9E6A40":inpS.border}} />
                </div>
              );
            })}
          </div>
          {/* Cochera select */}
          <div>
            <label style={{ fontSize:10, color:campos.cochera?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{campos.cochera?"✓ ":""}COCHERA</label>
            <select value={completos.cochera!==undefined?completos.cochera:(campos.cochera||"")} onChange={e=>setCompletos(p=>({...p,cochera:e.target.value}))} style={inpS}>
              <option value="">Sin datos</option><option value="si">Con cochera</option><option value="no">Sin cochera</option>
            </select>
          </div>
          {/* Propietario y teléfono */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {["nombre_propietario","telefono"].map(k => {
              const def = CAMPOS_DEF.find(f=>f.k===k);
              const val = completos[k]!==undefined?completos[k]:(campos[k]||"");
              const detected = !!campos[k];
              return (
                <div key={k}>
                  <label style={{ fontSize:10, color:detected?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{detected?"✓ ":""}{def.label.toUpperCase()}</label>
                  <input value={val} onChange={e=>setCompletos(p=>({...p,[k]:e.target.value}))}
                    style={{...inpS,borderColor:detected?"#2E9E6A40":inpS.border}} />
                </div>
              );
            })}
          </div>
          {/* Caracts */}
          {(() => {
            const val = completos.caracts!==undefined?completos.caracts:(campos.caracts||"");
            const detected = !!campos.caracts;
            return (
              <div>
                <label style={{ fontSize:10, color:detected?"#2E9E6A":"#E8A830", display:"block", marginBottom:2 }}>{detected?"✓ ":""}CARACTERÍSTICAS</label>
                <input value={val} onChange={e=>setCompletos(p=>({...p,caracts:e.target.value}))}
                  placeholder="ej: luminoso, 1er piso, balcón..." style={{...inpS,borderColor:detected?"#2E9E6A40":inpS.border}} />
              </div>
            );
          })()}
          <button onClick={guardar} disabled={guardando}
            style={{ width:"100%", padding:10, borderRadius:9, cursor:guardando?"default":"pointer",
              background:guardando?B.border:"#2E9E6A", border:`1px solid ${guardando?B.border:"#2E9E6A"}`,
              color:guardando?"#8AAECC":"#fff", fontSize:13, fontWeight:700, marginTop:4 }}>
            {guardando?"Guardando...":"📌 Guardar captación"}
          </button>
        </div>
      )}

      {/* Vista cards o mapa */}
      {vistaActiva==="mapa" ? (
        <MapaCaptaciones items={items} />
      ) : (
        <>
          <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px" }}>{items.length} CAPTACIONES PENDIENTES</div>
          {!loaded && <div style={{ textAlign:"center", color:"#8AAECC", fontSize:12 }}>Cargando...</div>}
          {loaded && items.length===0 && <div style={{ textAlign:"center", padding:"30px 0", color:"#8AAECC", fontSize:12 }}>Sin captaciones pendientes</div>}
          {items.map(item => (
            <CaptacionCard key={item.id} item={item} supabase={supabase}
              onConvertir={convertir} onEliminar={setConfirmDel}
              onUpdate={(id,upd)=>setItems(p=>p.map(i=>i.id===id?{...i,...upd}:i))} />
          ))}
        </>
      )}

      {/* Modal eliminar */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={()=>setConfirmDel(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.hot}50`, borderRadius:14, padding:"28px 32px", maxWidth:360, width:"90%" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:14, fontWeight:700, color:B.text, marginBottom:6 }}>¿Eliminar captación?</div>
            <div style={{ fontSize:12, color:"#8AAECC", marginBottom:20 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDel(null)} style={{ flex:1, padding:10, borderRadius:8, cursor:"pointer", background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>Cancelar</button>
              <button onClick={eliminar} style={{ flex:1, padding:10, borderRadius:8, cursor:"pointer", background:B.hot, border:"none", color:"#fff", fontSize:12, fontWeight:700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
