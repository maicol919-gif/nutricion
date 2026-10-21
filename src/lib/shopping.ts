import type { Food, Recipe } from '../types'

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
 * Lista de la compra de las recetas elegidas: suma los gramos por alimento. `inHome` dice cuánto hay en casa de cada alimento
 * (los gramos que quedan, o null si no se lleva cantidad y se da por suficiente): se compra solo lo que falta.
 */
export function shoppingList(
  recipeIds: string[],
  recipes: Recipe[],
  itemsByRecipe: Map<string, { food_id: string; grams: number }[]>,
  foodById: Map<string, Food>,
  inHome: Map<string, number | null>,
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
  const toBuy: ShoppingLine[] = []
  const have: ShoppingLine[] = []
  for (const l of all) {
    const avail = inHome.get(l.food.id)
    if (avail === undefined) toBuy.push(l)
    else if (avail === null || avail >= l.grams) have.push(l)
    else toBuy.push({ ...l, grams: l.grams - avail })
  }
  return { toBuy, have }
}
