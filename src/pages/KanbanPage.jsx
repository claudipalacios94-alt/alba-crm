import React from "react";
import Kanban from "../components/Kanban.jsx";
import { useLeadStore } from "../store/useLeadStore.js";

export default function KanbanPage() {
  const leads      = useLeadStore((s) => s.leads);
  const updateLead = useLeadStore((s) => s.updateLead);
  return <Kanban leads={leads} updateLead={updateLead} />;
}