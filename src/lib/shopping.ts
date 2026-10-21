import type { Food, Recipe } from '../types'
import { addDays, type PlanRow } from './plan'

export type Zone = 'Fruta y verdura' | 'Pan y masas' | 'Nevera' | 'Congelados' | 'Despensa'
export const ZONES: Zone[] = ['Fruta y verdura', 'Pan y masas', 'Nevera', 'Congelados', 'Despensa']

/** Zona del súper donde se suele encontrar un alimento (por su nombre). */
export function zoneOf(name: string): Zone {
  const n = name.toLowerCase()
  if (/congelad/.test(n)) return 'Congelados'
  if (/^pan( |$)|tortilla de trigo|masa fresca|bagel|wrap/.test(n)) return 'Pan y masas'
  if (/tomate|plátano|platano|patata|boniato|espinaca|champiñon|brócoli|brocoli|piña|fresa|cherry|melón|melon|lechuga|zanahoria|calabac|pimiento|aguacate/.test(n)) return 'Fruta y verdura'
  if (/huevo|clara|yogur|skyr|queso|cottage|mozzarella|burrata|jamón|jamon|york|pavo|pollo|salmón|salmon|gambas|tofu|mantequilla|leche entera|guacamole|bacon|kéfir|kefir/.test(n)) return 'Nevera'
  return 'Despensa'
}

export interface ShoppingLine {
  food: Food
  /** gramos totales entre todas las recetas elegidas */
  grams: number
  /** nombres de las recetas que lo usan */
  from: string[]
}

/**
 * Lista de la compra de las recetas elegidas: suma los gramos por alimento y separa lo que ya hay en casa
 * (alimentos enlazados en "En casa") de lo que hay que comprar.
 */
export function shoppingList(
  recipeIds: string[],
  recipes: Recipe[],
  itemsByRecipe: Map<string, { food_id: string; grams: number }[]>,
  foodById: Map<string, Food>,
  inHome: Set<string>,
): { toBuy: ShoppingLine[]; have: ShoppingLine[] } {
  const lines = new Map<string, ShoppingLine>()
  for (const id of recipeIds) {
    const r = recipes.find((x) => x.id === id)
    if (!r) continue
    for (const it of itemsByRecipe.get(id) ?? []) {
      const food = foodById.get(it.food_id)
      if (!food) continue
      const line = lines.get(food.id) ?? { food, grams: 0, from: [] }
      line.grams += it.grams
      if (!line.from.includes(r.name)) line.from.push(r.name)
      lines.set(food.id, line)
    }
  }
  const all = [...lines.values()].sort((a, b) => a.food.name.localeCompare(b.food.name, 'es'))
  return { toBuy: all.filter((l) => !inHome.has(l.food.id)), have: all.filter((l) => inHome.has(l.food.id)) }
}

/** Lo perecedero se compra cerca del día en que se usa. */
const PERISHABLE: Zone[] = ['Fruta y verdura', 'Pan y masas', 'Nevera']

export interface PlanShopping {
  /** compra de ahora: toda la primera semana más lo no perecedero de la segunda */
  trip1: ShoppingLine[]
  /** compra de mitad de ciclo: lo perecedero de la segunda semana */
  trip2: ShoppingLine[]
  /** lo que el plan usa y ya hay en casa */
  have: ShoppingLine[]
}

/**
 * Lista de la compra de un plan: suma los gramos de cada comida planificada (por sus raciones) y los reparte en dos compras
 * según la caducidad. `inHome` son los alimentos que hay en casa y no quedan poco: no se compran.
 */
export function planShopping(
  rows: PlanRow[],
  today: string,
  itemsByRecipe: Map<string, { food_id: string; grams: number }[]>,
  recipes: Recipe[],
  foodById: Map<string, Food>,
  inHome: Set<string>,
): PlanShopping {
  const week1Last = addDays(today, 6)
  const maps = { trip1: new Map<string, ShoppingLine>(), trip2: new Map<string, ShoppingLine>(), have: new Map<string, ShoppingLine>() }
  const add = (m: Map<string, ShoppingLine>, food: Food, grams: number, from: string) => {
    const line = m.get(food.id) ?? { food, grams: 0, from: [] }
    line.grams += grams
    if (!line.from.includes(from)) line.from.push(from)
    m.set(food.id, line)
  }
  for (const row of rows) {
    if (!row.recipe_id) continue
    const recipe = recipes.find((r) => r.id === row.recipe_id)
    if (!recipe) continue
    for (const it of itemsByRecipe.get(row.recipe_id) ?? []) {
      const food = foodById.get(it.food_id)
      if (!food) continue
      const grams = it.grams * row.servings
      if (inHome.has(food.id)) add(maps.have, food, grams, recipe.name)
      else if (row.date <= week1Last || !PERISHABLE.includes(zoneOf(food.name))) add(maps.trip1, food, grams, recipe.name)
      else add(maps.trip2, food, grams, recipe.name)
    }
  }
  const sorted = (m: Map<string, ShoppingLine>) => [...m.values()].sort((a, b) => a.food.name.localeCompare(b.food.name, 'es'))
  return { trip1: sorted(maps.trip1), trip2: sorted(maps.trip2), have: sorted(maps.have) }
}
