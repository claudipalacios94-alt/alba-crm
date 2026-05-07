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
import Asistente       from "./components/Asistente.jsx";
import Cuaderno        from "./components/Cuaderno.jsx";
import Buscador        from "./components/Buscador.jsx";
import Mapa            from "./components/Mapa.jsx";
import Flyer           from "./components/Flyer.jsx";
import Captaciones     from "./components/Captaciones.jsx";
 
// Modales
import Modal           from "./modals/Modal.jsx";
import QuickAddLead    from "./modals/QuickAddLead.jsx";
import QuickAddProp    from "./modals/QuickAddProp.jsx";
 
// ── Navegación ────────────────────────────────────────────────
const NAV = [
  { id:"briefing",    label:"Briefing del día",  badge:"HOY" },
  { id:"asistente",   label:"Asistente IA",       badge:"IA"  },
  { id:"buscador",    label:"Buscador",            badge:"NEW" },
  { id:"cuaderno",    label:"Cuaderno de campo" },
  { id:"kanban",      label:"Kanban" },
  { id:"crm",         label:"CRM Leads" },
  { id:"propiedades", label:"Propiedades" },
  { id:"alquileres",  label:"Alquileres" },
  { id:"mapa",        label:"Mapa" },
  { id:"flyer",       label:"Generador Flyer" },
  { id:"captaciones",  label:"Captación rápida", badge:"NEW" },
];
 
const FULL_HEIGHT = ["kanban", "asistente", "mapa", "flyer", "captaciones"];
 
