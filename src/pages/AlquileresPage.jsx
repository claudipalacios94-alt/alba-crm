import React from "react";
import Alquileres from "../components/Alquileres.jsx";
import { useAppContext } from "../context/SupabaseContext.jsx";

export default function AlquileresPage() {
  const { rentals } = useAppContext();
  return <Alquileres rentals={rentals} />;
}
