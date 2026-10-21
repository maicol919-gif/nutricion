import type { Food, MealKey, Recipe } from '../types'
import type { Have } from './compra'
import { recipeMacros } from './nutrition'

/** Cuánto del día suele tocar a cada momento (reparto orientativo). */
export const MEAL_WEIGHT: Record<MealKey, number> = { desayuno: 0.25, comida: 0.35, cena: 0.3, merienda: 0.1 }
const MAIN: MealKey[] = ['desayuno', 'comida', 'cena']

export interface Left { kcal: number; protein: number }

/** Tope por comida: más de esto de golpe no ayuda (≈ 0,6 g de proteína por kg y la regla de "mucha caloría de golpe"). */
export const MAX_MEAL: Left = { kcal: 800, protein: 45 }

/** Lo que le toca a una comida principal: lo que falta del día, repartido entre ella, las que quedan después y los extras; con tope. */
function mainShare(meal: MealKey, left: Left, pending: MealKey[]): Left {
  const later = pending.filter((m) => MAIN.indexOf(m) > MAIN.indexOf(meal))
  const den = MEAL_WEIGHT[meal] + later.reduce((s, m) => s + MEAL_WEIGHT[m], 0) + MEAL_WEIGHT.merienda
  const share = MEAL_WEIGHT[meal] / den
  return { kcal: Math.min(MAX_MEAL.kcal, left.kcal * share), protein: Math.min(MAX_MEAL.protein, left.protein * share) }
}

/**
 * Lo que le toca a este momento. `pending` son las comidas principales que aún no has registrado hoy (por defecto, todas desde
 * este momento). Para los extras es lo que sobra después de las comidas que te quedan por hacer.
 */
export function mealBudget(meal: MealKey, left: Left, pending: MealKey[] = MAIN): Left {
  if (meal !== 'merienda') return mainShare(meal, left, pending)
  let rest = { ...left }
  for (const m of MAIN.filter((x) => pending.includes(x))) {
    const s = mainShare(m, rest, pending.filter((x) => MAIN.indexOf(x) >= MAIN.indexOf(m)))
    rest = { kcal: Math.max(0, rest.kcal - s.kcal), protein: Math.max(0, rest.protein - s.protein) }
  }
  return rest
}

export interface Candidate {
  recipe: Recipe
  kcal: number
  protein: number
  /** avisos sobre la receta para este momento */
  notes: string[]
  /** menor es mejor */
  score: number
}

/** ¿Hay en casa lo necesario para una ración? Con cantidad, que alcance; sin cantidad, que haya. */
export function cookable(recipe: Recipe, items: { food_id: string; grams: number }[], have: Have): boolean {
  if (items.length === 0) return false
  return items.every((it) => {
    const avail = have.get(it.food_id)
    return avail === null || (avail !== undefined && avail >= it.grams / (recipe.servings || 1))
  })
}

const MAIN_MIN_PROTEIN = 25
const HEAVY_KCAL = 800

/**
 * Recetas que puedes hacer ya con lo que hay en casa, ordenadas por lo bien que encajan con lo que le toca a este momento.
 * El desayuno solo propone recetas de desayuno (o "cualquiera"); la comida y la cena, las de comida, cena o "cualquiera".
 */
export function rankRecipes(
  meal: MealKey,
  left: Left,
  recipes: Recipe[],
  itemsByRecipe: Map<string, { food_id: string; grams: number }[]>,
  foodById: Map<string, Food>,
  have: Have,
  pending?: MealKey[],
): Candidate[] {
  const budget = mealBudget(meal, left, pending)
  const ok = (r: Recipe) => {
    if (r.meal === 'cualquiera') return true
    if (meal === 'desayuno' || meal === 'merienda') return r.meal === meal || (meal === 'merienda' && r.meal === 'desayuno')
    return r.meal === 'comida' || r.meal === 'cena'
  }
  const out: Candidate[] = []
  for (const recipe of recipes) {
    if (!ok(recipe)) continue
    const items = itemsByRecipe.get(recipe.id) ?? []
    if (!cookable(recipe, items, have)) continue
    const m = recipeMacros(items, foodById, recipe.servings)
    const notes: string[] = []
    if (budget.kcal > 0 && m.kcal > budget.kcal * 1.25) notes.push('Más calorías de las que te tocan ahora')
    if (m.kcal >= HEAVY_KCAL) notes.push('Mucha caloría de golpe')
    if ((meal === 'comida' || meal === 'cena') && m.protein < MAIN_MIN_PROTEIN) notes.push('Poca proteína para una comida principal')
    else if (budget.protein > 0 && m.protein < budget.protein * 0.6) notes.push('Aporta menos proteína de la que te falta')
    const kcalGap = budget.kcal > 0 ? Math.abs(m.kcal - budget.kcal) / budget.kcal : 0
    const protGap = budget.protein > 0 ? Math.max(0, budget.protein - m.protein) / budget.protein : 0
    out.push({ recipe, kcal: Math.round(m.kcal), protein: Math.round(m.protein), notes, score: kcalGap + protGap + notes.length * 0.2 })
  }
  return out.sort((a, b) => a.score - b.score || a.recipe.name.localeCompare(b.recipe.name, 'es'))
}
