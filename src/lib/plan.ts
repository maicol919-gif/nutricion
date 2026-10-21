import type { MealKey } from '../types'

/** Una comida planificada: una receta (o un texto libre) en un día y momento. */
export interface PlanRow {
  id: string
  date: string
  meal: MealKey
  recipe_id: string | null
  label: string | null
  /** veces la receta (ej. 2 cuartos de pizza: 0,5 de una receta de 1 ración) */
  servings: number
  note: string | null
}

export const PLAN_MEALS: MealKey[] = ['desayuno', 'comida', 'merienda', 'cena']

/** Suma días a una fecha ISO (YYYY-MM-DD). */
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Filas del plan dentro de una ventana de `days` días que empieza en `from`, ordenadas por día y momento. */
export function planWindow(rows: PlanRow[], from: string, days: number): PlanRow[] {
  const last = addDays(from, days - 1)
  return rows
    .filter((r) => r.date >= from && r.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date) || PLAN_MEALS.indexOf(a.meal) - PLAN_MEALS.indexOf(b.meal))
}

/** Reglas de variedad: cuántas veces aparece cada receta en el plan. Devuelve las que superan el máximo. */
export function repeatedRecipes(rows: PlanRow[], max = 2): { recipe_id: string; times: number }[] {
  const count = new Map<string, number>()
  for (const r of rows) if (r.recipe_id) count.set(r.recipe_id, (count.get(r.recipe_id) ?? 0) + 1)
  return [...count.entries()].filter(([, n]) => n > max).map(([recipe_id, times]) => ({ recipe_id, times }))
}
