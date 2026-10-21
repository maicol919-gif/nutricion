import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MEALS, mealForHour } from '../../lib/nutrition'
import { rankRecipes, mealBudget, type Left } from '../../lib/whatToEat'
import { assemble } from '../../lib/assemble'
import type { Have } from '../../lib/compra'
import type { FoodData } from '../../lib/useFoodData'
import type { MealKey } from '../../types'

/**
 * "¿Qué como ahora?": las recetas que puedes hacer con lo que hay en casa, ordenadas por lo que encajan con lo que te falta
 * del día en este momento.
 */
export default function WhatToEat({ data, left, onRegister, onRegisterItems }: { data: FoodData; left: Left; onRegister: (recipeId: string, meal: MealKey) => void; onRegisterItems: (items: { food_id: string; grams: number }[], meal: MealKey) => void }) {
  const [open, setOpen] = useState(false)
  const [meal, setMeal] = useState<MealKey>(() => mealForHour(new Date().getHours()))
  const [have, setHave] = useState<Have | null>(null)

  useEffect(() => {
    if (!open) return
    void supabase.from('fridge_items').select('food_id, grams, low').not('food_id', 'is', null).then(({ data: rows }) => {
      const m: Have = new Map()
      for (const r of rows ?? []) {
        const id = r.food_id as string
        const g = r.grams == null ? null : Number(r.grams)
        if (g === null && r.low) continue
        const prev = m.get(id)
        m.set(id, prev === undefined ? g : prev === null || g === null ? null : prev + g)
      }
      setHave(m)
    })
  }, [open])

  const budget = useMemo(() => mealBudget(meal, left), [meal, left])
  const ranked = useMemo(() => (have ? rankRecipes(meal, left, data.recipes, data.itemsByRecipe, data.foodById, have) : []), [have, meal, left, data])
  const built = useMemo(() => (have ? assemble(meal, left, have, data.foodById) : []), [have, meal, left, data])

  if (!open) return <button onClick={() => setOpen(true)}>¿Qué como ahora?</button>

  return (
    <section className="card">
      <div className="row between">
        <h3>¿Qué como ahora?</h3>
        <button className="link" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
      <div className="subtabs">
        {MEALS.map((m) => (
          <button key={m.key} className={meal === m.key ? 'active' : ''} onClick={() => setMeal(m.key)}>{m.label}</button>
        ))}
      </div>
      <p className="muted">Te faltan {Math.round(left.kcal)} kcal y {Math.round(left.protein)} g de proteína en el día; para este momento, unas {Math.round(budget.kcal)} kcal y {Math.round(budget.protein)} g.</p>
      {!have && <p className="muted">Mirando lo que hay en casa…</p>}
      {have && ranked.length === 0 && built.length === 0 && <p className="muted">Con lo que hay en casa no puedo armar nada para este momento. Dime qué tienes en el chat y lo armamos, o mira Compra.</p>}
      {ranked.length > 0 && <h4>Recetas</h4>}
      {ranked.slice(0, 5).map((c) => (
        <div key={c.recipe.id} className="entry">
          <div>
            <strong>{c.recipe.name}</strong>
            <small className="muted">{c.kcal} kcal · {c.protein} g de proteína{c.recipe.servings > 1 ? ' por ración' : ''}</small>
            {c.notes.map((n) => <small key={n} className="warn-text">{n}</small>)}
          </div>
          <button className="link" onClick={() => { setOpen(false); onRegister(c.recipe.id, meal) }}>Registrar</button>
        </div>
      ))}
      {built.length > 0 && (
        <>
          <h4>Armado con lo que tienes</h4>
          <p className="muted">No son recetas: son alimentos de casa con cantidades que se acercan a lo que te toca.</p>
          {built.map((a, i) => (
            <div key={i} className="entry">
              <div>
                <strong>{a.parts.map((p) => p.food.name.replace(/\s*\(.*\)/, '')).join(' + ')}</strong>
                <small className="muted">{a.parts.map((p) => `${p.food.name.replace(/\s*\(.*\)/, '')} ${Math.round(p.grams)} g`).join(' · ')}</small>
                <small className="muted">{a.kcal} kcal · {a.protein} g de proteína</small>
                {a.notes.map((n) => <small key={n} className="warn-text">{n}</small>)}
              </div>
              <button className="link" onClick={() => { setOpen(false); onRegisterItems(a.parts.map((p) => ({ food_id: p.food.id, grams: p.grams })), meal) }}>Registrar</button>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
