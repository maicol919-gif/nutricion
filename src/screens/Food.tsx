import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../store'
import { toISODate } from '../lib/date'
import { useFoodData } from '../lib/useFoodData'
import { MEAL_BUCKET, signedPhotoUrls } from '../lib/photo'
import { itemsSummary } from '../lib/meal'
import { MEALS, kcalState, mealForHour, proteinState, remaining, sumMacros } from '../lib/nutrition'
import type { MealEntry, MealKey } from '../types'
import AddMeal from './food/AddMeal'
import Recipes from './food/Recipes'
import Foods from './food/Foods'
import Fridge from './food/Fridge'
import Home from './food/Home'
import StockPrompt, { type UsedStock } from './food/StockPrompt'
import WhatToEat from './food/WhatToEat'
import Supplements from './food/Supplements'
import { applyUsage, type StockRow, type Used } from '../lib/fridge'

type View = 'hoy' | 'recetas' | 'alimentos' | 'casa'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function dateLabel(date: string): string {
  const today = toISODate(new Date())
  if (date === today) return 'Hoy'
  if (date === shiftDate(today, -1)) return 'Ayer'
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

function Bar({ label, eaten, target, state, unit }: { label: string; eaten: number; target: number; state: 'bajo' | 'ok' | 'pasado'; unit: string }) {
  const pct = Math.min(100, target > 0 ? (eaten / target) * 100 : 0)
  return (
    <div className="bigbar">
      <div className="row between">
        <strong>{label}</strong>
        <span className={state === 'ok' ? 'ok' : state === 'pasado' ? 'warn-text' : ''}>
          {fmt(eaten)} / {fmt(target)} {unit}
        </span>
      </div>
      <div className="progress"><div className={state} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function Food() {
  const { settings } = useData()
  const { data, error } = useFoodData()
  const [view, setView] = useState<View>('hoy')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [recents, setRecents] = useState<MealEntry[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState<{ recipeId: string | null; entry: MealEntry | null; meal?: MealKey; items?: { food_id: string; grams: number }[]; label?: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [dayMarked, setDayMarked] = useState(false)
  const [usedStock, setUsedStock] = useState<{ items: UsedStock[]; notes: string[] } | null>(null)

  const loadMark = useCallback(async () => {
    const { data: m } = await supabase.from('day_marks').select('date').eq('date', date).maybeSingle()
    setDayMarked(!!m)
  }, [date])

  async function toggleMark() {
    const { error: e } = dayMarked
      ? await supabase.from('day_marks').delete().eq('date', date)
      : await supabase.from('day_marks').upsert({ date, kind: 'sin_registro' })
    if (e) return setMsg(e.message)
    setMsg(null)
    setDayMarked(!dayMarked)
  }

  const loadEntries = useCallback(async () => {
    const { data: rows, error: e } = await supabase.from('meal_log').select('*').eq('date', date).order('created_at')
    if (e) return setMsg(e.message)
    const list = (rows ?? []).map((r) => ({
      ...r,
      servings: r.servings == null ? null : Number(r.servings),
      grams: r.grams == null ? null : Number(r.grams),
      kcal: Number(r.kcal),
      protein: Number(r.protein),
      carbs: Number(r.carbs),
      fat: Number(r.fat),
      kcal_estimated: Number(r.kcal_estimated ?? 0),
    })) as MealEntry[]
    setEntries(list)
    const paths = list.map((x) => x.photo_path).filter((p): p is string => !!p)
    setPhotoUrls(await signedPhotoUrls(paths))
  }, [date])

  const loadRecents = useCallback(async () => {
    const { data: rows } = await supabase.from('meal_log').select('*').order('created_at', { ascending: false }).limit(60)
    setRecents(((rows ?? []) as MealEntry[]).map((r) => ({ ...r, kcal: Number(r.kcal), protein: Number(r.protein) })))
  }, [])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])
  useEffect(() => {
    void loadRecents()
  }, [loadRecents])
  useEffect(() => {
    void loadMark()
  }, [loadMark])

  const done = useMemo(() => entries.filter((e) => e.status !== 'pending'), [entries])
  const pending = useMemo(() => entries.filter((e) => e.status === 'pending'), [entries])
  const total = useMemo(() => sumMacros(done), [done])
  const estimated = useMemo(() => Math.min(total.kcal, done.reduce((s, e) => s + e.kcal_estimated, 0)), [done, total.kcal])
  const target = { kcal: settings.kcal_target, protein: settings.protein_target }
  const left = remaining(target, total)
  // comidas principales que aún no has registrado hoy (para repartir lo que falta del día)
  const pendingMeals = (['desayuno', 'comida', 'cena'] as MealKey[]).filter((k) => !done.some((e) => e.meal === k))

  async function removeEntry(e: MealEntry) {
    const { error: err } = await supabase.from('meal_log').delete().eq('id', e.id)
    if (err) return setMsg(err.message)
    if (e.photo_path) await supabase.storage.from(MEAL_BUCKET).remove([e.photo_path])
    await Promise.all([loadEntries(), loadRecents()])
  }

  /** Tras guardar una comida nueva: descuenta lo usado de En casa y pregunta por lo que no lleva cantidad. */
  async function updateStock() {
    const { data: last } = await supabase.from('meal_log').select('items, food_id, grams').order('created_at', { ascending: false }).limit(1)
    const row = last?.[0] as { items: { food_id: string; grams: number }[] | null; food_id: string | null; grams: number | null } | undefined
    const used: Used[] = row?.items?.length ? row.items.map((i) => ({ food_id: i.food_id, grams: Number(i.grams) })) : row?.food_id && row.grams ? [{ food_id: row.food_id, grams: Number(row.grams) }] : []
    if (used.length === 0) return
    const { data: stock } = await supabase.from('fridge_items').select('id, name, food_id, grams, pack_g, low').in('food_id', [...new Set(used.map((u) => u.food_id))])
    if (!stock || stock.length === 0) return
    const res = applyUsage(stock.map((s) => ({ ...s, grams: s.grams == null ? null : Number(s.grams), pack_g: s.pack_g == null ? null : Number(s.pack_g) })) as StockRow[], used)
    await Promise.all([
      ...res.updates.map((u) => supabase.from('fridge_items').update({ grams: u.grams, low: u.low }).eq('id', u.id)),
      ...res.deletes.map((d) => supabase.from('fridge_items').delete().eq('id', d.id)),
    ])
    const lines = [
      ...res.updates.map((u) => `${u.name}: quedan ${Math.round(u.grams)} g${u.low ? ' (queda poco)' : ''}`),
      ...res.deletes.map((d) => `${d.name}: se acabó`),
    ]
    if (lines.length > 0 || res.untracked.length > 0) setUsedStock({ items: res.untracked, notes: lines })
  }

  async function onSaved() {
    // solo una comida nueva (o una foto pendiente que se completa) descuenta; corregir una ya guardada no
    const firstTime = !adding?.entry || adding.entry.status === 'pending'
    setAdding(null)
    setMsg(null)
    if (dayMarked) {
      await supabase.from('day_marks').delete().eq('date', date)
      setDayMarked(false)
    }
    await Promise.all([loadEntries(), loadRecents()])
    if (firstTime) await updateStock()
  }

  if (error) return <div className="screen"><p className="err">No se pudo cargar la alimentación: {error}</p></div>
  if (!data) return <div className="screen"><p>Cargando…</p></div>

  const isToday = date === toISODate(new Date())

  return (
    <div className="screen">
      <h2>Alimentación</h2>
      <div className="subtabs">
        {([['hoy', 'Mi día'], ['recetas', 'Recetas'], ['alimentos', 'Alimentos'], ['casa', 'En casa']] as [View, string][]).map(([k, label]) => (
          <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{label}</button>
        ))}
      </div>
      {msg && <p className="err">{msg}</p>}

      {view === 'hoy' && (
        <>
          <div className="row between">
            <button onClick={() => setDate(shiftDate(date, -1))} aria-label="Día anterior">←</button>
            <strong>{dateLabel(date)}</strong>
            <button onClick={() => setDate(shiftDate(date, 1))} disabled={isToday} aria-label="Día siguiente">→</button>
          </div>

          <section className="card">
            <Bar label="Proteína" eaten={total.protein} target={target.protein} state={proteinState(total.protein, target.protein)} unit="g" />
            <Bar label="Calorías" eaten={total.kcal} target={target.kcal} state={kcalState(total.kcal, target.kcal)} unit="kcal" />
            <p className="muted">
              {left.protein > 0 ? `Te faltan ${fmt(left.protein)} g de proteína` : 'Meta de proteína cumplida'}
              {left.kcal > 0 ? ` y te quedan ${fmt(left.kcal)} kcal.` : total.kcal > target.kcal * 1.05 ? ` · ${fmt(total.kcal - target.kcal)} kcal por encima de la meta.` : '.'}
            </p>
            <p className="muted">Carbohidratos {fmt(total.carbs)} g · Grasa {fmt(total.fat)} g</p>
            {estimated > 0 && (
              <p className="muted est">De tus {fmt(total.kcal)} kcal, ≈ {fmt(estimated)} son estimadas ({fmt((estimated / Math.max(1, total.kcal)) * 100)} %).</p>
            )}
          </section>

          {dayMarked && (
            <section className="card warn">
              <h3>Día sin registrar</h3>
              <p className="muted">Este día no cuenta como fallo ni entra en tus promedios. Si registras algo, la marca se quita sola.</p>
              <button onClick={toggleMark}>Quitar la marca</button>
            </section>
          )}

          {usedStock && <StockPrompt items={usedStock.items} notes={usedStock.notes} onDone={() => setUsedStock(null)} />}

          <button className="primary" onClick={() => setAdding({ recipeId: null, entry: null })}>Registrar lo que comí</button>

          {isToday && <WhatToEat data={data} left={left} pending={pendingMeals} onRegister={(recipeId, meal) => setAdding({ recipeId, entry: null, meal })} onRegisterItems={(items, meal, label) => setAdding({ recipeId: null, entry: null, meal, items, label })} />}

          {isToday && <Fridge />}

          {pending.length > 0 && (
            <section className="card warn">
              <h3>Por completar ({pending.length})</h3>
              <p className="muted">Todavía no cuentan en tus totales. Completa qué llevaban.</p>
              {pending.map((e) => (
                <div key={e.id} className="entry">
                  {e.photo_path && photoUrls[e.photo_path] ? <img className="thumb" src={photoUrls[e.photo_path]} alt="Foto del plato" /> : <div className="thumb empty">sin foto</div>}
                  <div>
                    <strong>{MEALS.find((m) => m.key === e.meal)?.label}</strong>
                    <button onClick={() => setAdding({ recipeId: null, entry: e })}>Completar</button>
                  </div>
                  <button className="link" onClick={() => removeEntry(e)} aria-label="Quitar">✕</button>
                </div>
              ))}
            </section>
          )}

          {MEALS.map((m) => {
            const list = done.filter((e) => e.meal === m.key)
            if (list.length === 0) return null
            const sub = sumMacros(list)
            return (
              <section key={m.key} className="card">
                <div className="row between">
                  <h3>{m.label}</h3>
                  <span className="muted">{fmt(sub.kcal)} kcal · {fmt(sub.protein)} g prot.</span>
                </div>
                {list.map((e) => {
                  const canEdit = !!(e.items?.length || e.recipe_id || e.food_id)
                  const summary = itemsSummary(e.items)
                  return (
                    <div key={e.id} className="entry">
                      {e.photo_path && photoUrls[e.photo_path] && <img className="thumb" src={photoUrls[e.photo_path]} alt="Foto del plato" />}
                      <div>
                        <strong>{e.label}</strong>
                        <small className="muted">{fmt(e.kcal)} kcal · {fmt(e.protein, 1)} g prot.</small>
                        {summary && <small className="muted">{summary}</small>}
                        {e.note && <small className="note">{e.note}</small>}
                        {canEdit && <button className="link" onClick={() => setAdding({ recipeId: null, entry: e })}>Editar</button>}
                      </div>
                      <button className="link" onClick={() => removeEntry(e)} aria-label={`Quitar ${e.label}`}>✕</button>
                    </div>
                  )
                })}
              </section>
            )
          })}
          <Supplements date={date} />

          {entries.length === 0 && !dayMarked && (
            <>
              <p className="muted">Aún no registras nada {isToday ? 'hoy' : 'este día'}.</p>
              <button className="link" onClick={toggleMark}>{isToday ? 'Hoy no voy a registrar' : 'No registré este día'}</button>
            </>
          )}
        </>
      )}

      {view === 'recetas' && <Recipes data={data} onLog={(id) => { setView('hoy'); setAdding({ recipeId: id, entry: null }) }} />}

      {view === 'alimentos' && <Foods data={data} />}

      {view === 'casa' && <Home data={data} />}

      {adding && (
        <AddMeal
          date={date}
          data={data}
          recents={recents}
          defaultMeal={adding.meal ?? mealForHour(new Date().getHours())}
          presetRecipeId={adding.recipeId}
          presetItems={adding.items}
          presetLabel={adding.label}
          editEntry={adding.entry}
          onSaved={onSaved}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  )
}
