import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/date'
import { MEALS, mealForHour } from '../../lib/nutrition'
import { rankRecipes, mealBudget, type Left } from '../../lib/whatToEat'
import { assemble } from '../../lib/assemble'
import { dishKey, habitsFrom, suggestHabits, type PastMeal } from '../../lib/habits'
import type { Have } from '../../lib/compra'
import type { FoodData } from '../../lib/useFoodData'
import type { MealKey } from '../../types'

interface Props {
  data: FoodData
  left: Left
  /** comidas principales que aún no has registrado hoy */
  pending: MealKey[]
  onRegister: (recipeId: string, meal: MealKey) => void
  onRegisterItems: (items: { food_id: string; grams: number }[], meal: MealKey, label?: string) => void
}

const short = (name: string) => name.replace(/\s*\(.*\)/, '')

/**
 * "¿Qué como ahora?": tus platos de siempre, tus recetas y comidas armadas con lo que hay en casa, ajustados a lo que te falta
 * del día en este momento. Cada propuesta se puede marcar con "Me gusta" o "No me apetece".
 */
export default function WhatToEat({ data, left, pending, onRegister, onRegisterItems }: Props) {
  const [open, setOpen] = useState(false)
  const [meal, setMeal] = useState<MealKey>(() => mealForHour(new Date().getHours()))
  const [have, setHave] = useState<Have | null>(null)
  const [past, setPast] = useState<PastMeal[]>([])
  const [feedback, setFeedback] = useState<Map<string, boolean>>(new Map())
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

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
    const since = new Date()
    since.setDate(since.getDate() - 28)
    void supabase.from('meal_log').select('date, meal, label, recipe_id, items').gte('date', toISODate(since)).then(({ data: rows }) => setPast((rows ?? []) as PastMeal[]))
    void supabase.from('dish_feedback').select('key, liked').then(({ data: rows }) => setFeedback(new Map((rows ?? []).map((r) => [r.key as string, r.liked as boolean]))))
  }, [open])

  async function vote(key: string, liked: boolean) {
    const same = feedback.get(key) === liked
    const { error } = same
      ? await supabase.from('dish_feedback').delete().eq('key', key)
      : await supabase.from('dish_feedback').upsert({ key, liked, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' })
    if (error) return setMsg(error.message)
    setMsg(null)
    const next = new Map(feedback)
    if (same) next.delete(key)
    else next.set(key, liked)
    setFeedback(next)
  }

  const budget = useMemo(() => mealBudget(meal, left, pending), [meal, left, pending])
  const extras = meal === 'merienda'
  const habits = useMemo(() => (have ? suggestHabits(meal, left, habitsFrom(past), have, data.foodById, feedback, today, pending).slice(0, 3) : []), [have, meal, left, past, data, feedback, today, pending])
  const ranked = useMemo(
    () => (have && !extras ? rankRecipes(meal, left, data.recipes, data.itemsByRecipe, data.foodById, have, pending).filter((c) => feedback.get(`recipe:${c.recipe.id}`) !== false).slice(0, 4) : []),
    [have, meal, left, data, feedback, pending, extras],
  )
  const built = useMemo(
    () => (have && !extras ? assemble(meal, left, have, data.foodById, pending).filter((a) => feedback.get(dishKey(null, a.parts.map((p) => ({ food_id: p.food.id, grams: p.grams })))) !== false) : []),
    [have, meal, left, data, feedback, pending, extras],
  )

  if (!open) return <button onClick={() => setOpen(true)}>¿Qué como ahora?</button>

  const Vote = ({ k }: { k: string }) => (
    <span>
      <button className="link" onClick={() => vote(k, true)} aria-pressed={feedback.get(k) === true}>{feedback.get(k) === true ? 'Te gusta ✓' : 'Me gusta'}</button>
      <button className="link" onClick={() => vote(k, false)}>No me apetece</button>
    </span>
  )

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
      <p className="muted">Te faltan {Math.round(left.kcal)} kcal y {Math.round(left.protein)} g de proteína en el día.</p>
      {extras ? (
        <p className="muted">Extras es para lo que se sale de las comidas: postres, antojos o comer fuera. Después de lo que te queda por comer, te caben ≈ {Math.round(budget.kcal)} kcal sin pasarte.</p>
      ) : (
        <p className="muted">Para este momento te tocan unas {Math.round(budget.kcal)} kcal y {Math.round(budget.protein)} g de proteína (máximo 800 kcal y 45 g por comida). Quedan para lo siguiente ≈ {Math.max(0, Math.round(left.kcal - budget.kcal))} kcal y {Math.max(0, Math.round(left.protein - budget.protein))} g.</p>
      )}
      {msg && <p className="err">{msg}</p>}
      {!have && <p className="muted">Mirando lo que hay en casa…</p>}
      {have && extras && habits.length === 0 && <p className="muted">Todavía no tengo extras tuyos registrados que repetir. Cuando anotes postres o antojos en Extras, aparecerán aquí.</p>}
      {have && !extras && habits.length === 0 && ranked.length === 0 && built.length === 0 && <p className="muted">Con lo que hay en casa no puedo armar nada para este momento. Dime qué tienes en el chat y lo armamos, o mira Compra.</p>}

      {habits.length > 0 && <h4>{extras ? 'Tus extras de siempre' : 'Tus platos de siempre'}</h4>}
      {habits.map((s) => (
        <div key={s.habit.key} className="entry">
          <div>
            <strong>{s.habit.label}</strong>
            <small className="muted">{s.parts.map((p) => `${short(p.food.name)} ${p.grams} g`).join(' · ')}</small>
            <small className="muted">{s.kcal} kcal · {s.protein} g de proteína{s.k !== 1 ? ` · ${s.k > 1 ? 'más' : 'menos'} que la última vez` : ''}</small>
            {s.notes.map((n) => <small key={n} className="warn-text">{n}</small>)}
            <Vote k={s.habit.key} />
          </div>
          <button className="link" onClick={() => { setOpen(false); onRegisterItems(s.parts.map((p) => ({ food_id: p.food.id, grams: p.grams })), meal, s.habit.label) }}>Registrar</button>
        </div>
      ))}

      {ranked.length > 0 && <h4>Recetas</h4>}
      {ranked.map((c) => (
        <div key={c.recipe.id} className="entry">
          <div>
            <strong>{c.recipe.name}</strong>
            <small className="muted">{c.kcal} kcal · {c.protein} g de proteína{c.recipe.servings > 1 ? ' por ración' : ''}</small>
            {c.notes.map((n) => <small key={n} className="warn-text">{n}</small>)}
            <Vote k={`recipe:${c.recipe.id}`} />
          </div>
          <button className="link" onClick={() => { setOpen(false); onRegister(c.recipe.id, meal) }}>Registrar</button>
        </div>
      ))}

      {built.length > 0 && (
        <>
          <h4>Armado con lo que tienes</h4>
          <p className="muted">No son recetas: son alimentos de casa con cantidades que se acercan a lo que te toca.</p>
          {built.map((a) => {
            const items = a.parts.map((p) => ({ food_id: p.food.id, grams: p.grams }))
            return (
              <div key={dishKey(null, items)} className="entry">
                <div>
                  <strong>{a.parts.map((p) => short(p.food.name)).join(' + ')}</strong>
                  <small className="muted">{a.parts.map((p) => `${short(p.food.name)} ${Math.round(p.grams)} g`).join(' · ')}</small>
                  <small className="muted">{a.kcal} kcal · {a.protein} g de proteína</small>
                  {a.notes.map((n) => <small key={n} className="warn-text">{n}</small>)}
                  <Vote k={dishKey(null, items)} />
                </div>
                <button className="link" onClick={() => { setOpen(false); onRegisterItems(items, meal) }}>Registrar</button>
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
