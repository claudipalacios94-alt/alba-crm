import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { B, AG } from "../../data/constants.js";
import SupabaseStatus from "../SupabaseStatus.jsx";
import { useAppContext } from "../../context/SupabaseContext.jsx";

const NAV_DEFAULT = [
  { id: "briefing", label: "Briefing del dia", badge: "HOY" },
  { id: "cuaderno", label: "Cuaderno de campo" },
  { id: "kanban", label: "Kanban" },
  { id: "crm", label: "CRM Leads" },
  { id: "propiedades", label: "Propiedades" },
  { id: "alquileres", label: "Alquileres" },
  { id: "mapa", label: "Mapa" },
  { id: "flyer", label: "Generador Flyer" },
  { id: "captaciones", label: "Captacion rapida", badge: "NEW" },
  { id: "zonas", label: "Captacion zonas" },
];

function loadNav() {
  try {
    const saved = localStorage.getItem("alba_nav");
    if (!saved) return NAV_DEFAULT;
    const parsed = JSON.parse(saved);
    const ids = parsed.map(n => n.id);
    const missing = NAV_DEFAULT.filter(n => !ids.includes(n.id));
    return [...parsed, ...missing];
  } catch (e) { return NAV_DEFAULT; }
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    loading, error, lastSync, reload,
    user, agent, signOut,
    saldoIA, consumoIA, editSaldo, setEditSaldo, inputSaldo, setInputSaldo,
    guardarSaldo,
    leads, sinAsignar,
    setModal,
  } = useAppContext();

  const [nav, setNav] = useState(loadNav);
  const [editingNav, setEditingNav] = useState(null);
  const [editNavVal, setEditNavVal] = useState("");
  const [clickCount, setClickCount] = useState({});
  const clickTimer = useRef({});
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const currentView = location.pathname.replace("/", "") || "briefing";

  function saveNav(newNav) {
    setNav(newNav);
    localStorage.setItem("alba_nav", JSON.stringify(newNav));
  }

  function handleNavClick(id) {
    if (editingNav) return;
    const count = (clickCount[id] || 0) + 1;
    setClickCount(p => ({ ...p, [id]: count }));
    clearTimeout(clickTimer.current[id]);
    if (count >= 3) {
      const item = nav.find(n => n.id === id);
      setEditingNav(id);
      setEditNavVal(item.label);
      setClickCount(p => ({ ...p, [id]: 0 }));
    } else {
      clickTimer.current[id] = setTimeout(() => {
        setClickCount(p => ({ ...p, [id]: 0 }));
        navigate("/" + id);
      }, 300);
    }
  }

  function saveNavLabel(id) {
    const val = editNavVal.trim();
    if (val) saveNav(nav.map(n => n.id === id ? { ...n, label: val } : n));
    setEditingNav(null);
  }

  function onDragStart(i) { dragItem.current = i; }
  function onDragEnter(i) { dragOver.current = i; }
  function onDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const newNav = [...nav];
    const dragged = newNav.splice(dragItem.current, 1)[0];
    newNav.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    saveNav(newNav);
  }

  return (
    <div style={{ width: 210, background: "#080F1E", display: "flex", flexDirection: "column", flexShrink: 0 }}>

      <div style={{ height: 3, background: "linear-gradient(90deg,#1A3A7A,#3A6AD4,#5A9AFF,#3A6AD4,#1A3A7A)", flexShrink: 0 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 12px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 8,
          background: "linear-gradient(135deg,#1A3A7A,#2A5BAD)", border: "1px solid #2A5BAD",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontWeight: 700, color: "#7AB8FF", fontFamily: "'Cormorant Garamond',serif", flexShrink: 0 }}>A</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 15, color: "#D0DDEE", letterSpacing: "3px" }}>ALBA</div>
          <div style={{ fontSize: 7, color: "#7A9EC0", letterSpacing: "1.5px", fontWeight: 500 }}>INVERSIONES · REG 3832</div>
        </div>
      </div>

      <div style={{ padding: "0 10px 10px" }}>
        <SupabaseStatus loading={loading} error={error} lastSync={lastSync} onReload={reload} />
      </div>

      <div style={{ padding: "0 10px 10px", display: "flex", gap: 6 }}>
        <button onClick={() => setModal("lead")}
          style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
            background: `${B.ok}18`, border: `1px solid ${B.ok}50`, color: B.ok, fontSize: 11, fontWeight: 700 }}>
          + Lead
        </button>
        <button onClick={() => setModal("prop")}
          style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
            background: `${B.accentL}18`, border: `1px solid ${B.accentL}50`, color: B.accentL, fontSize: 11, fontWeight: 700 }}>
          + Prop
        </button>
      </div>

      <div style={{ height: 1, background: B.border, margin: "0 13px 11px" }} />

      <nav style={{ flex: 1, padding: "0 8px", overflowY: "auto", scrollbarWidth: "none" }}>
        {nav.map((n, i) => (
          <div key={n.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragEnter={() => onDragEnter(i)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            style={{ marginBottom: 2 }}>
            {editingNav === n.id ? (
              <input autoFocus value={editNavVal}
                onChange={e => setEditNavVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveNavLabel(n.id); if (e.key === "Escape") setEditingNav(null); }}
                onBlur={() => saveNavLabel(n.id)}
                style={{ width: "100%", background: B.bg, border: `1px solid ${B.accentL}`, borderRadius: 6,
                  padding: "7px 10px", color: B.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            ) : (
              <button className="nav-btn" onClick={() => handleNavClick(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%",
                  padding: "9px 8px", borderRadius: 8,
                  background: currentView === n.id ? "rgba(42,91,173,0.18)" : "transparent",
                  border: currentView === n.id ? "1px solid rgba(74,138,232,0.35)" : "1px solid transparent",
                  color: currentView === n.id ? "#7AB8FF" : "#7A9EC0",
                  fontSize: 12, fontWeight: currentView === n.id ? 600 : 400,
                  cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                <span style={{ fontSize: 10, color: "#2A3A5A", flexShrink: 0 }}>&#x281F;</span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", flexShrink: 0,
                  background: currentView === n.id ? "#5A9AFF" : "#4A6A90" }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                {n.badge && currentView !== n.id && (
                  <span style={{ background: "rgba(42,91,173,0.2)", color: "#6AAEF8",
                    fontSize: 7, fontWeight: 700, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                    {n.badge}
                  </span>
                )}
                {n.id === "crm" && sinAsignar > 0 && (
                  <span style={{ background: B.hot, color: "#fff", fontSize: 11, fontWeight: 700,
                    borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0 }}>
                    {sinAsignar}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
        <button onClick={() => saveNav(NAV_DEFAULT)}
          style={{ width: "100%", marginTop: 6, padding: "3px", borderRadius: 5, cursor: "pointer",
            background: "transparent", border: `1px solid ${B.border}`, color: "#2A3A5A", fontSize: 9 }}>
          reset orden
        </button>
      </nav>

      <div style={{ padding: "10px 13px 12px", borderTop: `1px solid ${B.border}` }}>
        {/* Agente logueado */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: agent?.color || B.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            {agent?.initial || "?"}
          </div>
          <div>
            <div style={{ fontSize: 12, color: B.text, fontWeight: 600 }}>
              {agent?.nombre || user?.email}
            </div>
            <div style={{ fontSize: 9, color: B.dim }}>
              {agent?.rol || "agente"} · {leads.length} leads
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {Object.entries(AG).map(([k, v]) => (
            <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: v.c }} />
          ))}
        </div>

        <div style={{ background: "rgba(42,91,173,0.08)", border: `1px solid ${B.border}`, borderRadius: 8, padding: "7px 9px", marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "#4A6A90", fontWeight: 600, letterSpacing: "0.8px", marginBottom: 4 }}>CREDITOS IA</div>
          {editSaldo ? (
            <div style={{ display: "flex", gap: 4 }}>
              <input autoFocus value={inputSaldo} onChange={e => setInputSaldo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") guardarSaldo(); if (e.key === "Escape") setEditSaldo(false); }}
                placeholder="ej: 10.00" type="number" step="0.01"
                style={{ flex: 1, background: B.bg, border: `1px solid ${B.accentL}`, borderRadius: 5, padding: "3px 6px", color: B.text, fontSize: 11, outline: "none" }} />
              <button onClick={guardarSaldo} style={{ padding: "3px 7px", borderRadius: 5, cursor: "pointer", background: B.accent, border: "none", color: "#fff", fontSize: 10, fontWeight: 700 }}>OK</button>
            </div>
          ) : saldoIA !== null ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "#8AAECC" }}>Consumido</span>
                <span style={{ fontSize: 10, color: "#8AAECC" }}>Saldo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: B.hot }}>${consumoIA.toFixed(4)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2E9E6A" }}>${Math.max(0, saldoIA - consumoIA).toFixed(4)}</span>
              </div>
              <div style={{ height: 3, background: B.border, borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
                <div style={{ height: "100%", borderRadius: 2,
                  background: saldoIA > 0 ? `linear-gradient(90deg, #2E9E6A, ${B.hot})` : B.hot,
                  width: Math.min(100, (consumoIA / saldoIA) * 100) + "%" }} />
              </div>
              <button onClick={() => { setInputSaldo(saldoIA); setEditSaldo(true); }}
                style={{ fontSize: 9, color: "#4A6A90", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                Ajustar saldo
              </button>
            </div>
          ) : (
            <button onClick={() => setEditSaldo(true)}
              style={{ width: "100%", padding: "4px", borderRadius: 5, cursor: "pointer",
                background: "transparent", border: `1px solid ${B.border}`, color: "#8AAECC", fontSize: 10 }}>
              + Ingresar saldo
            </button>
          )}
        </div>

        <button onClick={signOut}
          style={{ width: "100%", padding: "6px", borderRadius: 6, cursor: "pointer",
            background: "transparent", border: `1px solid ${B.border}`, color: B.dim, fontSize: 10 }}>
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
