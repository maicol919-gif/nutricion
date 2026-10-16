export interface Food {
  id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  unit_g: number | null
  unit_label: string | null
  unit_plural: string | null
  /** valor aproximado (genérico, sin etiqueta o dependiente de la marca) */
  estimated: boolean
}

export type MealKey = 'desayuno' | 'comida' | 'merienda' | 'cena'

export interface Recipe {
  id: string
  name: string
  minutes: number
  meal: MealKey | 'cualquiera'
  steps: string
  tags: string[]
  servings: number
}

export interface RecipeItem {
  id: string
  recipe_id: string
  food_id: string
  grams: number
  position: number
}

export interface MealEntry {
  id: string
  date: string
  meal: MealKey
  recipe_id: string | null
  food_id: string | null
  label: string
  servings: number | null
  grams: number | null
  kcal: number
  protein: number
  carbs: number
  fat: number
  note: string | null
  items: { food_id: string; name: string; grams: number }[] | null
  photo_path: string | null
  /** kcal de esta comida que vienen de valores estimados */
  kcal_estimated: number
  status: 'done' | 'pending'
  created_at: string
}
