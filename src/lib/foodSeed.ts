import { supabase } from './supabase'
import { SEED_FOODS, SEED_FOODS_V2, SEED_FOODS_V3, SEED_RECIPES } from '../data/foodSeed'

/** Versión de los alimentos iniciales: al subirla, los nuevos se añaden una sola vez. */
const SEED_VERSION = 3

let running: Promise<void> | null = null

async function run(): Promise<void> {
  const foodCount = await supabase.from('foods').select('id', { count: 'exact', head: true })
  if (foodCount.error) throw foodCount.error
  if (!foodCount.count) {
    const rows = SEED_FOODS.map((f) => ({
      name: f.name,
      kcal: f.kcal,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      unit_g: f.unit_g ?? null,
      unit_label: f.unit_label ?? null,
      unit_plural: f.unit_plural ?? null,
      estimated: f.estimated ?? false,
    }))
    const { error } = await supabase.from('foods').insert(rows)
    if (error) throw error
  }

  const recipeCount = await supabase.from('recipes').select('id', { count: 'exact', head: true })
  if (recipeCount.error) throw recipeCount.error
  if (!recipeCount.count) await seedRecipes()
  await topUpFoods()
}

/** Alimentos genéricos nuevos: se añaden una sola vez (sin repetir los que ya existen) y se anota la versión. */
async function topUpFoods(): Promise<void> {
  const st = await supabase.from('settings').select('food_seed_version').maybeSingle()
  if (st.error) throw st.error
  if (Number(st.data?.food_seed_version ?? 1) >= SEED_VERSION) return
  const have = await supabase.from('foods').select('name')
  if (have.error) throw have.error
  const names = new Set((have.data ?? []).map((f) => f.name as string))
  const rows = [...SEED_FOODS_V2, ...SEED_FOODS_V3].filter((f) => !names.has(f.name)).map((f) => ({
    name: f.name,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    unit_g: f.unit_g ?? null,
    unit_label: f.unit_label ?? null,
    unit_plural: f.unit_plural ?? null,
    estimated: f.estimated ?? false,
  }))
  if (rows.length) {
    const ins = await supabase.from('foods').insert(rows)
    if (ins.error) throw ins.error
  }
  const up = await supabase.from('settings').upsert({ food_seed_version: SEED_VERSION })
  if (up.error) throw up.error
}

async function seedRecipes(): Promise<void> {

  const foods = await supabase.from('foods').select('id,name')
  if (foods.error) throw foods.error
  const foodId = new Map((foods.data ?? []).map((f) => [f.name as string, f.id as string]))

  for (const r of SEED_RECIPES) {
    const missing = r.items.find(([name]) => !foodId.has(name))
    if (missing) throw new Error(`Falta el alimento "${missing[0]}" para la receta "${r.name}"`)
    const ins = await supabase
      .from('recipes')
      .insert({ name: r.name, minutes: r.minutes, meal: r.meal, tags: r.tags, steps: r.steps.join('\n'), servings: 1 })
      .select('id')
      .single()
    if (ins.error) throw ins.error
    const items = r.items.map(([name, grams], i) => ({ recipe_id: ins.data.id, food_id: foodId.get(name)!, grams, position: i }))
    const { error } = await supabase.from('recipe_items').insert(items)
    if (error) throw error
  }
}

/** Carga los alimentos y las recetas iniciales la primera vez (una sola ejecución a la vez). */
export function seedFoodIfEmpty(): Promise<void> {
  running ??= run().finally(() => {
    running = null
  })
  return running
}
