// ══════════════════════════════════════════════════════════════
// ALBA CRM — useLeads
// CRUD de leads + suscripción realtime
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient.js";
import { LEADS_DEMO } from "../data/constants.js";

function calcDias(l) {
  const ref = l.last_contact_at || l.created_at;
  if (!ref) return l.dias || 0;
  return Math.max(0, Math.floor(
    (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)
  ));
}

function normalizeLead(l) {
  return {
    ...l,
    dias:       calcDias(l),
    proxAccion: l.proxaccion || l.proxAccion || "",
    notaImp:    l.nota_imp   || l.notaImp    || "",
    agCapto:    l.ag_capto   || l.agCapto    || "",
  };
}

export function useLeads() {
  const [leads,    setLeads]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads(data?.length ? data.map(normalizeLead) : LEADS_DEMO);
      setLastSync(new Date());
    } catch (err) {
      console.error("useLeads error:", err);
      setError(err.message);
      setLeads(LEADS_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel("leads-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload) => {
        setLeads(prev => prev.map(l =>
          l.id === payload.new.id ? { ...l, ...normalizeLead(payload.new) } : l
        ));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => loadLeads())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadLeads]);

  async function addLead(lead) {
    const { data, error } = await supabase.from("leads").insert([{
      nombre:     lead.nombre,
      ag:         lead.ag        || "",
      etapa:      lead.etapa     || "Nuevo Contacto",
      op:         lead.op        || "",
      presup:     lead.presup    ? Number(lead.presup) : null,
      tipo:       lead.tipo      || "",
      zona:       lead.zona      || "",
      tel:        lead.tel       || "",
      origen:     lead.origen    || "",
      nota:       lead.nota      || "",
      proxaccion: lead.proxAccion || "",
      prob:       lead.prob      ? Number(lead.prob) : null,
      nota_imp:   lead.notaImp   || "",
      dias:       0,
    }]).select().single();
    if (error) { console.error("addLead error:", error); throw error; }
    setLeads(prev => [normalizeLead(data), ...prev]);
    setLastSync(new Date());
    return data;
  }

  async function updateLead(id, updates) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) { await loadLeads(); throw error; }
    setLastSync(new Date());
  }

  async function deleteLead(id) {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  async function addInteraction(interaction) {
    const { data, error } = await supabase.from("interactions").insert([{
      lead_id:     interaction.leadId,
      lead_nom:    interaction.leadNom,
      tipo:        interaction.tipo,
      nota:        interaction.nota,
      prox_accion: interaction.proxAccion || "",
      ag:          interaction.ag         || "",
    }]).select().single();
    if (error) { console.error("addInteraction error:", error); throw error; }
    setLastSync(new Date());
    return data;
  }

  async function getInteractions(leadId) {
    const query = supabase
      .from("interactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (leadId) query.eq("lead_id", leadId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

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
    leads, loading, error, lastSync,
    reload: loadLeads,
    addLead, updateLead, deleteLead,
    addInteraction, getInteractions,
    saveSearchResult, getSearchResult,
  };
}
