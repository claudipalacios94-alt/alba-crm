// ══════════════════════════════════════════════════════════════
// ALBA CRM — HOOK / useLeaflet
// Encapsula carga de Leaflet (script + CSS) e inicialización
// del mapa. Evita duplicar este código en Mapa.jsx y Captaciones.jsx
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";

const MDP_CENTER = [-38.002, -57.555];
const MDP_ZOOM   = 13;

/**
 * Hook que carga Leaflet una sola vez y devuelve una ref al mapa.
 *
 * @param {React.RefObject} containerRef — ref del div contenedor del mapa
 * @param {{ center?: [number,number], zoom?: number }} opciones
 * @returns {{ leafRef: React.RefObject, ready: boolean }}
 *
 * Uso:
 *   const mapContainerRef = useRef(null);
 *   const { leafRef, ready } = useLeaflet(mapContainerRef);
 */
export function useLeaflet(containerRef, { center = MDP_CENTER, zoom = MDP_ZOOM } = {}) {
  const leafRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Paso 1: cargar script + CSS si Leaflet no está cargado todavía
  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }

    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload  = () => setReady(true);
    script.onerror = () => console.error("[useLeaflet] No se pudo cargar Leaflet");
    document.head.appendChild(script);
  }, []);

  // Paso 2: inicializar el mapa una vez que Leaflet está listo y el div existe
  useEffect(() => {
    if (!ready || !containerRef.current || leafRef.current) return;

    const map = window.L.map(containerRef.current, { center, zoom });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    leafRef.current = map;

    // invalidateSize necesario cuando el contenedor tiene display condicional
    setTimeout(() => map.invalidateSize(), 150);
  }, [ready]);

  return { leafRef, ready };
}

/**
 * Constantes útiles para validar coordenadas dentro de Mar del Plata.
 */
export const MDP_BOUNDS = {
  latMin: -38.15, latMax: -37.85,
  lngMin: -57.75, lngMax: -57.40,
};

/**
 * Verifica si unas coordenadas están dentro del área de MdP.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function enMDP(lat, lng) {
  return lat > MDP_BOUNDS.latMin && lat < MDP_BOUNDS.latMax
      && lng > MDP_BOUNDS.lngMin && lng < MDP_BOUNDS.lngMax;
}

/**
 * Geocodifica una dirección usando Nominatim.
 * Valida que el resultado esté dentro de MdP.
 * Centralizado acá para no duplicarlo en Mapa.jsx y Captaciones.jsx.
 *
 * @param {string} dir
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeNominatim(dir) {
  if (!dir) return null;
  const query = encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina");
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ar`,
      { headers: { "Accept-Language": "es" } }
    );
    const d = await r.json();
    if (d.length > 0) {
      const lat = parseFloat(d[0].lat);
      const lng = parseFloat(d[0].lon);
      if (enMDP(lat, lng)) return { lat, lng };
    }
  } catch (e) {
    console.warn("[geocodeNominatim] Error:", e);
  }
  return null;
}