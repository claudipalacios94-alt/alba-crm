import React, { createContext, useContext, useState, useEffect } from "react";
import { useSupabase, supabase, onAuthChange, signOut } from "../hooks/useSupabase.js";

const SupabaseContext = createContext(null);

export function SupabaseProvider({ children }) {
  const [user, setUser] = useState(undefined);

  const supabaseData = useSupabase();

  const [captaciones, setCaptaciones] = useState([]);
  const [flyers, setFlyers] = useState([]);

  const [saldoIA, setSaldoIA] = useState(() => {
    try { const s = localStorage.getItem("alba_saldo_ia"); return s ? parseFloat(s) : null; } catch (e) { return null; }
  });
  const [consumoIA, setConsumoIA] = useState(() => {
    try { const s = localStorage.getItem("alba_consumo_ia"); return s ? parseFloat(s) : 0; } catch (e) { return 0; }
  });
  const [editSaldo, setEditSaldo] = useState(false);
  const [inputSaldo, setInputSaldo] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = onAuthChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.from("captaciones").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCaptaciones(data || []));
  }, []);

  useEffect(() => {
    supabase.from("flyers").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFlyers(data || []));
  }, []);

  function agregarConsumo(inputTokens, outputTokens) {
    const costoBase = (inputTokens / 1000 * 0.00025) + (outputTokens / 1000 * 0.00125);
    const costo = costoBase * 1.05;
    const nuevo = parseFloat((consumoIA + costo).toFixed(6));
    setConsumoIA(nuevo);
    localStorage.setItem("alba_consumo_ia", nuevo);
  }

  function guardarSaldo() {
    const v = parseFloat(inputSaldo);
    if (!isNaN(v) && v > 0) { setSaldoIA(v); localStorage.setItem("alba_saldo_ia", v); }
    setEditSaldo(false);
  }

  const sinAsignar = supabaseData.leads.filter(
    l => !l.ag && l.etapa !== "Cerrado" && l.etapa !== "Perdido"
  ).length;

  const value = {
    ...supabaseData,
    captaciones, flyers, setFlyers,
    saldoIA, consumoIA, editSaldo, setEditSaldo, inputSaldo, setInputSaldo,
    agregarConsumo, guardarSaldo,
    user, signOut, supabase,
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
