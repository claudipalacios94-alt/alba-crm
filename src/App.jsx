import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { B } from "./data/constants.js";
import { signIn } from "./hooks/useSupabase.js";
import { useAppContext } from "./context/SupabaseContext.jsx";
import Login from "./components/Login.jsx";
import Layout from "./components/layout/Layout.jsx";

import BriefingPage from "./pages/BriefingPage.jsx";
import CuadernoPage from "./pages/CuadernoPage.jsx";
import KanbanPage from "./pages/KanbanPage.jsx";
import CRMLeadsPage from "./pages/CRMLeadsPage.jsx";
import PropiedadesPage from "./pages/PropiedadesPage.jsx";
import MapaPage from "./pages/MapaPage.jsx";
import FlyerPage from "./pages/FlyerPage.jsx";
import CaptacionesPage from "./pages/CaptacionesPage.jsx";
import CaptacionZonasPage from "./pages/CaptacionZonasPage.jsx";

export default function App() {
  const { user } = useAppContext();

  if (user === undefined) {
    return (
      <div style={{ height: "100vh", background: B.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${B.border}`,
          borderTop: `2px solid ${B.accentL}`, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  }

  if (!user) return <Login onLogin={signIn} />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/briefing" replace />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/cuaderno" element={<CuadernoPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/crm" element={<CRMLeadsPage />} />
        <Route path="/propiedades" element={<PropiedadesPage />} />
        <Route path="/mapa" element={<MapaPage />} />
        <Route path="/flyer" element={<FlyerPage />} />
        <Route path="/captaciones" element={<CaptacionesPage />} />
        <Route path="/zonas" element={<CaptacionZonasPage />} />
      </Route>
    </Routes>
  );
}
