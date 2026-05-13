# Alba CRM — Contexto del Proyecto

## Descripción General

**Alba CRM** es un CRM inmobiliario para **Alba Inversiones** (Mar del Plata, Argentina, REG 3832). Es una PWA (Progressive Web App) construida con **React + Vite** que utiliza **Supabase** como backend (auth, base de datos, realtime). La app permite gestionar leads, propiedades, alquileres, captaciones y tiene integración con IA (Claude/Anthropic) para asistencia.

## Stack Tecnológico

- **Frontend**: React 18 (JSX), Vite 5, CSS inline (sin frameworks de estilos)
- **Backend/BaaS**: Supabase (auth, PostgreSQL, realtime subscriptions)
- **PWA**: vite-plugin-pwa con Service Worker y caching de Supabase
- **Mapas**: Leaflet (OpenStreetMap) + Google Maps Geocoding API
- **IA**: Anthropic Claude (proxy serverless para evitar CORS)
- **Deploy**: Preparado para Vercel y Netlify (ambos configs incluidos)

## Estructura de Archivos

```
alba-crm/
├── index.html                 # Entry point HTML
├── vite.config.js              # Config Vite + PWA
├── vercel.json                 # Deploy config Vercel
├── netlify.toml                # Deploy config Netlify
├── package.json                # Dependencias
├── public/
│   ├── icon-192.png           # Icono PWA
│   └── icon-512.png           # Icono PWA
├── api/
│   ├── analyze.js             # Edge function (Vercel) - análisis IA de texto
│   └── claude.js               # Serverless function (Vercel) - proxy Anthropic API
├── netlify/functions/
│   └── claude.js               # Netlify function - proxy Anthropic API
├── src/
│   ├── main.jsx                # Entry point React
│   ├── App.jsx                 # Shell principal (nav, modales, routing)
│   ├── data/
│   │   └── constants.js        # Paleta, agentes, etapas, demo data, matching engine
│   ├── hooks/
│   │   └── useSupabase.js      # Hook central: auth, CRUD leads/props/rentals, realtime
│   ├── components/
│   │   ├── Login.jsx            # Pantalla de login (email/password)
│   │   ├── SupabaseStatus.jsx  # Indicador de estado conexión Supabase
│   │   ├── Briefing.jsx        # Dashboard del día: métricas, gauges, tareas, leads urgentes
│   │   ├── Kanban.jsx          # Tablero Kanban drag & drop por etapas
│   │   ├── CRMLeads.jsx        # Vista detallada de leads con filtros y scoring
│   │   ├── Propiedades.jsx      # Gestión de propiedades + alquileres
│   │   ├── Alquileres.jsx       # Vista de alquileres
│   │   ├── Mapa.jsx             # Mapa Leaflet con propiedades y leads geolocalizados
│   │   ├── Cuaderno.jsx         # Cuaderno inteligente con notas + micrófono + IA
│   │   ├── Asistente.jsx        # Chat con Claude (asistente IA)
│   │   ├── Buscador.jsx         # Generador de links Argenprop por lead
│   │   ├── Flyer.jsx            # Galería de flyers (subida a Supabase Storage)
│   │   ├── Captaciones.jsx      # Captación rápida: pegar link/texto + mapa
│   │   ├── CaptacionZonas.jsx   # Farming de zonas por barrio (plan semanal)
│   │   ├── Tareas.jsx           # Tareas con prioridad + agenda semanal
│   │   └── src/components/
│   │       └── Captaciones.jsx   # (copia duplicada)
│   ├── modals/
│   │   ├── Modal.jsx            # Wrapper modal genérico
│   │   ├── QuickAddLead.jsx     # Formulario alta rápida de lead
│   │   └── QuickAddProp.jsx     # Formulario alta rápida de propiedad
│   └── Captaciones             # (archivo suelto, parece copia de components/Captaciones.jsx)
```

## Base de Datos (Supabase)

La app usa las siguientes tablas en Supabase:

