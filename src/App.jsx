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
      fontFamily:"'Trebuchet MS',sans-serif", color:B.text,
      overflow:"hidden", position:"relative" }}>
 
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div style={{ width:204, background:B.sidebar, borderRight:`1px solid ${B.border}`,
        display:"flex", flexDirection:"column", flexShrink:0 }}>
 
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"16px 14px 12px" }}>
          <div style={{ width:33, height:33, borderRadius:"50%",
            background:"linear-gradient(135deg,#0B1E40,#1A3A7A)", border:"1px solid #2A5BAD",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif", flexShrink:0 }}>A</div>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontWeight:700, fontSize:13, color:B.text, letterSpacing:"2px" }}>ALBA</div>
            <div style={{ fontSize:8, color:B.muted, letterSpacing:"1.2px" }}>INVERSIONES · REG 3832</div>
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
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ display:"flex", alignItems:"center", gap:7, width:"100%",
                padding:"9px 10px", borderRadius:8, marginBottom:3,
                background: view === n.id ? B.accentGlow : "transparent",
                border: view === n.id ? `1px solid ${B.accent}` : "1px solid transparent",
                color: view === n.id ? B.accentL : B.muted,
                fontSize:12, fontWeight: view === n.id ? 600 : 400,
                cursor:"pointer", textAlign:"left" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", flexShrink:0,
                background: view === n.id ? B.accentL : B.dim }} />
              {n.label}
              {n.badge && view !== n.id && (
                <span style={{ marginLeft:"auto", background: n.badge === "IA" ? "#2A9B8A" : B.accent,
                  color:"#fff", fontSize:7, fontWeight:700, borderRadius:4, padding:"1px 6px" }}>
                  {n.badge}
                </span>
              )}
              {n.id === "crm" && sinAsignar > 0 && (
                <span style={{ marginLeft:"auto", background:B.hot, color:"#fff",
                  fontSize:9, fontWeight:700, borderRadius:"50%",
                  width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {sinAsignar}
                </span>
              )}
            </button>
          ))}
        </nav>
 
        {/* Footer con stats + logout */}
        <div style={{ padding:"10px 13px 12px", borderTop:`1px solid ${B.border}` }}>
          <div style={{ fontSize:9, color:B.dim, marginBottom:5 }}>
            {user.email} · {leads.length} leads
          </div>
          <div style={{ display:"flex", gap:3, marginBottom:8 }}>
            {Object.entries(AG).map(([k, v]) => (
              <div key={k} style={{ flex:1, height:3, borderRadius:2, background:v.c }} />
            ))}
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
        flex:1, minWidth:0,
        padding: isFullH ? "18px 20px 0" : "22px 26px",
        overflowY: isFullH ? "hidden" : "auto",
        display:"flex", flexDirection:"column",
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
      }}>
        {view === "briefing"    && <Briefing    leads={leads} properties={properties} />}
        {view === "asistente"   && <Asistente   leads={leads} properties={properties} />}
        {view === "buscador"    && <Buscador    leads={leads} saveSearchResult={saveSearchResult} getSearchResult={getSearchResult} />}
        {view === "cuaderno"    && <Cuaderno    leads={leads} addInteraction={addInteraction} getInteractions={getInteractions} />}
        {view === "kanban"      && <Kanban      leads={leads} updateLead={updateLead} />}
        {view === "crm"         && <CRMLeads    leads={leads} updateLead={updateLead} deleteLead={deleteLead} />}
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
