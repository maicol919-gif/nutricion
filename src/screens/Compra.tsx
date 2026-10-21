import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toISODate } from '../lib/date'
import { useFoodData } from '../lib/useFoodData'
import { addDays, planWindow, repeatedRecipes, type PlanRow } from '../lib/plan'
import { ZONES, planShopping, zoneOf, type ShoppingLine } from '../lib/shopping'
import { MEALS } from '../lib/nutrition'

const KEY = 'compra-v2'
const DAYS = 14
interface Saved { extra: string[]; done: string[] }

function load(): Saved {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (o && Array.isArray(o.extra) && Array.isArray(o.done)) return o
  } catch {
    /* sin almacenamiento: empieza vacío */
  }
  return { extra: [], done: [] }
}

const fmt = (n: number) => String(Math.round(n))
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

/** Compra: sale del plan de las próximas 2 semanas, en dos viajes, sin lo que ya hay en casa. */
export default function Compra() {
  const { data, error } = useFoodData()
  const [saved, setSaved] = useState<Saved>(load)
  const [inHome, setInHome] = useState<Set<string>>(new Set())
  const [plan, setPlan] = useState<PlanRow[]>([])
  const today = toISODate(new Date())

  const loadAll = useCallback(async () => {
    const [stock, rows] = await Promise.all([
      supabase.from('fridge_items').select('food_id').not('food_id', 'is', null).eq('low', false),
      supabase.from('meal_plan').select('*').gte('date', today).lte('date', addDays(today, DAYS - 1)),
    ])
    setInHome(new Set((stock.data ?? []).map((r) => r.food_id as string)))
    setPlan((rows.data ?? []).map((r) => ({ ...r, servings: Number(r.servings) })) as PlanRow[])
  }, [today])
  useEffect(() => {
    void loadAll()
  }, [loadAll])

  function update(next: Saved) {
    setSaved(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sin almacenamiento: se pierde al cerrar */
    }
  }
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const rows = useMemo(() => {
    const extras: PlanRow[] = saved.extra.map((id) => ({ id: 'extra-' + id, date: today, meal: 'comida', recipe_id: id, label: null, servings: 1, note: null }))
    return [...planWindow(plan, today, DAYS), ...extras]
  }, [plan, saved.extra, today])

  const out = useMemo(
    () => (data ? planShopping(rows, today, data.itemsByRecipe, data.recipes, data.foodById, inHome) : { trip1: [], trip2: [], have: [] }),
    [data, rows, today, inHome],
  )

  if (error) return <div className="screen"><p className="err">No se pudo cargar: {error}</p></div>
  if (!data) return <div className="screen"><p>Cargando…</p></div>

  const recipeName = (id: string | null) => data.recipes.find((r) => r.id === id)?.name
  const planned = planWindow(plan, today, DAYS)
  const days = [...new Set(planned.map((r) => r.date))]
  const repeats = repeatedRecipes(planned)

  const row = (l: ShoppingLine) => (
    <div key={l.food.id} className="entry">
      <div>
        <label>
          <input type="checkbox" checked={saved.done.includes(l.food.id)} onChange={() => update({ ...saved, done: toggle(saved.done, l.food.id) })} />{' '}
          <strong>{l.food.name}</strong>
        </label>
        <small className="muted">{fmt(l.grams)} g · {l.from.join(', ')}</small>
      </div>
    </div>
  )
  const byZone = (lines: ShoppingLine[]) =>
    ZONES.map((z) => {
      const zl = lines.filter((l) => zoneOf(l.food.name) === z)
      if (zl.length === 0) return null
      return (
        <section key={z} className="card">
          <h3>{z}</h3>
          {zl.map(row)}
        </section>
      )
    })

  return (
    <div className="screen">
      <h2>Compra</h2>
      <p className="muted">La lista sale del plan de las próximas 2 semanas, sin lo que ya tienes en casa (y no queda poco).</p>

      {planned.length === 0 ? (
        <p className="muted">Todavía no hay un plan. Pídele a Claude que prepare el de las próximas 2 semanas.</p>
      ) : (
        <details>
          <summary>Plan de las próximas 2 semanas ({planned.length} comidas)</summary>
          {repeats.length > 0 && <p className="warn-text">Se repite más de 2 veces: {repeats.map((r) => `${recipeName(r.recipe_id) ?? 'receta'} (${r.times})`).join(', ')}</p>}
          {days.map((d) => (
            <div key={d} className="entry">
              <div>
                <strong>{dayLabel(d)}</strong>
                {planned.filter((r) => r.date === d).map((r) => (
                  <small key={r.id} className="muted">{MEALS.find((m) => m.key === r.meal)?.label}: {recipeName(r.recipe_id) ?? r.label ?? 'libre'}{r.servings !== 1 ? ` ×${r.servings}` : ''}</small>
                ))}
              </div>
            </div>
          ))}
        </details>
      )}

      {rows.length > 0 && (
        <>
          <h3>Compra 1: ahora</h3>
          {out.trip1.length === 0 && <p className="muted">No hace falta comprar nada.</p>}
          {byZone(out.trip1)}
          {out.trip2.length > 0 && (
            <>
              <h3>Compra 2: a mitad de ciclo (desde el {dayLabel(addDays(today, 7))})</h3>
              <p className="muted">Lo fresco de la segunda semana, para que no caduque.</p>
              {byZone(out.trip2)}
            </>
          )}
          {out.have.length > 0 && (
            <details>
              <summary>Ya en casa ({out.have.length})</summary>
              {out.have.map((l) => (
                <div key={l.food.id} className="entry"><div><strong>{l.food.name}</strong><small className="muted">{fmt(l.grams)} g · {l.from.join(', ')}</small></div></div>
              ))}
            </details>
          )}
        </>
      )}

      <details>
        <summary>Añadir recetas sueltas a la lista</summary>
        {data.recipes.map((r) => {
          const on = saved.extra.includes(r.id)
          return (
            <div key={r.id} className="entry">
              <div><strong>{r.name}</strong></div>
              <button className={on ? 'primary' : ''} onClick={() => update({ ...saved, extra: toggle(saved.extra, r.id) })} aria-pressed={on}>{on ? 'Quitar' : 'Añadir'}</button>
            </div>
          )
        })}
      </details>
      {(saved.extra.length > 0 || saved.done.length > 0) && <button className="link" onClick={() => update({ extra: [], done: [] })}>Borrar sueltas y marcas</button>}
    </div>
  )
}
