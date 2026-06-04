import React from "react";
import { B } from "../../data/constants.js";

const TAB_DEFS = [
  { id: "todo",        label: "Todo"        },
  { id: "propiedades", label: "Propiedades" },
  { id: "captaciones", label: "Captaciones" },
  { id: "colegas",     label: "Colegas"     },
  { id: "honorarios",  label: "Honorarios"  },
  { id: "alquileres",  label: "Alquileres"  },
  { id: "mapa",        label: "🗺 Mapa"     },
  { id: "zonas",       label: "📍 Zonas"    },
];

export default function OfertaTabs({ activeTab, onTab, mobile, counts = {} }) {
  return (
    <div style={{
      display: "flex",
      gap: 2,
      borderBottom: `1px solid ${B.border}`,
      marginBottom: 16,
      overflowX: "auto",
      scrollbarWidth: "none",
      flexShrink: 0,
    }}>
      {TAB_DEFS.map(tab => {
        const active = activeTab === tab.id;
        const count  = counts[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onTab(tab.id)}
            style={{
              padding: mobile ? "7px 10px" : "8px 14px",
              background: active ? `${B.accentL}15` : "transparent",
              border: "none",
              borderBottom: active ? `2px solid ${B.accentL}` : "2px solid transparent",
              marginBottom: -1,
              color: active ? B.accentL : B.muted,
              fontSize: mobile ? 11 : 12,
              fontWeight: active ? 700 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "'DM Sans', sans-serif",
              transition: "color .15s",
              borderRadius: "6px 6px 0 0",
            }}
          >
            {tab.label}
            {count != null && (
              <span style={{
                background: active ? B.accentL : B.border,
                color: active ? "#fff" : B.muted,
                fontSize: 9,
                fontWeight: 700,
                borderRadius: 10,
                padding: "1px 6px",
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
