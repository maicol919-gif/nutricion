import { describe, expect, it } from 'vitest'
import { daysSince, fridgeState, fridgeText } from './fridge'

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
})
