import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toISODate } from '../lib/date'
import { useFoodData } from '../lib/useFoodData'
import { TRIPS, dailyUse, recipeCoverage, suggestions, type Have, type LoggedMeal, type Status, type Trip } from '../lib/compra'
import { ZONES, zoneOf } from '../lib/shopping'

const KEY = 'compra-v3'
interface Saved { trip: Trip; cart: string[] }

function load(): Saved {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (o && (o.trip === 'fresca' || o.trip === 'grande') && Array.isArray(o.cart)) return o
  } catch {
    /* sin almacenamiento: empieza vacío */
  }
  return { trip: 'fresca', cart: [] }
}

const fmt = (n: number) => String(Math.round(n))
const LABEL: Record<Status, string> = { verde: 'Ya puedes hacerla', amarillo: 'Te falta poco', gris: 'Faltan varios' }

/**
 * Compra, en el mercado: eliges qué compra haces (fresca o grande), la app propone qué comprar según lo que consumes y lo que
 * hay en casa, marcas lo que metes al carro y ves qué recetas cubres (verde, amarillo, gris).
 */
export default function Compra() {
  const { data, error } = useFoodData()
  const [saved, setSaved] = useState<Saved>(load)
  const [have, setHave] = useState<Have>(new Map())
  const [meals, setMeals] = useState<LoggedMeal[]>([])
  const [other, setOther] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

  useEffect(() => {
    void supabase.from('fridge_items').select('food_id, grams, low').not('food_id', 'is', null).then(({ data: rows, error: e }) => {
      if (e) return setMsg(e.message)
      const m: Have = new Map()
      for (const r of rows ?? []) {
        const id = r.food_id as string
        const g = r.grams == null ? null : Number(r.grams)
        if (g === null && r.low) continue // queda poco y no se lleva cantidad: se cuenta como que falta
        const prev = m.get(id)
        m.set(id, prev === undefined ? g : prev === null || g === null ? null : prev + g)
      }
      setHave(m)
    })
    const since = new Date()
    since.setDate(since.getDate() - 28)
    void supabase.from('meal_log').select('date, items').gte('date', toISODate(since)).then(({ data: rows }) => {
      setMeals((rows ?? []) as LoggedMeal[])
    })
  }, [])

  function update(next: Saved) {
    setSaved(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sin almacenamiento: se pierde al cerrar */
    }
  }
  const cart = useMemo(() => new Set(saved.cart), [saved.cart])
  const toggleCart = (id: string) => update({ ...saved, cart: cart.has(id) ? saved.cart.filter((x) => x !== id) : [...saved.cart, id] })
  const addAll = (ids: string[]) => update({ ...saved, cart: [...new Set([...saved.cart, ...ids])] })

  const use = useMemo(() => dailyUse(meals, today), [meals, today])
  const suggested = useMemo(() => (data ? suggestions(saved.trip, use, have, data.foodById) : []), [data, saved.trip, use, have])
  const coverage = useMemo(() => (data ? recipeCoverage(data.recipes, data.itemsByRecipe, data.foodById, have, cart) : []), [data, have, cart])

  if (error) return <div className="screen"><p className="err">No se pudo cargar: {error}</p></div>
  if (!data) return <div className="screen"><p>Cargando…</p></div>

  const suggestedIds = new Set(suggested.map((s) => s.food.id))
  const extras = saved.cart.filter((id) => !suggestedIds.has(id)).map((id) => data.foodById.get(id)).filter((f): f is NonNullable<typeof f> => !!f)

  function addOther() {
    const name = other.trim().toLowerCase()
    const f = data?.activeFoods.find((x) => x.name.toLowerCase() === name)
    if (!f) return setMsg('Elige un alimento de la lista.')
    setMsg(null)
    setOther('')
    if (!cart.has(f.id)) toggleCart(f.id)
  }

  const groups = ZONES.map((z) => ({ z, lines: suggested.filter((s) => zoneOf(s.food.name) === z) })).filter((g) => g.lines.length > 0)
  const lowHistory = Math.min(28, Math.max(0, meals.length)) < 10

  return (
    <div className="screen">
      <h2>Compra</h2>
      <div className="subtabs">
        {(Object.keys(TRIPS) as Trip[]).map((t) => (
          <button key={t} className={saved.trip === t ? 'active' : ''} onClick={() => update({ ...saved, trip: t })}>{TRIPS[t].label}</button>
        ))}
      </div>
      <p className="muted">Lo que sueles consumir en {TRIPS[saved.trip].days} días, menos lo que ya tienes en casa. Marca lo que metes al carro.</p>
      {lowHistory && <p className="muted est">Llevas pocas comidas registradas, así que las cantidades son aproximadas y mejorarán con las semanas.</p>}
      {msg && <p className="err">{msg}</p>}

      {suggested.length === 0 && <p className="muted">No hay nada que comprar según tu consumo y lo que tienes en casa.</p>}
      {groups.map((g) => (
        <section key={g.z} className="card">
          <h3>{g.z}</h3>
          {g.lines.map((s) => (
            <div key={s.food.id} className="entry">
              <label>
                <input type="checkbox" checked={cart.has(s.food.id)} onChange={() => toggleCart(s.food.id)} /> <strong>{s.food.name}</strong>
                <small className="muted">≈ {fmt(s.grams)} g</small>
              </label>
            </div>
          ))}
        </section>
      ))}

      <section className="card">
        <h3>Otros alimentos en el carro</h3>
        {extras.map((f) => (
          <div key={f.id} className="entry">
            <label><input type="checkbox" checked onChange={() => toggleCart(f.id)} /> <strong>{f.name}</strong></label>
          </div>
        ))}
        <label>Añadir otro alimento
          <input value={other} onChange={(e) => setOther(e.target.value)} list="compra-foods" placeholder="Busca un alimento" />
          <datalist id="compra-foods">{data.activeFoods.map((f) => <option key={f.id} value={f.name} />)}</datalist>
        </label>
        <button onClick={addOther} disabled={!other.trim()}>Añadir al carro</button>
      </section>

      <h3>Recetas que cubres</h3>
      <p className="muted">Con lo que hay en casa y lo que llevas en el carro.</p>
      {coverage.filter((c) => c.status !== 'gris').map((c) => (
        <section key={c.recipe.id} className={`card ${c.status === 'amarillo' ? 'warn' : ''}`}>
          <div className="entry">
            <div>
              <strong>{c.recipe.name}</strong>
              <small className={c.status === 'verde' ? 'ok' : 'warn-text'}>{LABEL[c.status]}</small>
              {c.missing.length > 0 && <small className="muted">Falta: {c.missing.map((f) => f.name).join(', ')}</small>}
            </div>
            {c.missing.length > 0 && <button className="link" onClick={() => addAll(c.missing.map((f) => f.id))}>Añadir lo que falta</button>}
          </div>
        </section>
      ))}
      {coverage.some((c) => c.status === 'gris') && (
        <details>
          <summary>Faltan varios alimentos ({coverage.filter((c) => c.status === 'gris').length})</summary>
          {coverage.filter((c) => c.status === 'gris').map((c) => (
            <div key={c.recipe.id} className="entry">
              <div><strong>{c.recipe.name}</strong><small className="muted">Falta: {c.missing.map((f) => f.name).join(', ')}</small></div>
              <button className="link" onClick={() => addAll(c.missing.map((f) => f.id))}>Añadir lo que falta</button>
            </div>
          ))}
        </details>
      )}
      {saved.cart.length > 0 && <button className="link" onClick={() => update({ ...saved, cart: [] })}>Vaciar el carro</button>}
    </div>
  )
}
