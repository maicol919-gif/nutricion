import type { Food, MealKey, RecipeItem } from '../types'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'comida', label: 'Almuerzo' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'cena', label: 'Cena' },
]

type PerHundred = Pick<Food, 'kcal' | 'protein' | 'carbs' | 'fat'>

/** Valores de un alimento (por 100 g) para una cantidad en gramos. */
export function foodMacros(f: PerHundred, grams: number): Macros {
  const k = grams / 100
  return { kcal: f.kcal * k, protein: f.protein * k, carbs: f.carbs * k, fat: f.fat * k }
}

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }
}

export function scaleMacros(m: Macros, k: number): Macros {
  return { kcal: m.kcal * k, protein: m.protein * k, carbs: m.carbs * k, fat: m.fat * k }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, ZERO)
}

/** Valores por ración de una receta (suma de ingredientes ÷ raciones). Ignora ingredientes sin alimento. */
export function recipeMacros(items: Pick<RecipeItem, 'food_id' | 'grams'>[], foods: Map<string, PerHundred>, servings: number): Macros {
  const total = sumMacros(
    items.flatMap((it) => {
      const f = foods.get(it.food_id)
      return f ? [foodMacros(f, it.grams)] : []
    }),
  )
  return scaleMacros(total, 1 / (servings || 1))
}

/** Kcal enteras y el resto con un decimal, para guardar y mostrar. */
export function roundMacros(m: Macros): Macros {
  const r1 = (n: number) => Math.round(n * 10) / 10
  return { kcal: Math.round(m.kcal), protein: r1(m.protein), carbs: r1(m.carbs), fat: r1(m.fat) }
}

/** "3 huevos", "7,5 cucharadas": gramos en medida casera (al medio más cercano). null si el alimento no tiene medida. */
export function householdLabel(f: Pick<Food, 'unit_g' | 'unit_label' | 'unit_plural'>, grams: number): string | null {
  if (!f.unit_g || !f.unit_label) return null
  const n = Math.round((grams / f.unit_g) * 2) / 2
  if (n < 0.5) return null
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
  return `${txt} ${n === 1 ? f.unit_label : (f.unit_plural ?? f.unit_label)}`
}

/** Momento del día sugerido según la hora (la clave interna "comida" se muestra como Almuerzo). */
export function mealForHour(hour: number): MealKey {
  if (hour < 11) return 'desayuno'
  if (hour < 16) return 'comida'
  if (hour < 19) return 'merienda'
  return 'cena'
}

export interface Remaining {
  kcal: number
  protein: number
}

/** Lo que falta para la meta (nunca negativo). */
export function remaining(target: { kcal: number; protein: number }, eaten: Macros): Remaining {
  return { kcal: Math.max(0, target.kcal - eaten.kcal), protein: Math.max(0, target.protein - eaten.protein) }
}

export type BarState = 'bajo' | 'ok' | 'pasado'

/** Calorías: dentro de ±5 % de la meta es "ok". */
export function kcalState(eaten: number, target: number): BarState {
  if (eaten > target * 1.05) return 'pasado'
  if (eaten >= target * 0.95) return 'ok'
  return 'bajo'
}

/** Proteína: desde el 95 % de la meta es "ok" (pasarse no es un problema). */
export function proteinState(eaten: number, target: number): BarState {
  return eaten >= target * 0.95 ? 'ok' : 'bajo'
}

export function formatServings(n: number): string {
  const txt = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',')
  return `${txt} ${n === 1 ? 'ración' : 'raciones'}`
}

export interface LabelValues {
  /** la etiqueta indica los valores por 100 g o por unidad (galleta, croissant, lata…) */
  basis: '100g' | 'unit'
  /** peso de la unidad en gramos (obligatorio si basis = 'unit') */
  unitGrams?: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** Pasa los valores de una etiqueta a "por 100 g", que es como se guardan los alimentos. null si no se puede. */
export function labelToPer100(l: LabelValues): Macros | null {
  if (![l.kcal, l.protein, l.carbs, l.fat].every((n) => Number.isFinite(n) && n >= 0)) return null
  if (l.basis === '100g') return { kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat }
  if (!l.unitGrams || !(l.unitGrams > 0)) return null
  const k = 100 / l.unitGrams
  return { kcal: l.kcal * k, protein: l.protein * k, carbs: l.carbs * k, fat: l.fat * k }
}
