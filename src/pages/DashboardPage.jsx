import React from "react";
import { useLeadStore }       from "../store/useLeadStore.js";
import { usePropertyStore }   from "../store/usePropertyStore.js";
import { useRentalStore }     from "../store/useRentalStore.js";
import { useCaptacionStore }  from "../store/useCaptacionStore.js";
import Dashboard from "../components/Dashboard.jsx";

export default function DashboardPage() {
  const leads      = useLeadStore((s) => s.leads);
  const properties = usePropertyStore((s) => s.properties);
  const rentals    = useRentalStore((s) => s.rentals);
  const captaciones = useCaptacionStore((s) => s.captaciones);

  return (
    <Dashboard
      leads={leads || []}
      properties={properties || []}
      captaciones={captaciones || []}
      rentals={rentals || []}
    />
  );
}