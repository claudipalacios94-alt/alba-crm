import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { B } from "../../data/constants.js";
import Sidebar from "./Sidebar.jsx";
import Modal from "../../modals/Modal.jsx";
import QuickAddLead from "../../modals/QuickAddLead.jsx";
import QuickAddProp from "../../modals/QuickAddProp.jsx";
import { useLeadStore }     from "../../store/useLeadStore.js";
import { usePropertyStore } from "../../store/usePropertyStore.js";
import AIFloatingChat from "../AIFloatingChat.jsx";

const FULL_HEIGHT = ["kanban", "mapa", "flyer", "captaciones", "zonas", "cuaderno"];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const addLead     = useLeadStore((s) => s.addLead);
  const addProperty = usePropertyStore((s) => s.addProperty);

  const [modal, setModal] = React.useState(null);
  const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  React.useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const mobile = w < 768;
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const currentView = location.pathname.replace("/", "") || "briefing";
  const isFullH = FULL_HEIGHT.includes(currentView);

  React.useEffect(() => {
    if (mobile) setSidebarOpen(false);
  }, [currentView, mobile]);

  async function handleAddLead(lead) {
    await addLead(lead);
    setModal(null);
    navigate("/crm");
  }

  async function handleAddProp(prop) {
    await addProperty(prop);
    setModal(null);
    navigate("/propiedades");
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: B.bg,
      fontFamily: "'DM Sans',sans-serif", color: B.text, overflow: "hidden", position: "relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1A2F50; border-radius: 2px; }
        .nav-btn:hover { background: rgba(42,91,173,0.12) !important; color: #6AAEF8 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {mobile && (
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position:"fixed", top:12, left:12, zIndex:1001, width:40, height:40, borderRadius:8,
            background:B.card, border:`1px solid ${B.border}`, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={B.text} strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      {mobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999 }} />
      )}

      <div style={{ width: 210, background: "#080F1E", display: "flex", flexDirection: "column", flexShrink: 0,
        position: mobile ? "fixed" : "relative",
        left: mobile ? (sidebarOpen ? 0 : -210) : 0,
        top: 0, bottom: 0,
        zIndex: 1000,
        transition: mobile ? "left 0.25s ease" : "none" }}>
        <Sidebar onOpenModal={setModal} />
      </div>

      <div style={{
        flex: 1, minWidth: 0, overflow: "hidden",
        padding: isFullH ? (mobile ? "10px 10px 0" : "18px 20px 0") : (mobile ? "14px 12px" : "22px 26px"),
        overflowY: isFullH ? "hidden" : "auto",
        display: "flex", flexDirection: "column",
        scrollbarWidth: "thin", scrollbarColor: `${B.border} transparent`,
      }}>
        <Outlet />
      </div>

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

      <AIFloatingChat />
    </div>
  );
}