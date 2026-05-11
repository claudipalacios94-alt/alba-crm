// ══════════════════════════════════════════════════════════════ 
// ALBA CRM — APP SHELL PRINCIPAL
// Navegación, modales, layout global
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B, AG } from "./data/constants.js";
import { useSupabase, signIn, signOut, onAuthChange, supabase } from "./hooks/useSupabase.js";
import Login from "./components/Login.jsx";
 
// Componentes
import SupabaseStatus  from "./components/SupabaseStatus.jsx";
import Briefing        from "./components/Briefing.jsx";
import Kanban          from "./components/Kanban.jsx";
import CRMLeads        from "./components/CRMLeads.jsx";
import Propiedades     from "./components/Propiedades.jsx";
import Alquileres      from "./components/Alquileres.jsx";
import Cuaderno        from "./components/Cuaderno.jsx";
import Buscador        from "./components/Buscador.jsx";
import Mapa            from "./components/Mapa.jsx";
import Flyer           from "./components/Flyer.jsx";
import Captaciones     from "./components/Captaciones.jsx";
import CaptacionZonas  from "./components/CaptacionZonas.jsx";
 
// Modales
import Modal           from "./modals/Modal.jsx";
import QuickAddLead    from "./modals/QuickAddLead.jsx";
import QuickAddProp    from "./modals/QuickAddProp.jsx";
 
// ── Navegación ────────────────────────────────────────────────
const NAV = [
  { id:"briefing",    label:"Briefing del día",  badge:"HOY" },
  { id:"buscador",    label:"Buscador",            badge:"NEW" },
  { id:"cuaderno",    label:"Cuaderno de campo" },
  { id:"kanban",      label:"Kanban" },
  { id:"crm",         label:"CRM Leads" },
  { id:"propiedades", label:"Propiedades" },
  { id:"alquileres",  label:"Alquileres" },
  { id:"mapa",        label:"Mapa" },
  { id:"flyer",       label:"Generador Flyer" },
  { id:"captaciones",  label:"Captación rápida", badge:"NEW" },
  { id:"zonas",        label:"Captación zonas" },
];
 
const FULL_HEIGHT = ["kanban", "mapa", "flyer", "captaciones", "zonas", "cuaderno"];
 
