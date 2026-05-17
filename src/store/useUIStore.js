// ══════════════════════════════════════════════════════════════
// ALBA CRM — useUIStore (Zustand)
// Solo UI state: nav, sidebar. No datos de negocio.
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand'

const NAV_KEY     = 'alba_nav'
const SIDEBAR_KEY = 'alba_sidebar'

export const useUIStore = create((set) => ({
  activeNav: localStorage.getItem(NAV_KEY) || 'briefing',
  setActiveNav: (nav) => {
    localStorage.setItem(NAV_KEY, nav)
    set({ activeNav: nav })
  },

  sidebarOpen: localStorage.getItem(SIDEBAR_KEY) !== 'false',
  setSidebarOpen: (open) => {
    localStorage.setItem(SIDEBAR_KEY, String(open))
    set({ sidebarOpen: open })
  },
}))