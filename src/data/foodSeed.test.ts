import { describe, expect, it } from 'vitest'
import { SEED_FOODS, SEED_FOODS_V2, SEED_RECIPES } from './foodSeed'
import { recipeMacros, roundMacros } from '../lib/nutrition'

const foods = new Map(SEED_FOODS.map((f, i) => [f.name, { ...f, food_id: String(i) }]))
const byId = new Map([...foods.values()].map((f) => [f.food_id, f]))

describe('datos iniciales de alimentación', () => {
  it('no hay alimentos ni recetas con nombre repetido', () => {
    expect(new Set(SEED_FOODS.map((f) => f.name)).size).toBe(SEED_FOODS.length)
    expect(new Set(SEED_RECIPES.map((r) => r.name)).size).toBe(SEED_RECIPES.length)
  })

  it('cada ingrediente de cada receta existe como alimento', () => {
    for (const r of SEED_RECIPES) for (const [name] of r.items) expect(foods.has(name), `${r.name}: ${name}`).toBe(true)
  })

  it('las calorías de cada alimento coinciden con sus macros (Atwater, margen 25 %)', () => {
    for (const f of SEED_FOODS) {
      const est = f.protein * 4 + f.carbs * 4 + f.fat * 9
      expect(Math.abs(est - f.kcal), f.name).toBeLessThanOrEqual(Math.max(25, f.kcal * 0.25))
    }
  })

  it('cada receta es razonable: 250-800 kcal y 20 g de proteína o más por ración', () => {
    for (const r of SEED_RECIPES) {
      const m = roundMacros(recipeMacros(r.items.map(([n, g]) => ({ food_id: foods.get(n)!.food_id, grams: g })), byId, 1))
      expect(m.kcal, r.name).toBeGreaterThanOrEqual(250)
      expect(m.kcal, r.name).toBeLessThanOrEqual(800)
      expect(m.protein, r.name).toBeGreaterThanOrEqual(20)
    }
  })

  it('los alimentos genéricos nuevos no repiten nombres ni los iniciales, y todos son estimados', () => {
    const base = new Set(SEED_FOODS.map((f) => f.name))
    const names = SEED_FOODS_V2.map((f) => f.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(base.has(n), n).toBe(false)
    for (const f of SEED_FOODS_V2) expect(f.estimated, f.name).toBe(true)
  })

  it('las calorías de los genéricos coinciden con sus macros (Atwater, margen 25 %)', () => {
    // el alcohol aporta 7 kcal/g y no figura en los macros: estas bebidas se comprueban aparte
    const conAlcohol = new Set(['Cerveza', 'Vino tinto'])
    for (const f of SEED_FOODS_V2) {
      if (conAlcohol.has(f.name)) continue
      const est = f.protein * 4 + f.carbs * 4 + f.fat * 9
      expect(Math.abs(est - f.kcal), f.name).toBeLessThanOrEqual(Math.max(25, f.kcal * 0.25))
    }
  })

  it('las bebidas con alcohol tienen más calorías que las de sus macros', () => {
    for (const n of ['Cerveza', 'Vino tinto']) {
      const f = SEED_FOODS_V2.find((x) => x.name === n)!
      expect(f.kcal, n).toBeGreaterThan(f.protein * 4 + f.carbs * 4 + f.fat * 9)
    }
  })

  it('todo genérico con medida casera tiene nombre de unidad y peso positivo', () => {
    for (const f of SEED_FOODS_V2) {
      if (f.unit_g != null) {
        expect(f.unit_g, f.name).toBeGreaterThan(0)
        expect(f.unit_label, f.name).toBeTruthy()
        expect(f.unit_plural, f.name).toBeTruthy()
      }
    }
  })
})
