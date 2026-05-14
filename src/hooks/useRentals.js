// ══════════════════════════════════════════════════════════════
// ALBA CRM — useRentals
// CRUD de alquileres
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient.js";
import { ALQUILERES_DEMO } from "../data/constants.js";

export function useRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRentals(data?.length ? data : ALQUILERES_DEMO);
    } catch (err) {
      console.error("useRentals error:", err);
      setError(err.message);
      setRentals(ALQUILERES_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRentals(); }, [loadRentals]);

  async function addRental(rental) {
    const { data, error } = await supabase.from("rentals").insert([{
      nombre:    rental.nombre    || "",
      tipo:      rental.tipo      || "",
      zona:      rental.zona      || "",
      precio_mes: rental.precioARS || null,
      estado:    rental.estado    || "Disponible",
      tipoAlq:   rental.tipoAlq   || "Anual",
      info:      rental.info      || "",
    }]).select().single();
    if (error) { console.error("addRental error:", error); throw error; }
    setRentals(prev => [data, ...prev]);
    return data;
  }

  async function updateRental(id, updates) {
    setRentals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const { error } = await supabase.from("rentals").update(updates).eq("id", id);
    if (error) { await loadRentals(); throw error; }
  }

  async function deleteRental(id) {
    const { error } = await supabase.from("rentals").delete().eq("id", id);
    if (error) throw error;
    setRentals(prev => prev.filter(r => r.id !== id));
  }

  return {
    rentals, loading, error,
    reload: loadRentals,
    addRental, updateRental, deleteRental,
  };
}
