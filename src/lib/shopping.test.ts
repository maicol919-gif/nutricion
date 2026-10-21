import { describe, expect, it } from 'vitest'
import { shoppingList, zoneOf } from './shopping'
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
})
