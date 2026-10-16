import type { Method, Recipe } from '../types'
import { keyWords } from './foods'

export const METHODS: { key: Method; label: string }[] = [
  { key: 'horno', label: 'Horno' },
  { key: 'sarten', label: 'Sartén / frito' },
  { key: 'microondas', label: 'Microondas' },
  { key: 'olla', label: 'Olla / hervido' },
  { key: 'plancha', label: 'Plancha' },
  { key: 'sin_cocinar', label: 'Sin cocinar' },
]

export function methodLabel(m: Method | null | undefined): string {
  return METHODS.find((x) => x.key === m)?.label ?? ''
}

/**
 * Peso de lo preparado respecto a la suma de sus ingredientes crudos, solo donde hay base:
 * al hornear un bizcocho la masa pierde en torno a un 10 % de su peso (agua), y en microondas la pérdida es más variable.
 * En fritos, hervidos o plancha el peso cambia mucho (aceite absorbido, agua ganada o perdida): no se estima.
 */
export function weightFactor(m: Method | null | undefined): number | null {
  if (m === 'horno') return 0.9
  if (m === 'microondas') return 0.85
  if (m === 'sin_cocinar') return 1
  return null
}

export function ingredientsWeight(items: { grams: number }[]): number {
  return items.reduce((s, i) => s + i.grams, 0)
}

export interface TotalWeight {
  grams: number
  /** true si no se pesó y se calculó a partir de los ingredientes */
  estimated: boolean
}

/** Peso total de lo preparado: el pesado si existe; si no, una estimación cuando el método lo permite; si no, null. */
export function totalWeight(recipe: Pick<Recipe, 'final_weight_g' | 'method'>, items: { grams: number }[]): TotalWeight | null {
  if (recipe.final_weight_g && recipe.final_weight_g > 0) return { grams: recipe.final_weight_g, estimated: false }
  const factor = weightFactor(recipe.method)
  const sum = ingredientsWeight(items)
  if (factor == null || !(sum > 0)) return null
  return { grams: sum * factor, estimated: true }
}

export interface ServingsFromWeight {
  servings: number
  total: TotalWeight
}

/** Raciones equivalentes a un peso comido. null si no se conoce ni se puede estimar el peso total. */
export function servingsForWeight(eatenGrams: number, recipe: Pick<Recipe, 'final_weight_g' | 'method' | 'servings'>, items: { grams: number }[]): ServingsFromWeight | null {
  if (!(eatenGrams > 0)) return null
  const total = totalWeight(recipe, items)
  if (!total) return null
  return { servings: (eatenGrams / total.grams) * recipe.servings, total }
}

/** Recetas ya guardadas con una palabra clave en común con el nombre (para avisar antes de crear una casi igual). */
export function similarRecipes(name: string, recipes: Recipe[], excludeId?: string, max = 5): Recipe[] {
  const words = new Set(keyWords(name))
  if (words.size === 0) return []
  return recipes
    .filter((r) => r.id !== excludeId)
    .map((r) => ({ r, shared: keyWords(r.name).filter((w) => words.has(w)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.r.name.localeCompare(b.r.name))
    .slice(0, max)
    .map((x) => x.r)
}
