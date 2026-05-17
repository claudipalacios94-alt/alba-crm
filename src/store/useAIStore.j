import { create } from 'zustand'
import { supabase } from '../hooks/supabaseClient.js'

const SALDO_KEY   = 'alba_saldo_ia'
const CONSUMO_KEY = 'alba_consumo_ia'

async function getSetting(userId, key) {
  const { data } = await supabase
    .from('agent_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

async function setSetting(userId, key, value) {
  await supabase.from('agent_settings').upsert(
    { user_id: userId, key, value: String(value), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' }
  )
}

export const useAIStore = create((set, get) => ({
  saldoIA:  (() => { try { const s = localStorage.getItem(SALDO_KEY);  return s ? parseFloat(s) : null } catch { return null } })(),
  consumoIA: (() => { try { const s = localStorage.getItem(CONSUMO_KEY); return s ? parseFloat(s) : 0   } catch { return 0   } })(),

  loadSettings: async (userId) => {
    if (!userId) return
    const [saldo, consumo] = await Promise.all([
      getSetting(userId, 'saldo_ia'),
      getSetting(userId, 'consumo_ia'),
    ])
    if (saldo !== null)   set({ saldoIA:   parseFloat(saldo) })
    if (consumo !== null) set({ consumoIA: parseFloat(consumo) })
  },

  agregarConsumo: async (inputTokens, outputTokens, userId) => {
    const costo   = ((inputTokens / 1000 * 0.00025) + (outputTokens / 1000 * 0.00125)) * 1.05
    const { consumoIA } = get()
    const nuevo   = parseFloat((consumoIA + costo).toFixed(6))
    localStorage.setItem(CONSUMO_KEY, nuevo)
    set({ consumoIA: nuevo })
    if (userId) await setSetting(userId, 'consumo_ia', nuevo)
  },

  guardarSaldo: async (inputSaldo, userId) => {
    const v = parseFloat(inputSaldo)
    if (!isNaN(v) && v > 0) {
      localStorage.setItem(SALDO_KEY, v)
      set({ saldoIA: v })
      if (userId) await setSetting(userId, 'saldo_ia', v)
    }
  },
}))
