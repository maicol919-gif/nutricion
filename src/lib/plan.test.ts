import { describe, expect, it } from 'vitest'
import { addDays, planWindow, repeatedRecipes, type PlanRow } from './plan'

const row = (date: string, meal: PlanRow['meal'], recipe_id: string | null = 'r1'): PlanRow => ({ id: date + meal, date, meal, recipe_id, label: null, servings: 1, note: null })

describe('plan', () => {
  it('suma días cruzando el fin de mes', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-10-21', 0)).toBe('2026-10-21')
  })

  it('ventana de 14 días ordenada por día y momento', () => {
    const rows = [row('2026-10-22', 'cena'), row('2026-10-22', 'desayuno'), row('2026-10-20', 'comida'), row('2026-11-04', 'comida'), row('2026-11-03', 'comida')]
    const w = planWindow(rows, '2026-10-21', 14)
    expect(w.map((r) => r.date + r.meal)).toEqual(['2026-10-22desayuno', '2026-10-22cena', '2026-11-03comida'])
  })

  it('avisa de recetas repetidas más de 2 veces', () => {
    const rows = [row('2026-10-21', 'comida', 'a'), row('2026-10-22', 'comida', 'a'), row('2026-10-23', 'comida', 'a'), row('2026-10-24', 'cena', 'b'), row('2026-10-25', 'cena', null)]
    expect(repeatedRecipes(rows)).toEqual([{ recipe_id: 'a', times: 3 }])
    expect(repeatedRecipes(rows, 3)).toEqual([])
  })
})
