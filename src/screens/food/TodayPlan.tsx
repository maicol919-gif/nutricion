import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MEALS } from '../../lib/nutrition'
import type { PlanRow } from '../../lib/plan'
import type { FoodData } from '../../lib/useFoodData'
import type { MealKey } from '../../types'

/** "Hoy toca": lo planificado para el día, con un botón para registrarlo. */
export default function TodayPlan({ date, data, onRegister }: { date: string; data: FoodData; onRegister: (recipeId: string | null, meal: MealKey) => void }) {
  const [rows, setRows] = useState<PlanRow[]>([])

  useEffect(() => {
    void supabase.from('meal_plan').select('*').eq('date', date).then(({ data: r }) => {
      setRows((r ?? []).map((x) => ({ ...x, servings: Number(x.servings) })) as PlanRow[])
    })
  }, [date])

  if (rows.length === 0) return null
  const ordered = [...rows].sort((a, b) => MEALS.findIndex((m) => m.key === a.meal) - MEALS.findIndex((m) => m.key === b.meal))

  return (
    <section className="card">
      <h3>Hoy toca</h3>
      {ordered.map((r) => {
        const recipe = data.recipes.find((x) => x.id === r.recipe_id)
        return (
          <div key={r.id} className="entry">
            <div>
              <strong>{MEALS.find((m) => m.key === r.meal)?.label}</strong>
              <small className="muted">{recipe?.name ?? r.label ?? 'Libre'}{r.servings !== 1 ? ` ×${r.servings}` : ''}{r.note ? ` · ${r.note}` : ''}</small>
            </div>
            {recipe && <button className="link" onClick={() => onRegister(recipe.id, r.meal)}>Registrar</button>}
          </div>
        )
      })}
    </section>
  )
}
