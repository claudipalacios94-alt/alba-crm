import React from "react";
import Kanban from "../components/Kanban.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function KanbanPage() {
  const { leads, updateLead } = useAppContext();
  return <Kanban leads={leads} updateLead={updateLead} />;
}
