import React, { useMemo, useState, useEffect } from "react";
import { usePropertyStore }  from "../store/usePropertyStore.js";
import { useCaptacionStore } from "../store/useCaptacionStore.js";
import { useLeadStore }      from "../store/useLeadStore.js";
import { useAppContext }     from "../context/SupabaseContext.jsx";
import {
  buildOfertaItems,
  getOfertaKPIs,
  getTabCounts,
} from "../domain/oferta.js";
import OfertaModule from "../components/oferta/index.jsx";

export default function OfertaPage() {
  const properties     = usePropertyStore(s => s.properties);
  const propLoading    = usePropertyStore(s => s.loading);
  const loadProperties = usePropertyStore(s => s.loadProperties);

  const captaciones = useCaptacionStore(s => s.captaciones);
  const capLoading  = useCaptacionStore(s => s.loading);

  const leads = useLeadStore(s => s.leads);
  const { supabase: sbClient } = useAppContext();

  // ── MDL disponibles no añadidas ───────────────────────────
  const [mdlItems,   setMdlItems]   = useState([]);
  const [mdlLoading, setMdlLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMDL() {
      setMdlLoading(true);
      try {
        const { data: { session } } = await sbClient.auth.getSession();
        if (!session || cancelled) return;
        const res = await fetch("/api/sync-mdl", {
          method:  "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ dry_run: true }),
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        // Solo disponibles de venta que aún no están en el CRM (op=insert)
        const disponibles = (json.items || [])
          .filter(p => p.estado_aviso === "Disponible" && p.operacion === "venta" && p.op === "insert")
          .slice(0, 10)
          .map(p => ({
            id:        `mdl-${p.external_id}`,
            source:    "mdl",
            origen:    "MDL",
            tipo:      p.tipo      || "",
            zona:      p.zona      || "",
            direccion: p.dir       || "",
            precio:    p.precio    || null,
            ambientes: null,
            m2tot:     null,
            caracts:   [],
            estado:    "Disponible",
            matches:   0,
            foto:      p.foto      || null,
            web_url:   p.web_url   || null,
            contacto:  null,
            raw:       p,
          }));
        setMdlItems(disponibles);
      } catch (err) {
        if (!cancelled) console.warn("MDL fetch:", err.message);
      } finally {
        if (!cancelled) setMdlLoading(false);
      }
    }
    fetchMDL();
    return () => { cancelled = true; };
  }, [sbClient]);

  // ── Añadir una sola propiedad MDL al CRM ─────────────────
  async function handleAddMdlItem(mdlItem) {
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/sync-mdl", {
        method:  "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ selected_ids: [mdlItem.raw.external_id] }),
      });
      const json = await res.json();
      if (json.ok || json.created > 0 || json.updated > 0) {
        setMdlItems(prev => prev.filter(m => m.id !== mdlItem.id));
        await loadProperties();
      }
    } catch (err) {
      console.warn("MDL add:", err.message);
    }
  }

  const items = useMemo(
    () => buildOfertaItems(properties, captaciones, leads),
    [properties, captaciones, leads]
  );

  const kpis      = useMemo(() => getOfertaKPIs(items),   [items]);
  const tabCounts = useMemo(() => getTabCounts(items),     [items]);
  const loading   = propLoading || capLoading;

  return (
    <OfertaModule
      items={items}
      kpis={kpis}
      tabCounts={tabCounts}
      loading={loading}
      leads={leads}
      mdlItems={mdlItems}
      mdlLoading={mdlLoading}
      onAddMdlItem={handleAddMdlItem}
    />
  );
}
