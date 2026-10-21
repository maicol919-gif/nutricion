import type { Food } from '../types'
import type { Have } from './compra'
import type { Left } from './whatToEat'
import { mealBudget } from './whatToEat'
import type { MealKey } from '../types'

export interface Part { food: Food; grams: number }
export interface Assembly {
  parts: Part[]
  kcal: number
  protein: number
  /** avisos sobre lo armado frente a lo que le toca a este momento */
  notes: string[]
}

type Role = 'proteina' | 'carbo' | 'verdura' | null

/** Alimentos que no sirven como base de una comida armada: dulces, grasas de cocina y mezclas de picoteo. */
const EXCLUDED = /az[uú]car|miel|chocolate|mermelada|\bmix\b|combinado|cocktail|gotas|condensada|aceite|mantequilla|sal\b|salsa|bacon|arroz con leche|pastel|tarta|flan|croissant|whey|prote[ií]na en polvo/i

/** Fiambres: sirven de acompañamiento en poca cantidad, no como la proteína principal. */
const FIAMBRE = /york|jam[oó]n|pavo|fiambre|chorizo|salchich|embutido|lomo/i
export const isFiambre = (f: Food) => FIAMBRE.test(f.name)

/** Hidratos de desayuno: no se mezclan con una comida o cena salada. */
const BREAKFAST_CARB = /avena|cereal|copos|muesli|granola/i

/** Fruta: no se usa como la verdura de una comida armada. */
const FRUIT = /mel[oó]n|pi[nñ]a|fresa|pl[aá]tano|manzana|naranja|sand[ií]a|uva|ar[aá]ndano|frutos rojos|fruta/i

/** Papel de un alimento en una comida, por sus valores por 100 g. */
export function roleOf(f: Food): Role {
  if (f.disabled || f.kcal <= 0 || EXCLUDED.test(f.name) || FRUIT.test(f.name)) return null
  const perKcal = f.protein / f.kcal
  if (f.kcal <= 50 && f.carbs <= 10) return 'verdura'
  if (f.protein >= 10 && perKcal >= 0.08 && f.fat < 25) return 'proteina'
  if (f.carbs >= 15 && perKcal < 0.08 && f.fat < 15) return 'carbo'
  return null
}

const isEgg = (f: Food) => /huevo/i.test(f.name) && !/clara/i.test(f.name)
const EGG_G = 55

/** Tope razonable por alimento en una comida (y lo que quede en casa si lleva cantidad). */
function cap(f: Food, role: Role, avail: number | null): number {
  const natural = isEgg(f) ? 2 * EGG_G : isFiambre(f) ? 60 : role === 'proteina' ? 250 : role === 'carbo' ? (f.kcal > 250 ? 100 : 250) : 200
  return avail == null ? natural : Math.min(natural, avail)
}

function round(f: Food, g: number): number {
  if (isEgg(f)) return Math.max(EGG_G, Math.round(g / EGG_G) * EGG_G)
  return Math.max(10, Math.round(g / 5) * 5)
}

const kcalOf = (p: Part) => (p.food.kcal * p.grams) / 100
const protOf = (p: Part) => (p.food.protein * p.grams) / 100

/**
 * Arma comidas con lo que hay en casa, ajustadas a lo que le toca a este momento: una proteína, una verdura y un hidrato,
 * con cantidades que acercan las calorías y la proteína al presupuesto. Devuelve hasta 3 opciones con proteínas distintas.
 */
export function assemble(meal: MealKey, left: Left, have: Have, foodById: Map<string, Food>, pending?: MealKey[]): Assembly[] {
  const budget = mealBudget(meal, left, pending)
  if (budget.kcal < 80) return []
  const pool: { food: Food; role: Role; avail: number | null }[] = []
  for (const [id, avail] of have) {
    const food = foodById.get(id)
    if (!food) continue
    const role = roleOf(food)
    if (role && (avail === null || avail >= 30)) pool.push({ food, role, avail })
  }
  const breakfast = meal === 'desayuno' || meal === 'merienda'
  const byProtein = (a: { food: Food }, b: { food: Food }) => b.food.protein / b.food.kcal - a.food.protein / a.food.kcal
  const mains = pool.filter((p) => p.role === 'proteina' && !isFiambre(p.food)).sort(byProtein)
  const cold = pool.filter((p) => p.role === 'proteina' && isFiambre(p.food)).sort(byProtein)
  // los fiambres solo hacen de proteína principal si no hay otra cosa, y en poca cantidad
  const proteins = mains.length > 0 ? mains : cold
  const carbs = pool
    .filter((p) => p.role === 'carbo' && (breakfast ? BREAKFAST_CARB.test(p.food.name) || /^pan\b|tortilla/i.test(p.food.name) : !BREAKFAST_CARB.test(p.food.name)))
    .sort((a, b) => a.food.name.localeCompare(b.food.name, 'es'))
  const veg = breakfast ? undefined : pool.filter((p) => p.role === 'verdura').sort((a, b) => a.food.kcal - b.food.kcal)[0]
  if (proteins.length === 0 && carbs.length === 0) return []

  const out: Assembly[] = []
  const seen = new Set<string>()
  const primaries = proteins.length > 0 ? proteins.slice(0, 3) : [null]
  primaries.forEach((main, i) => {
    const parts: Part[] = []
    if (main) {
      const g = Math.min(cap(main.food, 'proteina', main.avail), (budget.protein * 0.9) / (main.food.protein / 100))
      parts.push({ food: main.food, grams: round(main.food, Math.max(g, 40)) })
    }
    if (veg) parts.push({ food: veg.food, grams: round(veg.food, Math.min(150, cap(veg.food, 'verdura', veg.avail))) })
    // si la proteína no llega al 80 %, se suma una segunda
    const protSoFar = () => parts.reduce((s, p) => s + protOf(p), 0)
    if (protSoFar() < budget.protein * 0.8) {
      const second = [...mains, ...cold].find((p) => !parts.some((x) => x.food.id === p.food.id))
      if (second) {
        const need = budget.protein - protSoFar()
        const g = Math.min(cap(second.food, 'proteina', second.avail), need / (second.food.protein / 100))
        parts.push({ food: second.food, grams: round(second.food, Math.max(g, 30)) })
      }
    }
    // el hidrato rellena las calorías que faltan, rotando entre los disponibles
    const carb = carbs.length > 0 ? carbs[i % carbs.length] : undefined
    if (carb) {
      const used = parts.reduce((s, p) => s + kcalOf(p), 0)
      const room = budget.kcal - used
      if (room > 60) parts.push({ food: carb.food, grams: round(carb.food, Math.min(cap(carb.food, 'carbo', carb.avail), (room / carb.food.kcal) * 100)) })
    }
    if (parts.length === 0) return
    const kcal = Math.round(parts.reduce((s, p) => s + kcalOf(p), 0))
    const protein = Math.round(protSoFar())
    const notes: string[] = []
    if (kcal > budget.kcal * 1.2) notes.push('Pasa de las calorías que te tocan ahora')
    if (protein < budget.protein * 0.8) notes.push(`Te faltarían ≈ ${Math.round(budget.protein - protein)} g de proteína para este momento`)
    const key = parts.map((p) => p.food.id).sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    out.push({ parts, kcal, protein, notes })
  })
  return out
}
