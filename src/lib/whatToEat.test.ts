import { describe, expect, it } from 'vitest'
import { cookable, mealBudget, rankRecipes } from './whatToEat'
import type { Food, Recipe } from '../types'

const food = (id: string, name: string, kcal: number, protein: number): Food => ({ id, name, kcal, protein, carbs: 0, fat: 0, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })
const recipe = (id: string, name: string, meal: Recipe['meal'], servings = 1): Recipe => ({ id, name, minutes: 10, meal, steps: '', tags: [], servings, final_weight_g: null, method: null })

const pollo = food('pollo', 'Pollo', 100, 20) // por 100 g
const arroz = food('arroz', 'Arroz', 130, 3)
const pastel = food('pastel', 'Pastel', 400, 8)
const foodById = new Map([pollo, arroz, pastel].map((f) => [f.id, f]))
const recipes = [
  recipe('r1', 'Pollo con arroz', 'comida'), // 200 g pollo + 150 g arroz = 200+195 kcal, 40+4.5 g
  recipe('r2', 'Pastel', 'cualquiera'), // 200 g de pastel = 800 kcal, 16 g
  recipe('r3', 'Desayuno de arroz', 'desayuno'),
]
const items = new Map([
  ['r1', [{ food_id: 'pollo', grams: 200 }, { food_id: 'arroz', grams: 150 }]],
  ['r2', [{ food_id: 'pastel', grams: 200 }]],
  ['r3', [{ food_id: 'arroz', grams: 100 }]],
])

describe('presupuesto del momento', () => {
  it('reparte lo que falta entre este momento y los que quedan', () => {
    const b = mealBudget('comida', { kcal: 1000, protein: 100 })
    // comida 0,35 de (0,35 + cena 0,30 + extras 0,10) = 0,35/0,75
    expect(Math.round(b.kcal)).toBe(467)
    expect(Math.round(b.protein)).toBe(47)
  })

  it('la cena no deja nada para después salvo los extras', () => {
    const b = mealBudget('cena', { kcal: 500, protein: 40 })
    expect(Math.round(b.kcal)).toBe(375) // 0,30 / (0,30 + 0,10)
  })
})

describe('recetas que puedes hacer', () => {
  it('con cantidad, alcanza; sin cantidad, que haya', () => {
    expect(cookable(recipes[0], items.get('r1')!, new Map([['pollo', 300], ['arroz', null]]))).toBe(true)
    expect(cookable(recipes[0], items.get('r1')!, new Map([['pollo', 100], ['arroz', null]]))).toBe(false)
    expect(cookable(recipes[0], items.get('r1')!, new Map([['arroz', null]]))).toBe(false)
  })

  it('una receta de varias raciones pide solo una ración', () => {
    const pizza = recipe('p', 'Pizza', 'cualquiera', 4)
    expect(cookable(pizza, [{ food_id: 'pastel', grams: 400 }], new Map([['pastel', 100]]))).toBe(true)
  })

  it('ordena por encaje y avisa de lo que no te ayuda', () => {
    const have = new Map<string, number | null>([['pollo', null], ['arroz', null], ['pastel', null]])
    const out = rankRecipes('comida', { kcal: 800, protein: 80 }, recipes, items, foodById, have)
    expect(out.map((c) => c.recipe.name)).toEqual(['Pollo con arroz', 'Pastel']) // el desayuno no se propone a la comida
    expect(out[0]).toMatchObject({ kcal: 395, protein: 45, notes: [] })
    expect(out[1].notes).toContain('Mucha caloría de golpe')
    expect(out[1].notes).toContain('Poca proteína para una comida principal')
  })

  it('el desayuno propone solo recetas de desayuno o cualquiera', () => {
    const have = new Map<string, number | null>([['pollo', null], ['arroz', null], ['pastel', null]])
    const out = rankRecipes('desayuno', { kcal: 2000, protein: 140 }, recipes, items, foodById, have)
    expect(out.map((c) => c.recipe.name).sort()).toEqual(['Desayuno de arroz', 'Pastel'])
  })

  it('sin nada en casa no hay propuestas', () => {
    expect(rankRecipes('comida', { kcal: 800, protein: 80 }, recipes, items, foodById, new Map())).toEqual([])
  })
})
