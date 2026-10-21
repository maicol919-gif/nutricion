import { describe, expect, it } from 'vitest'
import { planShopping, shoppingList, zoneOf } from './shopping'
import type { PlanRow } from './plan'
import type { Food, Recipe } from '../types'

const food = (id: string, name: string): Food => ({ id, name, kcal: 0, protein: 0, carbs: 0, fat: 0, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })
const recipe = (id: string, name: string): Recipe => ({ id, name, minutes: 10, meal: 'cualquiera', steps: '', tags: [], servings: 1, final_weight_g: null, method: null })

const foods = [food('a', 'Atún en aceite'), food('t', 'Tomate'), food('p', 'Pan integral')]
const foodById = new Map(foods.map((f) => [f.id, f]))
const recipes = [recipe('r1', 'Bocata'), recipe('r2', 'Ensalada')]
const itemsByRecipe = new Map([
  ['r1', [{ food_id: 'a', grams: 55 }, { food_id: 'p', grams: 60 }, { food_id: 't', grams: 50 }]],
  ['r2', [{ food_id: 'a', grams: 110 }, { food_id: 't', grams: 100 }]],
])

describe('lista de la compra', () => {
  it('suma los gramos por alimento entre las recetas elegidas', () => {
    const { toBuy } = shoppingList(['r1', 'r2'], recipes, itemsByRecipe, foodById, new Set())
    expect(toBuy.find((l) => l.food.id === 'a')).toMatchObject({ grams: 165, from: ['Bocata', 'Ensalada'] })
    expect(toBuy.find((l) => l.food.id === 't')?.grams).toBe(150)
    expect(toBuy).toHaveLength(3)
  })

  it('separa lo que ya hay en casa', () => {
    const { toBuy, have } = shoppingList(['r1'], recipes, itemsByRecipe, foodById, new Set(['a']))
    expect(have.map((l) => l.food.name)).toEqual(['Atún en aceite'])
    expect(toBuy.map((l) => l.food.name)).toEqual(['Pan integral', 'Tomate'])
  })

  it('sin recetas elegidas no hay nada', () => {
    expect(shoppingList([], recipes, itemsByRecipe, foodById, new Set())).toEqual({ toBuy: [], have: [] })
  })

  it('zona del súper por nombre', () => {
    expect(zoneOf('Tomate triturado')).toBe('Fruta y verdura')
    expect(zoneOf('Pan integral')).toBe('Pan y masas')
    expect(zoneOf('Verdura variada (congelada o microondas)')).toBe('Congelados')
    expect(zoneOf('Queso cottage')).toBe('Nevera')
    expect(zoneOf('Atún en aceite de oliva (escurrido)')).toBe('Despensa')
  })

  it('plan: reparte la compra en dos viajes según la caducidad y resta lo que hay en casa', () => {
    const fs = [food('pollo', 'Pechuga de pollo'), food('arroz', 'Arroz crudo'), food('tom', 'Tomate'), food('atun', 'Atún en aceite')]
    const fById = new Map(fs.map((f) => [f.id, f]))
    const rs = [recipe('r1', 'Pollo con arroz'), recipe('r2', 'Ensalada')]
    const items = new Map([
      ['r1', [{ food_id: 'pollo', grams: 150 }, { food_id: 'arroz', grams: 60 }]],
      ['r2', [{ food_id: 'tom', grams: 100 }, { food_id: 'atun', grams: 55 }, { food_id: 'arroz', grams: 20 }]],
    ])
    const row = (date: string, recipe_id: string, servings = 1): PlanRow => ({ id: date + recipe_id, date, meal: 'comida', recipe_id, label: null, servings, note: null })
    const plan = [row('2026-10-22', 'r1'), row('2026-10-30', 'r1', 2), row('2026-10-31', 'r2')]
    const out = planShopping(plan, '2026-10-21', items, rs, fById, new Set(['atun']))
    // semana 1: pollo y arroz. semana 2: el pollo (perecedero) va al segundo viaje; el arroz (despensa) se suma al primero
    expect(out.trip1.map((l) => [l.food.name, l.grams])).toEqual([['Arroz crudo', 60 + 120 + 20], ['Pechuga de pollo', 150]])
    expect(out.trip2.map((l) => [l.food.name, l.grams])).toEqual([['Pechuga de pollo', 300], ['Tomate', 100]])
    expect(out.have.map((l) => l.food.name)).toEqual(['Atún en aceite'])
  })
})

