import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useFoodData } from '../lib/useFoodData'
import { ZONES, shoppingList, zoneOf, type ShoppingLine } from '../lib/shopping'

const KEY = 'compra-v1'
interface Saved { sel: string[]; done: string[] }

function load(): Saved {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (o && Array.isArray(o.sel) && Array.isArray(o.done)) return o
  } catch {
    /* sin almacenamiento: empieza vacío */
  }
  return { sel: [], done: [] }
}

const fmt = (n: number) => String(Math.round(n))

/** Compra: eliges recetas y sale la lista del súper con los gramos sumados, sin lo que ya hay en casa (y no queda poco). */
export default function Compra() {
  const { data, error } = useFoodData()
  const [saved, setSaved] = useState<Saved>(load)
  const [inHome, setInHome] = useState<Set<string>>(new Set())

  useEffect(() => {
    void supabase.from('fridge_items').select('food_id').not('food_id', 'is', null).eq('low', false).then(({ data: rows }) => {
      setInHome(new Set((rows ?? []).map((r) => r.food_id as string)))
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
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const lists = useMemo(
    () => (data ? shoppingList(saved.sel, data.recipes, data.itemsByRecipe, data.foodById, inHome) : { toBuy: [], have: [] }),
    [data, saved.sel, inHome],
  )

  if (error) return <div className="screen"><p className="err">No se pudo cargar: {error}</p></div>
  if (!data) return <div className="screen"><p>Cargando…</p></div>

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

  return (
    <div className="screen">
      <h2>Compra</h2>
      <p className="muted">Elige recetas y aquí sale lo que hay que comprar. Lo que ya tienes en casa (y no queda poco) va aparte.</p>

      <section className="card">
        <h3>Recetas</h3>
        {data.recipes.map((r) => {
          const on = saved.sel.includes(r.id)
          return (
            <div key={r.id} className="entry">
              <div><strong>{r.name}</strong></div>
              <button className={on ? 'primary' : ''} onClick={() => update({ ...saved, sel: toggle(saved.sel, r.id) })} aria-pressed={on}>{on ? 'Quitar' : 'Añadir'}</button>
            </div>
          )
        })}
      </section>

      <h3>Lista del súper{saved.sel.length > 0 ? ` (${saved.sel.length} receta${saved.sel.length > 1 ? 's' : ''})` : ''}</h3>
      {saved.sel.length === 0 && <p className="muted">Todavía no elegiste ninguna receta.</p>}
      {saved.sel.length > 0 && lists.toBuy.length === 0 && <p className="muted">Todo lo de tus recetas ya lo tienes en casa.</p>}
      {ZONES.map((z) => {
        const zl = lists.toBuy.filter((l) => zoneOf(l.food.name) === z)
        if (zl.length === 0) return null
        return (
          <section key={z} className="card">
            <h3>{z}</h3>
            {zl.map(row)}
          </section>
        )
      })}
      {lists.have.length > 0 && (
        <details>
          <summary>Ya en casa ({lists.have.length})</summary>
          {lists.have.map((l) => (
            <div key={l.food.id} className="entry"><div><strong>{l.food.name}</strong><small className="muted">{fmt(l.grams)} g · {l.from.join(', ')}</small></div></div>
          ))}
        </details>
      )}
      {(saved.sel.length > 0 || saved.done.length > 0) && <button className="link" onClick={() => update({ sel: [], done: [] })}>Borrar selección y marcas</button>}
    </div>
  )
}
