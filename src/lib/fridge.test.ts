import { describe, expect, it } from 'vitest'
import { applyUsage, daysSince, fridgeState, fridgeText, groupStock, sinceText, type StockItem, type StockRow } from './fridge'

describe('nevera', () => {
  it('cuenta días enteros', () => {
    expect(daysSince('2026-10-16', '2026-10-18')).toBe(2)
    expect(daysSince('2026-10-18', '2026-10-18')).toBe(0)
    expect(daysSince('2026-10-30', '2026-10-18')).toBe(0)
  })
  it('estados: 0-2 ok, 3-4 aviso, más de 4 pasado', () => {
    expect([0, 2, 3, 4, 5].map(fridgeState)).toEqual(['ok', 'ok', 'aviso', 'aviso', 'pasado'])
  })
  it('textos', () => {
    expect(fridgeText(0)).toBe('hecho hoy · te quedan 4 días')
    expect(fridgeText(2)).toBe('hecho hace 2 días · te quedan 2 días')
    expect(fridgeText(3)).toContain('cómelo hoy o congélalo')
    expect(fridgeText(5)).toContain('pasó el límite')
  })
  it('congelador: bien hasta ≈ 2 meses, después aviso de calidad', () => {
    expect(fridgeState(10, 'congelador')).toBe('ok')
    expect(fridgeState(60, 'congelador')).toBe('aviso')
    expect(fridgeText(0, 'congelador')).toBe('congelado hoy · se conserva bien ≈ 2 meses')
    expect(fridgeText(61, 'congelador')).toContain('pierde calidad')
  })
  it('despensa: sin avisos de días', () => {
    expect(fridgeState(300, 'despensa')).toBe('ok')
    expect(fridgeText(300, 'despensa')).toBe('')
  })
  it('agrupa lo que hay en casa: nevera, congelador, despensa; lo que queda poco, primero', () => {
    const mk = (name: string, kind: StockItem['kind'], low = false): StockItem => ({ id: name, name, kind, made_on: null, food_id: null, low, note: null, grams: null, pack_g: null })
    const g = groupStock([mk('Arroz', 'despensa'), mk('Huevos', 'nevera'), mk('Atún', 'despensa', true), mk('Melón', 'congelador'), mk('Burrata', 'nevera')])
    expect(g.map((x) => x.kind)).toEqual(['nevera', 'congelador', 'despensa'])
    expect(g[0].items.map((i) => i.name)).toEqual(['Burrata', 'Huevos'])
    expect(g[2].items.map((i) => i.name)).toEqual(['Atún', 'Arroz'])
  })
  it('desde cuándo', () => {
    expect(sinceText(null, '2026-10-21')).toBe('')
    expect(sinceText('2026-10-21', '2026-10-21')).toBe('desde hoy')
    expect(sinceText('2026-10-18', '2026-10-21')).toBe('desde hace 3 días')
  })
  it('descuenta lo usado: queda, queda poco y se agota', () => {
    const row = (id: string, food_id: string, grams: number | null, pack_g: number | null = grams, low = false): StockRow => ({ id, name: id, food_id, grams, pack_g, low })
    const r = applyUsage(
      [row('pollo', 'f1', 600), row('york', 'f2', 100, 500), row('arroz', 'f3', 150), row('huevos', 'f4', null), row('sal', 'f5', 50)],
      [{ food_id: 'f1', grams: 150 }, { food_id: 'f2', grams: 40 }, { food_id: 'f3', grams: 150 }, { food_id: 'f4', grams: 110 }],
    )
    expect(r.updates).toEqual([
      { id: 'pollo', name: 'pollo', grams: 450, low: false },
      { id: 'york', name: 'york', grams: 60, low: true },
    ])
    expect(r.deletes).toEqual([{ id: 'arroz', name: 'arroz' }])
    expect(r.untracked).toEqual([{ id: 'huevos', name: 'huevos' }])
  })
  it('lo usado que no está en casa no hace nada', () => {
    expect(applyUsage([], [{ food_id: 'x', grams: 10 }])).toEqual({ updates: [], deletes: [], untracked: [] })
  })
})

