// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK SUPABASE REAL
// Toda la lógica de base de datos en un solo lugar
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LEADS_DEMO, PROPS_DEMO, ALQUILERES_DEMO } from "../data/constants.js";

const SUPABASE_URL = "https://brhhwcrsoqtptbrnnzlu.supabase.co";
const SUPABASE_KEY = "sb_publishable_zqtYWADTxXseE7k7M722kA_6p7LEZbs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export { supabase };

// ── Auth ─────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

export function useSupabase() {
  const [leads,      setLeads]      = useState([]);
  const [properties, setProperties] = useState([]);
  const [rentals,    setRentals]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastSync,   setLastSync]   = useState(null);

  // ── Cargar todos los datos ──────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, propsRes, rentalsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("properties").select("*").order("created_at", { ascending: false }),
        supabase.from("rentals").select("*").order("created_at", { ascending: false }),
      ]);

      if (leadsRes.error)   throw leadsRes.error;
      if (propsRes.error)   throw propsRes.error;
      if (rentalsRes.error) throw rentalsRes.error;

      // Normalizar campos de Supabase al formato que usa la app
      const normalizeLead = (l) => ({
        ...l,
        proxAccion: l.proxaccion || l.proxAccion || "",
        notaImp:    l.nota_imp   || l.notaImp    || "",
        agCapto:    l.ag_capto   || l.agCapto    || "",
      });

      setLeads(leadsRes.data?.length   ? leadsRes.data.map(normalizeLead)   : LEADS_DEMO);
      setProperties(propsRes.data?.length  ? propsRes.data  : PROPS_DEMO);
      setRentals(rentalsRes.data?.length ? rentalsRes.data : ALQUILERES_DEMO);
      setLastSync(new Date());
    } catch (err) {
      console.error("Supabase error:", err);
      setError(err.message);
      // Fallback a datos de demo si falla la conexión
      setLeads(LEADS_DEMO);
      setProperties(PROPS_DEMO);
      setRentals(ALQUILERES_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Real-time subscriptions ─────────────────────────────────
  useEffect(() => {
    const leadsChannel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" },
        () => loadAll()
      )
      .subscribe();

    const propsChannel = supabase
      .channel("props-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(propsChannel);
    };
  }, [loadAll]);

  // ── Operaciones LEADS ───────────────────────────────────────

  async function addLead(lead) {
    const { nombre, ag, etapa, op, presup, tipo, zona, tel, origen, nota, proxAccion, prob, notaImp } = lead;
    const { data, error } = await supabase.from("leads").insert([{
      nombre, ag: ag || "", etapa: etapa || "Nuevo Contacto",
      op: op || "", presup: presup ? Number(presup) : null,
      tipo: tipo || "", zona: zona || "", tel: tel || "",
      origen: origen || "", nota: nota || "",
      proxaccion: proxAccion || "", prob: prob ? Number(prob) : null,
      nota_imp: notaImp || "", dias: 0,
    }]).select().single();

    if (error) { console.error("addLead error:", error); throw error; }
    setLeads(prev => [data, ...prev]);
    setLastSync(new Date());
    return data;
  }

  async function updateLead(id, updates) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) {
      console.error("updateLead error:", error);
      // Revertir si falla
      await loadAll();
      throw error;
    }
    setLastSync(new Date());
  }

  async function deleteLead(id) {
    setLeads(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { await loadAll(); throw error; }
    setLastSync(new Date());
  }

  // ── Operaciones PROPIEDADES ─────────────────────────────────

  async function geocodeAddress(direccion) {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion + ", Mar del Plata, Argentina")}&key=AIzaSyD2ZKp0GLdu7rUTD2DWrOrpCy8LHeulGZM`
      );
      const data = await resp.json();
      if (data.status === "OK" && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) { console.error("Geocoding error:", e); }
    return { lat: null, lng: null };
  }

  async function addProperty(prop) {
    // Geocodificar dirección automáticamente
    let lat = prop.lat || null;
    let lng = prop.lng || null;
    if (!lat && prop.dir) {
      const coords = await geocodeAddress(prop.dir);
      lat = coords.lat;
      lng = coords.lng;
    }

    const { data, error } = await supabase.from("properties").insert([{
      tipo: prop.tipo || "", zona: prop.zona || "", dir: prop.dir || "",
      precio: prop.precio ? Number(prop.precio) : null,
      m2tot: prop.m2tot ? Number(prop.m2tot) : null,
      m2cub: prop.m2cub ? Number(prop.m2cub) : null,
      estado: prop.estado || "Buen Estado", caracts: prop.caracts || "",
      dias: 0, sc: "🟢 OK", info: prop.info || "",
      lat: lat, lng: lng, ag: prop.ag || "",
    }]).select().single();

    if (error) { console.error("addProperty error:", error); throw error; }
    setProperties(prev => [data, ...prev]);
    setLastSync(new Date());
    return data;
  }

  async function updateProperty(id, updates) {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const { error } = await supabase.from("properties").update(updates).eq("id", id);
    if (error) { await loadAll(); throw error; }
    setLastSync(new Date());
  }

  // ── Operaciones ALQUILERES ──────────────────────────────────

  async function addRental(rental) {
    const { data, error } = await supabase.from("rentals").insert([{
      nombre: rental.nombre || "", tipo: rental.tipo || "",
      zona: rental.zona || "", precio_mes: rental.precioARS || null,
      estado: rental.estado || "Disponible", tipoAlq: rental.tipoAlq || "Anual",
      info: rental.info || "",
    }]).select().single();

    if (error) { console.error("addRental error:", error); throw error; }
    setRentals(prev => [data, ...prev]);
    setLastSync(new Date());
    return data;
  }

  // ── Operaciones INTERACTIONS (Cuaderno) ─────────────────────

  async function addInteraction(interaction) {
    const { data, error } = await supabase.from("interactions").insert([{
      lead_id:    interaction.leadId,
      lead_nom:   interaction.leadNom,
      tipo:       interaction.tipo,
      nota:       interaction.nota,
      prox_accion:interaction.proxAccion || "",
      ag:         interaction.ag || "",
    }]).select().single();

    if (error) { console.error("addInteraction error:", error); throw error; }
    setLastSync(new Date());
    return data;
  }

  async function getInteractions(leadId) {
    const query = supabase.from("interactions").select("*").order("created_at", { ascending: false });
    if (leadId) query.eq("lead_id", leadId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ── Operaciones SEARCH RESULTS (Buscador) ───────────────────

  async function saveSearchResult(leadId, resultado) {
    const { data, error } = await supabase.from("search_results").insert([{
      lead_id:  leadId,
      resultado,
      portales: ["ZonaProp", "Argenprop", "MercadoLibre"],
    }]).select().single();

    if (error) { console.error("saveSearchResult error:", error); throw error; }
    return data;
  }

  async function getSearchResult(leadId) {
    const { data } = await supabase
      .from("search_results")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data || null;
  }

  return {
    // Estado
    leads, properties, rentals,
    loading, error, lastSync,

    // Leads
    reload: loadAll,
    addLead, updateLead, deleteLead,

    // Propiedades
    addProperty, updateProperty,

    // Alquileres
    addRental,

    // Cuaderno (interactions)
    addInteraction, getInteractions,

    // Buscador (search results)
    saveSearchResult, getSearchResult,
  };
}