export default function App() {
  const [view,  setView]  = useState("briefing");
  const [captaciones, setCaptaciones] = useState([]);

  // ── Créditos IA ───────────────────────────────────────────
  const [saldoIA, setSaldoIA] = useState(() => {
    try { const s = localStorage.getItem("alba_saldo_ia"); return s ? parseFloat(s) : null; } catch(e) { return null; }
  });
  const [consumoIA, setConsumoIA] = useState(() => {
    try { const s = localStorage.getItem("alba_consumo_ia"); return s ? parseFloat(s) : 0; } catch(e) { return 0; }
  });
  const [editSaldo, setEditSaldo] = useState(false);
  const [inputSaldo, setInputSaldo] = useState("");
  const [modal, setModal] = useState(null);
  const [user,  setUser]  = useState(undefined); // undefined=cargando, null=no auth, obj=autenticado
 
  // ── Auth state ────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(setUser);
    return () => subscription.unsubscribe();
  }, []);
 
  const {
    leads, properties, rentals,
    loading, error, lastSync,
    reload, addLead, updateLead, deleteLead,
    addProperty, updateProperty, deleteProperty, addInteraction, getInteractions,
    saveSearchResult, getSearchResult,
  } = useSupabase();
 
  // Cargar captaciones
  useEffect(() => {
    if (!supabase) return;
    supabase.from("captaciones").select("*").eq("convertida", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCaptaciones(data || []));
  }, []);

  const sinAsignar = leads.filter(l => !l.ag && l.etapa !== "Cerrado" && l.etapa !== "Perdido").length;
  const isFullH    = FULL_HEIGHT.includes(view);
 
  async function handleAddLead(lead) {
    await addLead(lead);
    setModal(null);
    setView("crm");
  }
 
  async function handleAddProp(prop) {
    await addProperty(prop);
    setModal(null);
    setView("propiedades");
  }
 
  // ── Pantalla de carga ─────────────────────────────────────
  if (user === undefined) {
    return (
      <div style={{ height:"100vh", background:B.bg, display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:32, height:32, border:`2px solid ${B.border}`,
          borderTop:`2px solid ${B.accentL}`, borderRadius:"50%",
          animation:"spin .7s linear infinite" }} />
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  }
 
  // ── Login ─────────────────────────────────────────────────
  if (!user) {
    return <Login onLogin={signIn} />;
  }
 


  function agregarConsumo(inputTokens, outputTokens) {
    const costoBase = (inputTokens / 1000 * 0.00025) + (outputTokens / 1000 * 0.00125);
    const costo = costoBase * 1.05; // +5% margen de seguridad
    const nuevo = parseFloat((consumoIA + costo).toFixed(6));
    setConsumoIA(nuevo);
    localStorage.setItem("alba_consumo_ia", nuevo);
  }

  function guardarSaldo() {
    const v = parseFloat(inputSaldo);
    if (!isNaN(v) && v > 0) {
      setSaldoIA(v);
      localStorage.setItem("alba_saldo_ia", v);
    }
    setEditSaldo(false);
  }

  // ── App principal ─────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", background:B.bg,
      fontFamily:"'DM Sans',sans-serif", color:B.text,
      overflow:"hidden", position:"relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1A2F50; border-radius: 2px; }
        .nav-btn:hover { background: rgba(42,91,173,0.12) !important; color: #6AAEF8 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div style={{ width:210, background:"#080F1E", borderRight:"none",
        display:"flex", flexDirection:"column", flexShrink:0, position:"relative" }}>

        {/* Franja azul superior */}
        <div style={{ height:3, background:"linear-gradient(90deg,#1A3A7A,#3A6AD4,#5A9AFF,#3A6AD4,#1A3A7A)", flexShrink:0 }} />

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px 12px" }}>
          <div style={{ width:34, height:34, borderRadius:8,
            background:"linear-gradient(135deg,#1A3A7A,#2A5BAD)", border:"1px solid #2A5BAD",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:17, fontWeight:700, color:"#7AB8FF",
            fontFamily:"'Cormorant Garamond',serif", flexShrink:0 }}>A</div>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:15, color:"#D0DDEE", letterSpacing:"3px" }}>ALBA</div>
            <div style={{ fontSize:7, color:"#7A9EC0", letterSpacing:"1.5px", fontWeight:500 }}>INVERSIONES · REG 3832</div>
          </div>
        </div>
 
        {/* Estado Supabase */}
        <div style={{ padding:"0 10px 10px" }}>
          <SupabaseStatus loading={loading} error={error} lastSync={lastSync} onReload={reload} />
        </div>
 
        {/* Botones carga rápida */}
        <div style={{ padding:"0 10px 10px", display:"flex", gap:6 }}>
          <button onClick={() => setModal("lead")}
            style={{ flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
              background:`${B.ok}18`, border:`1px solid ${B.ok}50`,
              color:B.ok, fontSize:11, fontWeight:700 }}>
            + Lead
          </button>
          <button onClick={() => setModal("prop")}
            style={{ flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
              background:`${B.accentL}18`, border:`1px solid ${B.accentL}50`,
              color:B.accentL, fontSize:11, fontWeight:700 }}>
            + Prop
          </button>
        </div>
 
        <div style={{ height:1, background:B.border, margin:"0 13px 11px" }} />
 
        {/* Nav items */}
        <nav style={{ flex:1, padding:"0 8px", overflowY:"auto", scrollbarWidth:"none" }}>
          {NAV.map(n => (
            <button key={n.id} className="nav-btn" onClick={() => setView(n.id)}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%",
                padding:"9px 10px", borderRadius:8, marginBottom:2,
                background: view === n.id ? "rgba(42,91,173,0.18)" : "transparent",
                border: view === n.id ? "1px solid rgba(74,138,232,0.35)" : "1px solid transparent",
                color: view === n.id ? "#7AB8FF" : "#7A9EC0",
                fontSize:12, fontWeight: view === n.id ? 600 : 400,
                cursor:"pointer", textAlign:"left",
                fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}>
              <span style={{ width:4, height:4, borderRadius:"50%", flexShrink:0,
                background: view === n.id ? "#5A9AFF" : "#4A6A90" }} />
              {n.label}
              {n.badge && view !== n.id && (
                <span style={{ marginLeft:"auto", background: n.badge === "IA" ? "rgba(46,158,106,0.2)" : "rgba(42,91,173,0.2)",
                  color: n.badge === "IA" ? "#4ABF8A" : "#6AAEF8", fontSize:7, fontWeight:700, borderRadius:4, padding:"1px 6px" }}>
                  {n.badge}
                </span>
              )}
              {n.id === "crm" && sinAsignar > 0 && (
                <span style={{ marginLeft:"auto", background:B.hot, color:"#fff",
                  fontSize:11, fontWeight:700, borderRadius:"50%",
                  width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {sinAsignar}
                </span>
              )}
            </button>
          ))}
        </nav>
 
        {/* Footer con stats + logout */}
        <div style={{ padding:"10px 13px 12px", borderTop:`1px solid ${B.border}` }}>
          <div style={{ fontSize:11, color:B.dim, marginBottom:5 }}>
            {user.email} · {leads.length} leads
          </div>
          <div style={{ display:"flex", gap:3, marginBottom:8 }}>
            {Object.entries(AG).map(([k, v]) => (
              <div key={k} style={{ flex:1, height:3, borderRadius:2, background:v.c }} />
            ))}
          </div>

          {/* Contador créditos IA */}
          <div style={{ background:"rgba(42,91,173,0.08)", border:`1px solid ${B.border}`, borderRadius:8, padding:"7px 9px", marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4A6A90", fontWeight:600, letterSpacing:"0.8px", marginBottom:4 }}>✨ CRÉDITOS IA</div>
            {editSaldo ? (
              <div style={{ display:"flex", gap:4 }}>
                <input autoFocus value={inputSaldo} onChange={e=>setInputSaldo(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") guardarSaldo(); if(e.key==="Escape") setEditSaldo(false); }}
                  placeholder="ej: 10.00" type="number" step="0.01"
                  style={{ flex:1, background:B.bg, border:`1px solid ${B.accentL}`, borderRadius:5, padding:"3px 6px", color:B.text, fontSize:11, outline:"none" }} />
                <button onClick={guardarSaldo} style={{ padding:"3px 7px", borderRadius:5, cursor:"pointer", background:B.accent, border:"none", color:"#fff", fontSize:10, fontWeight:700 }}>OK</button>
              </div>
            ) : saldoIA !== null ? (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:10, color:"#8AAECC" }}>Consumido</span>
                  <span style={{ fontSize:10, color:"#8AAECC" }}>Saldo</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:B.hot }}>${consumoIA.toFixed(4)}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#2E9E6A" }}>${Math.max(0, saldoIA - consumoIA).toFixed(4)}</span>
                </div>
                <div style={{ height:3, background:B.border, borderRadius:2, overflow:"hidden", marginBottom:5 }}>
                  <div style={{ height:"100%", borderRadius:2, background: saldoIA > 0 ? `linear-gradient(90deg, #2E9E6A, ${B.hot})` : B.hot,
                    width: Math.min(100, (consumoIA / saldoIA) * 100) + "%" }} />
                </div>
                <button onClick={()=>{ setInputSaldo(saldoIA); setEditSaldo(true); }}
                  style={{ fontSize:9, color:"#4A6A90", background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
                  Ajustar saldo
                </button>
              </div>
            ) : (
              <button onClick={()=>setEditSaldo(true)}
                style={{ width:"100%", padding:"4px", borderRadius:5, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:10 }}>
                + Ingresar saldo
              </button>
            )}
          </div>

          <button onClick={signOut}
            style={{ width:"100%", padding:"6px", borderRadius:6, cursor:"pointer",
              background:"transparent", border:`1px solid ${B.border}`,
              color:B.dim, fontSize:10 }}>
            Cerrar sesión
          </button>
        </div>
      </div>
 
      {/* ── MAIN ────────────────────────────────────────────── */}
      <div style={{
        flex:1, minWidth:0, overflow:"hidden",
        padding: isFullH ? "18px 20px 0" : "22px 26px",
        overflowY: isFullH ? "hidden" : "auto",
        display:"flex", flexDirection:"column",
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
      }}>
        {view === "briefing"    && <Briefing    leads={leads} properties={properties} supabase={supabase} />}
        {view === "buscador"    && <Buscador    leads={leads} saveSearchResult={saveSearchResult} getSearchResult={getSearchResult} />}
        {view === "cuaderno"    && <Cuaderno    leads={leads} properties={properties} rentals={rentals} captaciones={captaciones} supabase={supabase} onConsumo={agregarConsumo} />}
        {view === "kanban"      && <Kanban      leads={leads} updateLead={updateLead} />}
        {view === "crm"         && <CRMLeads    leads={leads} updateLead={updateLead} deleteLead={deleteLead} properties={properties} captaciones={captaciones} supabase={supabase} />}
        {view === "propiedades" && <Propiedades properties={properties} leads={leads} supabase={supabase} updateProperty={updateProperty} deleteProperty={deleteProperty} />}
        {view === "alquileres"  && <Alquileres  rentals={rentals} />}
        {view === "mapa"        && <Mapa        properties={properties} leads={leads} updateProperty={updateProperty} supabase={supabase} flyers={flyers} />}
        {view === "flyer"       && <Flyer       properties={properties} supabase={supabase} />}
        {view === "captaciones" && <Captaciones  supabase={supabase} />}
        {view === "zonas"       && <CaptacionZonas supabase={supabase} />}
      </div>
 
      {/* ── MODALES ─────────────────────────────────────────── */}
      {modal === "lead" && (
        <Modal title="+ Nuevo lead" onClose={() => setModal(null)}>
          <QuickAddLead onClose={() => setModal(null)} onAdd={handleAddLead} />
        </Modal>
      )}
      {modal === "prop" && (
        <Modal title="+ Nueva propiedad" onClose={() => setModal(null)}>
          <QuickAddProp onClose={() => setModal(null)} onAdd={handleAddProp} />
        </Modal>
      )}
    </div>
  );
}
