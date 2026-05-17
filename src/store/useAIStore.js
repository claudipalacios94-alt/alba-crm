import { create } from 'zustand'

const SALDO_KEY  = 'alba_saldo_ia'
const CONSUMO_KEY = 'alba_consumo_ia'

export const useAIStore = create((set, get) => ({
  saldoIA:  (() => { try { const s = localStorage.getItem(SALDO_KEY);  return s ? parseFloat(s) : null } catch { return null } })(),
  consumoIA: (() => { try { const s = localStorage.getItem(CONSUMO_KEY); return s ? parseFloat(s) : 0   } catch { return 0   } })(),

  agregarConsumo: (inputTokens, outputTokens) => {
    const costo  = ((inputTokens / 1000 * 0.00025) + (outputTokens / 1000 * 0.00125)) * 1.05
    const { consumoIA } = get()
    const nuevo  = parseFloat((consumoIA + costo).toFixed(6))
    localStorage.setItem(CONSUMO_KEY, nuevo)
    set({ consumoIA: nuevo })
  },

  guardarSaldo: (inputSaldo) => {
    const v = parseFloat(inputSaldo)
    if (!isNaN(v) && v > 0) {
      localStorage.setItem(SALDO_KEY, v)
      set({ saldoIA: v })
    }
  },
}))
