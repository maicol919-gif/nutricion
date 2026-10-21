import type { Food, MealKey } from '../types'
import type { Have } from './compra'
import { recipeMacros } from './nutrition'
import { mealBudget, type Left } from './whatToEat'

export interface Item { food_id: string; grams: number }

/** Una comida que registraste (con sus alimentos y gramos). */
export interface PastMeal {
  date: string
  meal: MealKey
  label: string
  recipe_id: string | null
  items: Item[] | null
}

/** Un plato que ya comes: la última vez que lo registraste. */
export interface Habit {
  key: string
  label: string
  meal: MealKey
  lastDate: string
  recipe_id: string | null
  items: Item[]
}

/** Identifica un plato para guardar si te gusta: la receta, o el conjunto de alimentos. */
export function dishKey(recipeId: string | null, items: Item[]): string {
  return recipeId ? `recipe:${recipeId}` : `foods:${[...new Set(items.map((i) => i.food_id))].sort().join('|')}`
}

/** Platos distintos de tu historial; si se repite, se queda con la última vez. */
export function habitsFrom(meals: PastMeal[]): Habit[] {
  const byKey = new Map<string, Habit>()
  for (const m of meals) {
    if (!m.items || m.items.length === 0) continue
    const items = m.items.map((i) => ({ food_id: i.food_id, grams: Number(i.grams) }))
    const key = dishKey(m.recipe_id, items)
    const prev = byKey.get(key)
    if (!prev || m.date >= prev.lastDate) byKey.set(key, { key, label: m.label, meal: m.meal, lastDate: m.date, recipe_id: m.recipe_id, items })
  }
  return [...byKey.values()]
}

/** ¿Sirve un plato de otro momento? Desayuno con desayuno; comida y cena entre sí; extras con extras o desayuno. */
function fitsMoment(habit: MealKey, now: MealKey): boolean {
  if (now === 'desayuno') return habit === 'desayuno'
  if (now === 'merienda') return habit === 'merienda' || habit === 'desayuno'
  return habit === 'comida' || habit === 'cena'
}

export interface HabitSuggestion {
  habit: Habit
  /** cuánto de lo que comiste la última vez (1 = igual) */
  k: number
  parts: { food: Food; grams: number }[]
  kcal: number
  protein: number
  notes: string[]
  score: number
}

const daysAgo = (date: string, today: string) => Math.round((new Date(today + 'T00:00:00').getTime() - new Date(date + 'T00:00:00').getTime()) / 86400000)

/**
 * Tus platos de siempre, ajustados: los que ya comiste en un momento parecido, que puedes repetir con lo que hay en casa,
 * en la cantidad que más se acerca a lo que te toca (entre la mitad y una vez y media de lo de la última vez).
 * Los que marcaste "no me apetece" no salen; los que te gustan suben.
 */
export function suggestHabits(
  meal: MealKey,
  left: Left,
  habits: Habit[],
  have: Have,
  foodById: Map<string, Food>,
  feedback: Map<string, boolean>,
  today: string,
): HabitSuggestion[] {
  const budget = mealBudget(meal, left)
  const out: HabitSuggestion[] = []
  for (const h of habits) {
    if (!fitsMoment(h.meal, meal) || feedback.get(h.key) === false) continue
    // todo lo que lleva tiene que estar en casa
    if (!h.items.every((i) => foodById.has(i.food_id) && have.has(i.food_id))) continue
    const base = recipeMacros(h.items, foodById, 1)
    if (base.kcal < (meal === 'merienda' ? 60 : meal === 'desayuno' ? 150 : 250)) continue
    // lo máximo que se puede repetir con lo que queda en casa
    let kMax = 1.5
    for (const i of h.items) {
      const avail = have.get(i.food_id)
      if (avail !== null && avail !== undefined) kMax = Math.min(kMax, avail / i.grams)
    }
    const kWant = budget.kcal > 0 ? budget.kcal / base.kcal : 1
    const k = Math.round(Math.max(0.5, Math.min(kWant, kMax, 1.5)) * 20) / 20
    if (kMax < 0.5) continue
    const parts = h.items.map((i) => ({ food: foodById.get(i.food_id)!, grams: Math.max(5, Math.round((i.grams * k) / 5) * 5) }))
    const m = recipeMacros(parts.map((p) => ({ food_id: p.food.id, grams: p.grams })), foodById, 1)
    const notes: string[] = []
    if (budget.kcal > 0 && m.kcal > budget.kcal * 1.25) notes.push('Más calorías de las que te tocan ahora')
    if ((meal === 'comida' || meal === 'cena') && m.protein < 25) notes.push('Poca proteína para una comida principal')
    else if (budget.protein > 0 && m.protein < budget.protein * 0.6) notes.push('Aporta menos proteína de la que te falta')
    const kcalGap = budget.kcal > 0 ? Math.abs(m.kcal - budget.kcal) / budget.kcal : 0
    const protGap = budget.protein > 0 ? Math.max(0, budget.protein - m.protein) / budget.protein : 0
    const recent = daysAgo(h.lastDate, today) <= 1 ? 0.3 : 0
    const liked = feedback.get(h.key) === true ? -0.3 : 0
    out.push({ habit: h, k, parts, kcal: Math.round(m.kcal), protein: Math.round(m.protein), notes, score: kcalGap + protGap + notes.length * 0.2 + recent + liked })
  }
  return out.sort((a, b) => a.score - b.score || a.habit.label.localeCompare(b.habit.label, 'es'))
}
