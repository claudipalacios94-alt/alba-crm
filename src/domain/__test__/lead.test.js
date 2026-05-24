import { describe, it, expect } from 'vitest'
import { scoreLead, matchLeadProps, genMsgWhatsApp, genMsgBusqueda } from '../lead.js'

// ══════════════════════════════════════════════════════════════
// scoreLead
// ══════════════════════════════════════════════════════════════
describe('scoreLead', () => {
  it('retorna ⬜ para lead Cerrado', () => {
    const r = scoreLead({ etapa: 'Cerrado', dias: 1 })
    expect(r.label).toBe('⬜')
  })

  it('retorna ⬜ para lead Perdido', () => {
    const r = scoreLead({ etapa: 'Perdido', dias: 1 })
    expect(r.label).toBe('⬜')
  })

  it('retorna Caliente si dias < 3', () => {
    const r = scoreLead({ etapa: 'Activo', dias: 2 })
    expect(r.label).toBe('🟢 Caliente')
  })

  it('retorna Tibio si dias <= 7', () => {
    const r = scoreLead({ etapa: 'Activo', dias: 5 })
    expect(r.label).toBe('🟡 Tibio')
  })

  it('retorna Frío si dias > 7', () => {
    const r = scoreLead({ etapa: 'Activo', dias: 15 })
    expect(r.label).toBe('🔴 Frío')
  })

  it('retorna Caliente si dias = 0', () => {
    const r = scoreLead({ etapa: 'Activo', dias: 0 })
    expect(r.label).toBe('🟢 Caliente')
  })

  it('retorna Tibio si dias = 7 (borde)', () => {
    const r = scoreLead({ etapa: 'Activo', dias: 7 })
    expect(r.label).toBe('🟡 Tibio')
  })
})