export default function App() {
  const [view,  setView]  = useState("briefing");
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
 
  // ── App principal ─────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", background:B.bg,
      fontFamily:"'Cormorant Garamond', Georgia, serif", color:B.text,
      overflow:"hidden", position:"relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${B.border}; border-radius: 2px; }
        .nav-btn:hover { background: ${B.accentGlow} !important; }
        .quick-btn:hover { opacity: 0.85; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div style={{ width:220, background:B.dark, borderRight:"none",
        display:"flex", flexDirection:"column", flexShrink:0, position:"relative" }}>

        {/* Franja dorada superior */}
        <div style={{ height:3, background:"linear-gradient(90deg,#C4963A,#E8C87A,#C4963A)", flexShrink:0 }} />

        {/* Logo */}
        <div style={{ padding:"20px 18px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:8,
              background:"linear-gradient(135deg,#C4963A,#8A6520)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, fontWeight:700, color:"#FFF8ED", fontFamily:"'Cormorant Garamond',serif",
              flexShrink:0, letterSpacing:"1px" }}>A</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:16,
                color:"#F5EDD8", letterSpacing:"3px" }}>ALBA</div>
              <div style={{ fontSize:7, color:"#6A5E4A", letterSpacing:"1.5px",
                fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>INVERSIONES · REG 3832</div>
            </div>
          </div>
        </div>

        {/* Estado Supabase */}
        <div style={{ padding:"0 12px 10px" }}>
          <SupabaseStatus loading={loading} error={error} lastSync={lastSync} onReload={reload} />
        </div>

        {/* Botones carga rápida */}
        <div style={{ padding:"0 12px 14px", display:"flex", gap:6 }}>
          <button className="quick-btn" onClick={() => setModal("lead")}
            style={{ flex:1, padding:"9px 4px", borderRadius:7, cursor:"pointer",
              background:"rgba(196,150,58,0.18)", border:"1px solid rgba(196,150,58,0.35)",
              color:"#D4A84B", fontSize:11, fontWeight:600,
              fontFamily:"'DM Sans',sans-serif", transition:"opacity .15s" }}>
            + Lead
          </button>
          <button className="quick-btn" onClick={() => setModal("prop")}
            style={{ flex:1, padding:"9px 4px", borderRadius:7, cursor:"pointer",
              background:"rgba(58,140,110,0.15)", border:"1px solid rgba(58,140,110,0.3)",
              color:"#5AAF8A", fontSize:11, fontWeight:600,
              fontFamily:"'DM Sans',sans-serif", transition:"opacity .15s" }}>
            + Prop
          </button>
        </div>

        <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"0 14px 12px" }} />

        {/* Nav items */}
        <nav style={{ flex:1, padding:"0 10px", overflowY:"auto", scrollbarWidth:"none" }}>
          {NAV.map(n => {
            const active = view === n.id;
            return (
              <button key={n.id} className="nav-btn" onClick={() => setView(n.id)}
                style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
                  padding:"9px 10px", borderRadius:7, marginBottom:2,
                  background: active ? "rgba(196,150,58,0.14)" : "transparent",
                  border: active ? "1px solid rgba(196,150,58,0.28)" : "1px solid transparent",
                  color: active ? "#D4A84B" : "#6A5E4A",
                  fontSize:12, fontWeight: active ? 600 : 400,
                  cursor:"pointer", textAlign:"left",
                  fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}>
                <span style={{ width:4, height:4, borderRadius:"50%", flexShrink:0,
                  background: active ? "#D4A84B" : "#3A3028" }} />
                {n.label}
                {n.badge && !active && (
                  <span style={{ marginLeft:"auto",
                    background: n.badge === "IA" ? "rgba(58,140,110,0.25)" : "rgba(196,150,58,0.2)",
                    color: n.badge === "IA" ? "#5AAF8A" : "#D4A84B",
                    fontSize:7, fontWeight:700, borderRadius:3, padding:"1px 5px",
                    fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.5px" }}>
                    {n.badge}
                  </span>
                )}
                {n.id === "crm" && sinAsignar > 0 && (
                  <span style={{ marginLeft:"auto", background:"#D94F3D", color:"#fff",
                    fontSize:9, fontWeight:700, borderRadius:"50%",
                    width:17, height:17, display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'DM Sans',sans-serif" }}>
                    {sinAsignar}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"12px 14px 14px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", gap:2, marginBottom:10 }}>
            {Object.entries(AG).map(([k, v]) => (
              <div key={k} title={v.n} style={{ flex:1, height:2, borderRadius:2, background:v.c, opacity:0.7 }} />
            ))}
          </div>
          <div style={{ fontSize:9, color:"#4A3E30", marginBottom:8,
            fontFamily:"'DM Sans',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {user.email} · {leads.length} leads
          </div>
          <button onClick={signOut}
            style={{ width:"100%", padding:"7px", borderRadius:6, cursor:"pointer",
              background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
              color:"#4A3E30", fontSize:10, fontFamily:"'DM Sans',sans-serif",
              transition:"border-color .15s" }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div style={{
        flex:1, minWidth:0,
        padding: isFullH ? "18px 20px 0" : "28px 32px",
        overflowY: isFullH ? "hidden" : "auto",
        display:"flex", flexDirection:"column",
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
        animation:"fadeIn .3s ease",
      }}>
        {view === "briefing"    && <Briefing    leads={leads} properties={properties} />}
        {view === "asistente"   && <Asistente   leads={leads} properties={properties} />}
        {view === "buscador"    && <Buscador    leads={leads} saveSearchResult={saveSearchResult} getSearchResult={getSearchResult} />}
        {view === "cuaderno"    && <Cuaderno    leads={leads} addInteraction={addInteraction} getInteractions={getInteractions} />}
        {view === "kanban"      && <Kanban      leads={leads} updateLead={updateLead} />}
        {view === "crm"         && <CRMLeads    leads={leads} updateLead={updateLead} deleteLead={deleteLead} properties={properties} />}
        {view === "propiedades" && <Propiedades properties={properties} updateProperty={updateProperty} deleteProperty={deleteProperty} />}
        {view === "alquileres"  && <Alquileres  rentals={rentals} />}
        {view === "mapa"        && <Mapa        properties={properties} />}
        {view === "flyer"       && <Flyer       properties={properties} />}
        {view === "captaciones" && <Captaciones  supabase={supabase} />}
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
