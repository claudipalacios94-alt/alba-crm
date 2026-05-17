import React from "react";
import Alquileres from "../components/Alquileres.jsx";
import { useRentalStore } from "../store/useRentalStore.js";

export default function AlquileresPage() {
  const rentals = useRentalStore((s) => s.rentals);
  return <Alquileres rentals={rentals} />;
}