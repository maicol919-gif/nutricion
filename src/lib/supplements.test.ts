import { describe, expect, it } from 'vitest'
import { caffeineFromMeals, caffeineLeftAt, caffeineStatus, caffeineTotal, recentDistinct, type Supp } from './supplements'
import type { Food } from '../types'

const supp = (name: string, taken_at: string, caffeine_mg = 0): Supp => ({ id: name + taken_at, date: taken_at.slice(0, 10), taken_at, name, dose: null, caffeine_mg, note: null })

describe('cafeína', () => {
  it('suma lo del día', () => {
    expect(caffeineTotal([supp('Pre-entreno', '2026-10-19T15:30:00', 250), supp('Café', '2026-10-19T08:00:00', 90), supp('Normogrip', '2026-10-19T20:00:00')])).toBe(340)
  })

  it('a las 5 h queda la mitad y a las 10 h, un cuarto', () => {
    const e = [supp('Pre', '2026-10-19T12:00:00', 200)]
    expect(Math.round(caffeineLeftAt(e, new Date('2026-10-19T17:00:00')))).toBe(100)
    expect(Math.round(caffeineLeftAt(e, new Date('2026-10-19T22:00:00')))).toBe(50)
    expect(caffeineLeftAt(e, new Date('2026-10-19T11:00:00'))).toBe(0) // aún no se había tomado
  })

  it('avisa si pasa de 400 mg al día o de 200 mg de una vez', () => {
    const s = caffeineStatus([supp('Pre-entreno', '2026-10-19T17:30:00', 250), supp('Café', '2026-10-19T09:00:00', 90)], '2026-10-19')
    expect(s).toMatchObject({ total: 340, overDay: false, bigDose: true })
    // 250 mg a las 17:30 → a las 23:30 (6 h) quedan ≈ 109 mg; el café de las 9:00 casi nada
    expect(Math.round(s.atBedtime)).toBeGreaterThan(105)
    expect(Math.round(s.atBedtime)).toBeLessThan(125)
    expect(caffeineStatus([supp('A', '2026-10-19T09:00:00', 250), supp('B', '2026-10-19T12:00:00', 200)], '2026-10-19').overDay).toBe(true)
  })
})

describe('recientes', () => {
  it('lo último de cada cosa, sin repetir nombre', () => {
    const r = recentDistinct([supp('Normogrip', '2026-10-19T20:00:00'), supp('Pre-entreno', '2026-10-20T17:00:00', 250), supp('normogrip', '2026-10-21T17:30:00')])
    expect(r.map((x) => x.name)).toEqual(['normogrip', 'Pre-entreno'])
  })
})

describe('cafeína en la comida', () => {
  const cafe: Food = { id: 'cafe', name: 'Café con leche', kcal: 25, protein: 1.7, carbs: 2.3, fat: 1.2, unit_g: 200, unit_label: 'taza', unit_plural: null, estimated: false, disabled: false, aliases: [], caffeine_mg: 45 }
  const pan: Food = { ...cafe, id: 'pan', name: 'Pan', caffeine_mg: 0 }
  const foods = new Map([cafe, pan].map((f) => [f.id, f]))

  it('suma la de los alimentos que llevan y a la hora en que se registró', () => {
    const out = caffeineFromMeals([{ created_at: '2026-10-21T08:30:00.000Z', items: [{ food_id: 'cafe', grams: 200 }, { food_id: 'pan', grams: 60 }] }, { created_at: '2026-10-21T10:00:00.000Z', items: null }], foods)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ name: 'Café con leche', caffeine_mg: 90, taken_at: '2026-10-21T08:30:00.000Z', note: 'En tus comidas' })
  })
})

