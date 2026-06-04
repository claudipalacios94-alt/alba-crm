import React, { useMemo } from "react";
import { usePropertyStore }  from "../store/usePropertyStore.js";
import { useCaptacionStore } from "../store/useCaptacionStore.js";
import { useLeadStore }      from "../store/useLeadStore.js";
import {
  buildOfertaItems,
  getOfertaKPIs,
  getTabCounts,
} from "../domain/oferta.js";
import OfertaModule from "../components/oferta/index.jsx";

export default function OfertaPage() {
  const properties  = usePropertyStore(s => s.properties);
  const propLoading = usePropertyStore(s => s.loading);

  const captaciones = useCaptacionStore(s => s.captaciones);
  const capLoading  = useCaptacionStore(s => s.loading);

  const leads = useLeadStore(s => s.leads);

  const items = useMemo(
    () => buildOfertaItems(properties, captaciones, leads),
    [properties, captaciones, leads]
  );

  const kpis      = useMemo(() => getOfertaKPIs(items),   [items]);
  const tabCounts = useMemo(() => getTabCounts(items),     [items]);

  const loading = propLoading || capLoading;

  return (
    <OfertaModule
      items={items}
      kpis={kpis}
      tabCounts={tabCounts}
      loading={loading}
      leads={leads}
    />
  );
}
