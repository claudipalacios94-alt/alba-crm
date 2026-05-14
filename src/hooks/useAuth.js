// ══════════════════════════════════════════════════════════════
// ALBA CRM — useAuth
// Auth de Supabase + perfil de agente desde tabla agents
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined = cargando, null = no logueado
  const [agent,   setAgent]   = useState(null);      // fila de tabla agents
  const [loading, setLoading] = useState(true);

  // Cargar perfil de agente desde tabla agents
  async function loadAgent(email) {
    if (!email) { setAgent(null); return; }
    const { data } = await supabase
      .from("agents")
      .select("*")
      .eq("email", email)
      .single();
    setAgent(data || null);
  }

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      loadAgent(u?.email);
      setLoading(false);
    });

    // Cambios de auth en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user || null;
        setUser(u);
        loadAgent(u?.email);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, agent, loading };
}