| Tabla | Descripción | Campos principales |
|-------|-------------|-------------------|
| `leads` | Leads/clientes del CRM | nombre, ag, etapa, op, presup, tipo, zona, tel, origen, nota, prob, dias, proxaccion, nota_imp, ag_capto |
| `properties` | Propiedades en venta | tipo, zona, dir, precio, m2tot, m2cub, estado, caracts, sc, info, lat, lng, ag |
| `rentals` | Propiedades en alquiler | nombre, tipo, zona, precio_mes, estado, tipoAlq, info |
| `captaciones` | Captaciones rápidas | contenido, tipo, direccion, precio, nota, ag, lat, lng, convertida |
| `interactions` | Interacciones con leads | lead_id, lead_nom, tipo, nota, prox_accion, ag |
| `search_results` | Resultados de búsqueda IA | lead_id, resultado, portales |
| `flyers` | Flyer de propiedades | (gestionados via Supabase Storage) |

### Auth
- Supabase Auth con email/password
- Login por defecto: `claudipalacios94@gmail.com`

### Realtime
- Suscripción a cambios en `leads` y `properties` via Supabase Realtime
- Si Supabase no está disponible, carga datos demo (constants.js)

## Variables de Entorno

```
VITE_SUPABASE_URL          # URL del proyecto Supabase (OBLIGATORIA)
VITE_SUPABASE_KEY          # Anon key de Supabase (OBLIGATORIA)
VITE_GOOGLE_MAPS_KEY        # API key de Google Maps para geocoding (opcional, hay una hardcodeada)
ANTHROPIC_API_KEY           # Key de Anthropic para el asistente IA (serverless only)

# La app ya tiene una SUPABASE_URL hardcodeada en vite.config.js:
# brhhwcrsoqtptbrnnzlu.supabase.co (para PWA caching)
```

## Vistas de la Aplicación

1. **Login** — Autenticación con email/password
2. **Briefing del día** — Dashboard con métricas, gauges canvas, tareas, leads urgentes, acciones sugeridas
3. **Cuaderno de campo** — Notes con grafo visual, transcripción por voz, integración IA
4. **Kanban** — Drag & drop entre etapas del pipeline
5. **CRM Leads** — Vista detallada con filtros (agente, scoring, tipo), matching automático con propiedades
6. **Propiedades** — Cards expandibles, edición inline, categorías (destacada, hon3, hon6, colega)
7. **Mapa** — Leaflet con propiedades y leads, capas switcheables
8. **Generador Flyer** — Subida de flyers a Supabase Storage
9. **Captación rápida** — Pegar link/texto de WhatsApp, geocoding automático, mapa
10. **Captación zonas** — Farming semanal por barrio

## Pipeline de Leads

Etapas: `Nuevo Contacto → Contacto → Calificado → Visita → Negociación → Cerrado / Perdido`

### Scoring automático
- **Caliente** (dias < 3): rojo
- **Tibio** (dias 3-7): amarillo
- **Frío** (dias > 7): gris

### Agentes
- **C** = Claudi (#3A8BC4)
- **A** = Alejandra (#9B6DC8)
- **F** = Flor (#3EAA72)
- **L** = Lucas (#E4923A)

## Matching Engine

La función `matchLeadProps()` en constants.js hace matching automático lead-propiedad basándose en:
- Zona (peso 40, obligatoria)
- Presupuesto (peso 30, excluyente si >20% sobre presupuesto)
- Tipo de propiedad (peso 20, excluyente si no match)
- Características extra (peso 10: cochera, balcón)

Genera mensajes de WhatsApp prehechos y búsquedas en Argenprop.

## Funcionalidades IA

- **Asistente IA** (Asistente.jsx): Chat con Claude usando contexto de leads y propiedades
- **Análisis de texto** (api/analyze.js): Extrae datos de propiedades de texto libre
- **Cuaderno**: Transcripción por voz + análisis IA
- **Créditos IA**: Tracker manual de consumo de API en localStorage

## Notas de Deploy

- Vercel: `vercel.json` con SPA rewrite
- Netlify: `netlify.toml` con functions dir y SPA redirect
- La PWA cachea requests a Supabase con estrategia NetworkFirst (5 min TTL)