// ══════════════════════════════════════════════════════════════
// matchLeadProps
// ══════════════════════════════════════════════════════════════
describe('matchLeadProps', () => {
  const baseProp = {
    activa: true,
    zona: 'centro',
    tipo: 'depto',
    precio: 100000,
    caracts: '',
  }

  const baseLead = {
    zona: 'centro',
    tipo: 'depto',
    presup: 100000,
    op: 'compra',
  }

  it('retorna [] si lead es null', () => {
    expect(matchLeadProps(null, [baseProp])).toEqual([])
  })

  it('retorna [] si properties está vacío', () => {
    expect(matchLeadProps(baseLead, [])).toEqual([])
  })

  it('retorna [] para leads de alquiler', () => {
    const lead = { ...baseLead, op: 'alquiler' }
    expect(matchLeadProps(lead, [baseProp])).toEqual([])
  })

  it('match básico: zona + tipo + precio exacto = score 90', () => {
    const result = matchLeadProps(baseLead, [baseProp])
    expect(result).toHaveLength(1)
    expect(result[0]._score).toBe(90)
  })

  it('no matchea si zona no coincide', () => {
    const prop = { ...baseProp, zona: 'belgrano' }
    expect(matchLeadProps(baseLead, [prop])).toEqual([])
  })

  it('no matchea si precio supera 10% del presupuesto', () => {
    const prop = { ...baseProp, precio: 115000 }
    expect(matchLeadProps(baseLead, [prop])).toEqual([])
  })

  it('matchea con score reducido si precio hasta 5% sobre presupuesto', () => {
    const prop = { ...baseProp, precio: 104000 }
    const result = matchLeadProps(baseLead, [prop])
    expect(result).toHaveLength(1)
    expect(result[0]._score).toBeLessThan(90)
  })

  it('no matchea si tipo no coincide', () => {
    const prop = { ...baseProp, tipo: 'casa' }
    expect(matchLeadProps(baseLead, [prop])).toEqual([])
  })

  it('excluye propiedades inactivas', () => {
    const prop = { ...baseProp, activa: false }
    expect(matchLeadProps(baseLead, [prop])).toEqual([])
  })

  it('soporta múltiples zonas separadas por coma', () => {
    const lead = { ...baseLead, zona: 'centro, norte' }
    const prop = { ...baseProp, zona: 'norte' }
    const result = matchLeadProps(lead, [prop])
    expect(result).toHaveLength(1)
  })

  it('retorna máximo 5 resultados', () => {
    const props = Array.from({ length: 10 }, (_, i) => ({
      ...baseProp,
      id: i,
      precio: 90000 + i * 1000,
    }))
    const result = matchLeadProps(baseLead, props)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('ordena por score descendente', () => {
    const props = [
      { ...baseProp, id: 1, precio: 104000 }, // score menor
      { ...baseProp, id: 2, precio: 100000 }, // score mayor
    ]
    const result = matchLeadProps(baseLead, props)
    expect(result[0]._score).toBeGreaterThanOrEqual(result[1]._score)
  })
})

// ══════════════════════════════════════════════════════════════
// genMsgWhatsApp
// ══════════════════════════════════════════════════════════════
describe('genMsgWhatsApp', () => {
  const lead = { nombre: 'María' }
  const prop = {
    tipo: 'Depto',
    zona: 'Centro',
    dir: 'San Martín 123',
    precio: 95000,
    m2tot: 60,
    caracts: 'Cochera, Balcón',
  }

  it('incluye el nombre del lead', () => {
    expect(genMsgWhatsApp(lead, prop)).toContain('María')
  })

  it('incluye el tipo y zona de la propiedad', () => {
    const msg = genMsgWhatsApp(lead, prop)
    expect(msg).toContain('Depto')
    expect(msg).toContain('Centro')
  })

  it('incluye el precio formateado', () => {
    expect(genMsgWhatsApp(lead, prop)).toContain('USD')
  })

  it('incluye m2 si está disponible', () => {
    expect(genMsgWhatsApp(lead, prop)).toContain('60m²')
  })

  it('incluye caracts si están disponibles', () => {
    expect(genMsgWhatsApp(lead, prop)).toContain('Cochera')
  })

  it('muestra "a consultar" si no hay precio', () => {
    const p = { ...prop, precio: null }
    expect(genMsgWhatsApp(lead, p)).toContain('a consultar')
  })

  it('omite m2 si no está disponible', () => {
    const p = { ...prop, m2tot: null }
    expect(genMsgWhatsApp(lead, p)).not.toContain('m²')
  })
})

// ══════════════════════════════════════════════════════════════
// genMsgBusqueda
// ══════════════════════════════════════════════════════════════
describe('genMsgBusqueda', () => {
  const leadBase = {
    tipo: 'Depto',
    zona: 'Centro',
    presup: 100000,
    prob: 80,
    ambientes: 3,
    cochera: 'si',
    balcon: 'si',
    patio: 'no',
    credito: 'no',
    m2min: null,
    op: 'Compra',
  }

  it('incluye encabezado urgente para prob >= 80', () => {
    expect(genMsgBusqueda(leadBase)).toContain('PEDIDO URGENTE')
  })

  it('incluye encabezado activo para prob 60-79', () => {
    const lead = { ...leadBase, prob: 70 }
    expect(genMsgBusqueda(lead)).toContain('MUY INTERESADO')
  })

  it('incluye encabezado en curso para prob 40-59', () => {
    const lead = { ...leadBase, prob: 50 }
    expect(genMsgBusqueda(lead)).toContain('BÚSQUEDA EN CURSO')
  })

  it('incluye tipo y zona', () => {
    const msg = genMsgBusqueda(leadBase)
    expect(msg).toContain('Depto')
    expect(msg).toContain('Centro')
  })

  it('incluye presupuesto formateado', () => {
    expect(genMsgBusqueda(leadBase)).toContain('USD')
  })

  it('incluye cochera si aplica', () => {
    expect(genMsgBusqueda(leadBase)).toContain('Cochera')
  })

  it('incluye firma Alba Inversiones', () => {
    expect(genMsgBusqueda(leadBase)).toContain('Alba Inversiones')
  })

  it('funciona sin presupuesto', () => {
    const lead = { ...leadBase, presup: null }
    const msg = genMsgBusqueda(lead)
    expect(msg).toContain('Depto')
    expect(msg).not.toContain('USD')
  })
})