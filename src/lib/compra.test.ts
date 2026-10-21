import { describe, expect, it } from 'vitest'
import { dailyUse, recipeCoverage, suggestions } from './compra'
import type { Food, Recipe } from '../types'

const food = (id: string, name: string): Food => ({ id, name, kcal: 0, protein: 0, carbs: 0, fat: 0, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })
const recipe = (id: string, name: string): Recipe => ({ id, name, minutes: 10, meal: 'cualquiera', steps: '', tags: [], servings: 1, final_weight_g: null, method: null })

const pollo = food('pollo', 'Pechuga de pollo')
const arroz = food('arroz', 'Arroz cocido')
const tomate = food('tomate', 'Tomate')
const atun = food('atun', 'Atún en aceite')
const foodById = new Map([pollo, arroz, tomate, atun].map((f) => [f.id, f]))

describe('consumo diario', () => {
  it('reparte lo consumido entre al menos 7 días', () => {
    const use = dailyUse([{ date: '2026-10-20', items: [{ food_id: 'pollo', grams: 140 }] }, { date: '2026-10-21', items: [{ food_id: 'pollo', grams: 140 }] }], '2026-10-21')
    expect(use.get('pollo')).toBe(40) // 280 g en 7 días
  })

  it('con más historial usa los días reales, hasta 28', () => {
    const meals = [{ date: '2026-10-01', items: [{ food_id: 'arroz', grams: 280 }] }]
    expect(dailyUse(meals, '2026-10-14')?.get('arroz')).toBe(20) // 14 días
    expect(dailyUse(meals, '2026-11-20').size).toBe(0) // fuera de los 28 días
  })

  it('sin comidas con detalle no hay consumo', () => {
    expect(dailyUse([{ date: '2026-10-20', items: null }], '2026-10-21').size).toBe(0)
  })
})

describe('qué comprar', () => {
  const use = new Map([['pollo', 40], ['arroz', 30], ['tomate', 20], ['atun', 10]])

  it('compra fresca: 8 días, solo lo fresco, menos lo que hay', () => {
    const s = suggestions('fresca', use, new Map([['pollo', 100]]), foodById)
    expect(s.map((x) => [x.food.name, x.grams])).toEqual([['Pechuga de pollo', 220], ['Tomate', 160]]) // pollo 320-100; tomate 160
  })

  it('compra grande: 15 días, todo; lo que hay sin cantidad se da por suficiente', () => {
    const s = suggestions('grande', use, new Map([['arroz', null]]), foodById)
    expect(s.map((x) => x.food.name)).toEqual(['Atún en aceite', 'Pechuga de pollo', 'Tomate'])
    expect(s.find((x) => x.food.id === 'pollo')?.grams).toBe(600)
  })

  it('no sugiere cantidades diminutas', () => {
    expect(suggestions('grande', new Map([['pollo', 0.5]]), new Map(), foodById)).toEqual([])
  })
})

describe('recetas cubiertas', () => {
  const recipes = [recipe('r1', 'Pollo con arroz'), recipe('r2', 'Ensalada'), recipe('r3', 'Bocata')]
  const items = new Map([
    ['r1', [{ food_id: 'pollo', grams: 150 }, { food_id: 'arroz', grams: 150 }]],
    ['r2', [{ food_id: 'tomate', grams: 100 }, { food_id: 'atun', grams: 55 }, { food_id: 'arroz', grams: 20 }]],
    ['r3', [{ food_id: 'pollo', grams: 100 }, { food_id: 'tomate', grams: 50 }, { food_id: 'atun', grams: 55 }, { food_id: 'arroz', grams: 60 }]],
  ])

  it('verde, amarillo y gris según lo que falta', () => {
    const cov = recipeCoverage(recipes, items, foodById, new Map([['arroz', null]]), new Set(['pollo']))
    expect(cov.map((c) => [c.recipe.name, c.status, c.missing.map((m) => m.name)])).toEqual([
      ['Pollo con arroz', 'verde', []],
      ['Bocata', 'amarillo', ['Tomate', 'Atún en aceite']],
      ['Ensalada', 'amarillo', ['Tomate', 'Atún en aceite']],
    ])
  })

  it('lo que hay con cantidad solo cubre si alcanza', () => {
    const cov = recipeCoverage([recipes[0]], items, foodById, new Map([['pollo', 100], ['arroz', 150]]), new Set())
    expect(cov[0].missing.map((m) => m.name)).toEqual(['Pechuga de pollo']) // pide 150 g y hay 100
  })

  it('con tres o más faltantes es gris', () => {
    const cov = recipeCoverage([recipes[2]], items, foodById, new Map(), new Set())
    expect(cov[0].status).toBe('gris')
  })
})
