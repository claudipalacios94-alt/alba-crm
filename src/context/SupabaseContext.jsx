// ══════════════════════════════════════════════════════════════
// ALBA CRM — SupabaseContext
// Contexto global: datos, auth, agente logueado
// ══════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect } from "react";
import { useSupabase, supabase, signOut } from "../hooks/useSupabase.js";
import { useAuth } from "../hooks/useAuth.js";

const SupabaseContext = createContext(null);

export function SupabaseProvider({ children }) {
  const { user, agent, loading: authLoading } = useAuth();
  const supabaseData = useSupabase();

  const [captaciones, setCaptaciones] = useState([]);
  const [flyers,      setFlyers]      = useState([]);

  const [saldoIA,    setSaldoIA]    = useState(() => {
    try { const s = localStorage.getItem("alba_saldo_ia");   return s ? parseFloat(s) : null; } catch { return null; }
  });
  const [consumoIA,  setConsumoIA]  = useState(() => {
    try { const s = localStorage.getItem("alba_consumo_ia"); return s ? parseFloat(s) : 0;    } catch { return 0; }
  });
  const [editSaldo,  setEditSaldo]  = useState(false);
  const [inputSaldo, setInputSaldo] = useState("");
  const [modal,      setModal]      = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("captaciones").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCaptaciones(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("flyers").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFlyers(data || []));
  }, [user]);

  function agregarConsumo(inputTokens, outputTokens) {
    const costo = ((inputTokens / 1000 * 0.00025) + (outputTokens / 1000 * 0.00125)) * 1.05;
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

  const sinAsignar = supabaseData.leads.filter(
    l => !l.ag && l.etapa !== "Cerrado" && l.etapa !== "Perdido"
  ).length;

  // user === undefined significa que auth todavía está cargando
  const value = {
    ...supabaseData,
    captaciones, flyers, setFlyers,
    saldoIA, consumoIA, editSaldo, setEditSaldo, inputSaldo, setInputSaldo,
    agregarConsumo, guardarSaldo,
    user,      // objeto Supabase Auth user | null
    agent,     // fila de tabla agents | null
    authLoading,
    signOut, supabase,
    modal, setModal,
    sinAsignar,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useAppContext must be inside SupabaseProvider");
  return ctx;
}
