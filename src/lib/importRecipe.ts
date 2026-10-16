import type { Food, Method } from '../types'
import { keyWords, normalize } from './foods'
import { rowFromGrams, type MealRow } from './meal'

/** Receta tal como la devuelve la lectura de una foto o PDF (Edge Function read-recipe). */
export interface ImportedIngredient {
  name: string
  quantity: number | null
  unit: string | null
  /** estimación en gramos para toda la receta, hecha por el lector */
  grams: number | null
  optional: boolean
}

export interface ImportedRecipe {
  name: string
  servings: number | null
  minutes: number | null
  method: string
  ingredients: ImportedIngredient[]
  steps: string[]
  notes: string
}

const METHODS = new Set<string>(['horno', 'sarten', 'microondas', 'olla', 'plancha', 'sin_cocinar'])

export function importedMethod(m: string | null | undefined): Method | null {
  return m && METHODS.has(m) ? (m as Method) : null
}

/** El alimento guardado que mejor encaja con el nombre de un ingrediente (por palabras clave); null si ninguno. */
export function matchFood(name: string, foods: Food[]): Food | null {
  const target = normalize(name)
  if (!target) return null
  const exact = foods.find((f) => normalize(f.name) === target)
  if (exact) return exact
  const words = new Set(keyWords(name))
  if (words.size === 0) return null
  let best: { f: Food; score: number } | null = null
  for (const f of foods) {
    const fw = keyWords(f.name)
    const shared = fw.filter((w) => words.has(w)).length
    if (shared === 0) continue
    // más palabras en común, menos palabras sobrantes en cualquiera de los dos y, a igualdad, el nombre más corto
    const score = shared * 10 - (fw.length - shared) - (words.size - shared) * 0.5 - f.name.length / 1000
    if (!best || score > best.score) best = { f, score }
  }
  return best?.f ?? null
}

const DIRECT: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 }

/** Gramos de un ingrediente: peso o volumen dado, medida casera del alimento, o la estimación del lector. null si no hay cantidad. */
export function gramsFor(ing: ImportedIngredient, food: Food): number | null {
  const q = ing.quantity
  const unit = ing.unit ?? ''
  if (unit === 'al_gusto' || unit === 'pizca') return null
  if (q != null && q > 0) {
    if (unit in DIRECT) return q * DIRECT[unit]
    if (food.unit_g) {
      const labels = [food.unit_label, food.unit_plural].filter(Boolean).map((l) => normalize(l as string))
      if (unit === 'unidad' || labels.includes(normalize(unit))) return q * food.unit_g
    }
  }
  return ing.grams != null && ing.grams > 0 ? ing.grams : null
}

export interface MappedIngredients {
  rows: MealRow[]
  /** ingredientes con cantidad que no están en tus alimentos (hay que añadirlos a mano) */
  unmatched: string[]
  /** "al gusto", pizcas o sin cantidad: no se incluyen */
  omitted: string[]
}

const describe = (i: ImportedIngredient) => (i.quantity != null && i.unit && i.unit !== 'al_gusto' ? `${i.name} (${i.quantity} ${i.unit})` : i.name)

/** Convierte los ingredientes leídos en líneas editables con tus alimentos. */
export function rowsFromImported(ingredients: ImportedIngredient[], foods: Food[]): MappedIngredients {
  const rows: MealRow[] = []
  const unmatched: string[] = []
  const omitted: string[] = []
  ingredients.forEach((ing, i) => {
    const noAmount = ing.unit === 'al_gusto' || ing.unit === 'pizca' || (ing.quantity == null && (ing.grams == null || ing.grams <= 0))
    if (noAmount) return void omitted.push(ing.name)
    const food = matchFood(ing.name, foods)
    if (!food) return void unmatched.push(describe(ing))
    const grams = gramsFor(ing, food)
    if (grams == null) return void unmatched.push(`${describe(ing)} · sin cantidad clara`)
    rows.push(rowFromGrams(food, grams, `imp-${i}-${food.id}`))
  })
  return { rows, unmatched, omitted }
}
