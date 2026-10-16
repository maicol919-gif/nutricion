import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { SEED_FOODS } from '../../data/foodSeed'
import type { FoodData } from '../../lib/useFoodData'
import type { Food, MealEntry, Recipe, RecipeItem } from '../../types'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const { default: RecipeEditor } = await import('./RecipeEditor')
const { default: AddMeal } = await import('./AddMeal')

const foods: Food[] = SEED_FOODS.map((f, i) => ({ id: `f${i}`, name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, unit_g: f.unit_g ?? null, unit_label: f.unit_label ?? null, unit_plural: f.unit_plural ?? null, estimated: f.estimated ?? false, disabled: false }))
const huevo = foods.find((f) => f.name === 'Huevo entero')!

// pastel de 8 raciones con 8 huevos en total: cada ración lleva 1 huevo
const pastel: Recipe = { id: 'r1', name: 'Pastel de banano', minutes: 50, meal: 'cualquiera', steps: '', tags: ['mía'], servings: 8, final_weight_g: 800, method: 'horno' }
const items: RecipeItem[] = [{ id: 'i1', recipe_id: 'r1', food_id: huevo.id, grams: 440, position: 0 }]
const data: FoodData = {
  foods,
  activeFoods: foods,
  recipes: [pastel],
  items,
  foodById: new Map(foods.map((f) => [f.id, f])),
  itemsByRecipe: new Map([['r1', items]]),
  reload: async () => {},
}

describe('RecipeEditor (render)', () => {
  it('muestra los campos de nombre, raciones y el aviso de ingredientes', () => {
    const html = renderToString(<RecipeEditor data={data} onSaved={() => {}} onClose={() => {}} />)
    expect(html).toContain('Nueva receta')
    expect(html).toContain('Raciones que salen')
    expect(html).toContain('Aún no hay ingredientes')
    expect(html).toContain('Guardar receta')
  })
})

describe('receta con varias raciones al registrar', () => {
  it('cada ración lleva la parte proporcional de los ingredientes', () => {
    const html = renderToString(
      <AddMeal date="2026-10-19" data={data} recents={[] as MealEntry[]} defaultMeal="cena" presetRecipeId="r1" editEntry={null} onSaved={() => {}} onClose={() => {}} />,
    )
    expect(html).toContain('Pastel de banano')
    expect(html).toContain('value="1"') // 440 g ÷ 8 raciones = 55 g = 1 huevo
    expect(html).toContain('<strong>79<!-- --> kcal</strong>') // 1 huevo (55 g) = 143 kcal/100 g x 0,55
    expect(html).not.toContain('⅛') // con 8 raciones se usan raciones, no fracciones
    expect(html).toContain('Raciones (reescala todo lo que comiste)')
  })
})

describe('RecipeEditor: editar y duplicar', () => {
  it('editar carga nombre, raciones, método y peso total, y ofrece guardar cambios o como nueva', () => {
    const html = renderToString(<RecipeEditor data={data} recipe={pastel} onSaved={() => {}} onClose={() => {}} />)
    expect(html).toContain('Editar receta')
    expect(html).toContain('value="Pastel de banano"')
    expect(html).toContain('Guardar cambios')
    expect(html).toContain('Guardar como receta nueva')
    expect(html).toContain('value="800"')
    expect(html).toContain('Horno')
  })

  it('duplicar propone otro nombre y avisa de la receta parecida', () => {
    const html = renderToString(<RecipeEditor data={data} recipe={pastel} copy onSaved={() => {}} onClose={() => {}} />)
    expect(html).toContain('Duplicar receta')
    expect(html).toContain('Pastel de banano (variante)')
    expect(html).toContain('una receta parecida')
    expect(html).toContain('Parecidas:')
    expect(html).toContain('Guardar receta')
  })
})
