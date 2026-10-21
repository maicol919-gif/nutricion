import type { Food, Recipe } from '../types'
import type { Zone } from './shopping'
import { zoneOf } from './shopping'

export type Trip = 'fresca' | 'grande'

/** Los dos viajes: fresco cada 8 días (carne, pescado, lácteos, fruta, verdura, pan) y compra grande cada 15 días (todo). */
export const TRIPS: Record<Trip, { label: string; days: number; zones: Zone[] | 'todas' }> = {
  fresca: { label: 'Fresca (8 días)', days: 8, zones: ['Fruta y verdura', 'Pan y masas', 'Nevera'] },
  grande: { label: 'Grande (15 días)', days: 15, zones: 'todas' },
}

export interface LoggedMeal { date: string; items: { food_id: string; grams: number }[] | null }

/** Lo disponible en casa por alimento: gramos que quedan, o null si no se lleva cantidad y hay (no queda poco). */
export type Have = Map<string, number | null>

const DAY_MS = 86400000
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / DAY_MS)

/**
 * Gramos por día que se consumen de cada alimento, según las comidas registradas en los últimos `maxDays` días.
 * El periodo mínimo es una semana, para no inflar el consumo con pocos días de historial.
 */
export function dailyUse(meals: LoggedMeal[], today: string, maxDays = 28): Map<string, number> {
  const recent = meals.filter((m) => m.items && m.items.length > 0 && daysBetween(m.date, today) < maxDays && daysBetween(m.date, today) >= 0)
  if (recent.length === 0) return new Map()
  const first = recent.reduce((min, m) => (m.date < min ? m.date : min), recent[0].date)
  const span = Math.max(7, Math.min(maxDays, daysBetween(first, today) + 1))
  const total = new Map<string, number>()
  for (const m of recent) for (const it of m.items ?? []) total.set(it.food_id, (total.get(it.food_id) ?? 0) + Number(it.grams))
  return new Map([...total.entries()].map(([id, g]) => [id, g / span]))
}

export interface Suggestion { food: Food; grams: number }

const roundUp = (g: number) => (g > 300 ? Math.ceil(g / 50) * 50 : Math.ceil(g / 10) * 10)

/** Qué comprar en este viaje: lo que se consume en esos días, menos lo que hay en casa. */
export function suggestions(trip: Trip, use: Map<string, number>, have: Have, foodById: Map<string, Food>): Suggestion[] {
  const { days, zones } = TRIPS[trip]
  const out: Suggestion[] = []
  for (const [id, perDay] of use) {
    const food = foodById.get(id)
    if (!food || food.disabled) continue
    if (zones !== 'todas' && !zones.includes(zoneOf(food.name))) continue
    const need = perDay * days
    const avail = have.get(id)
    if (avail === null) continue // hay y no se lleva cantidad: se da por suficiente
    const buy = need - (avail ?? 0)
    if (buy >= 20) out.push({ food, grams: roundUp(buy) })
  }
  return out.sort((a, b) => a.food.name.localeCompare(b.food.name, 'es'))
}

export type Status = 'verde' | 'amarillo' | 'gris'
export interface Coverage { recipe: Recipe; missing: Food[]; status: Status }

/**
 * Qué recetas cubres con lo que hay en casa y lo que llevas en el carro: verde (todo), amarillo (falta 1 o 2 alimentos)
 * o gris (faltan varios).
 */
export function recipeCoverage(
  recipes: Recipe[],
  itemsByRecipe: Map<string, { food_id: string; grams: number }[]>,
  foodById: Map<string, Food>,
  have: Have,
  cart: Set<string>,
): Coverage[] {
  const out: Coverage[] = []
  for (const recipe of recipes) {
    const missing: Food[] = []
    for (const it of itemsByRecipe.get(recipe.id) ?? []) {
      const food = foodById.get(it.food_id)
      if (!food) continue
      const avail = have.get(it.food_id)
      const covered = cart.has(it.food_id) || avail === null || (avail !== undefined && avail >= it.grams)
      if (!covered && !missing.some((m) => m.id === food.id)) missing.push(food)
    }
    out.push({ recipe, missing, status: missing.length === 0 ? 'verde' : missing.length <= 2 ? 'amarillo' : 'gris' })
  }
  const rank: Record<Status, number> = { verde: 0, amarillo: 1, gris: 2 }
  return out.sort((a, b) => rank[a.status] - rank[b.status] || a.missing.length - b.missing.length || a.recipe.name.localeCompare(b.recipe.name, 'es'))
}
