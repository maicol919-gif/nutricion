import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMealPhoto } from '../../lib/photo'
import type { FoodData } from '../../lib/useFoodData'
import type { Food, MealEntry, MealKey, Recipe } from '../../types'
import { MEALS, recipeMacros, roundMacros } from '../../lib/nutrition'
import { foodMatchesQuery, matchesQuery } from '../../lib/foods'
import NewFoodForm from './NewFoodForm'
import RecipeEditor from './RecipeEditor'
import IngredientEditor, { type EditorLabels } from './IngredientEditor'
import { servingsForWeight, weightFactor } from '../../lib/recipes'
import { parseAmount, rowFromGrams, rowsEstimatedKcal, rowsFromItems, rowsMacros, toStoredItems, type MealRow } from '../../lib/meal'

type Mode = 'recetas' | 'alimentos' | 'etiqueta' | 'rapido'

interface Props {
  date: string
  data: FoodData
  recents: MealEntry[]
  defaultMeal: MealKey
  presetRecipeId: string | null
  /** comida que se completa (foto pendiente) o se corrige */
  editEntry: MealEntry | null
  onSaved: () => void
  onClose: () => void
}

const MEAL_LABELS: EditorLabels = {
  title: 'Lo que comiste',
  addButton: '+ Añadir alimento',
  searchPlaceholder: 'Buscar alimento',
  empty: 'Aún no has añadido nada. Añade el primero.',
}

const weightFactorMissing = (m: Parameters<typeof weightFactor>[0]) => weightFactor(m) == null

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')
let rowSeq = 0
const newKey = (id: string) => `${id}-n${++rowSeq}`

/** Base de la composición: ingredientes con gramos (se usan para multiplicar raciones). */
type Base = { food_id: string; grams: number }[]

function startRowsFor(entry: MealEntry | null, data: FoodData, recipe: Recipe | undefined): { rows: MealRow[]; base: Base; label: string; recipeId: string | null } {
  if (entry) {
    if (entry.items && entry.items.length) {
      const base = entry.items.map((i) => ({ food_id: i.food_id, grams: i.grams }))
      return { rows: rowsFromItems(base, data.foodById), base, label: entry.status === 'pending' ? '' : entry.label, recipeId: entry.recipe_id }
    }
    if (entry.recipe_id) {
      const r = data.recipes.find((x) => x.id === entry.recipe_id)
      if (r) {
        const base = (data.itemsByRecipe.get(r.id) ?? []).map((i) => ({ food_id: i.food_id, grams: i.grams * (entry.servings ?? 1) / r.servings }))
        return { rows: rowsFromItems(base, data.foodById), base, label: r.name, recipeId: r.id }
      }
    }
    if (entry.food_id && entry.grams) {
      const f = data.foodById.get(entry.food_id)
      if (f) return { rows: [rowFromGrams(f, entry.grams, newKey(f.id))], base: [{ food_id: f.id, grams: entry.grams }], label: f.name, recipeId: null }
    }
    return { rows: [], base: [], label: entry.status === 'pending' ? '' : entry.label, recipeId: null }
  }
  if (recipe) {
    const base = (data.itemsByRecipe.get(recipe.id) ?? []).map((i) => ({ food_id: i.food_id, grams: i.grams / recipe.servings }))
    return { rows: rowsFromItems(base, data.foodById), base, label: recipe.name, recipeId: recipe.id }
  }
  return { rows: [], base: [], label: '', recipeId: null }
}

export default function AddMeal({ date, data, recents, defaultMeal, presetRecipeId, editEntry, onSaved, onClose }: Props) {
  const preset = presetRecipeId ? data.recipes.find((r) => r.id === presetRecipeId) : undefined
  const start = useMemo(() => startRowsFor(editEntry, data, preset), [editEntry, data, preset])
  const composing0 = !!editEntry || !!preset

  const [composing, setComposing] = useState(composing0)
  const [meal, setMeal] = useState<MealKey>(editEntry?.meal ?? defaultMeal)
  const [mode, setMode] = useState<Mode>('recetas')
  const [query, setQuery] = useState('')
  const [maxMin, setMaxMin] = useState<number | null>(null)

  const [rows, setRows] = useState<MealRow[]>(start.rows)
  const [base, setBase] = useState<Base>(start.base)
  const [mult, setMult] = useState('1')
  const [qtyMode, setQtyMode] = useState<'raciones' | 'peso'>('raciones')
  const [eatenG, setEatenG] = useState('')
  const [weightEst, setWeightEst] = useState(false)
  const [label, setLabel] = useState(start.label)
  const [recipeId, setRecipeId] = useState<string | null>(start.recipeId)
  const [note, setNote] = useState(editEntry?.note ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saveRecipe, setSaveRecipe] = useState(false)
  const [recipeName, setRecipeName] = useState('')

  const [qLabel, setQLabel] = useState('')
  const [qKcal, setQKcal] = useState('')
  const [qProtein, setQProtein] = useState('')
  const [qCarbs, setQCarbs] = useState('')
  const [qFat, setQFat] = useState('')
  const [qEstimated, setQEstimated] = useState(true)
  const [newName, setNewName] = useState('')
  const [creatingRecipe, setCreatingRecipe] = useState(false)
  const [pendingRecipe, setPendingRecipe] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const q = query.trim().toLowerCase()
  const recipes = useMemo(
    () =>
      data.recipes
        .filter((r) => matchesQuery(r.name, query) && (maxMin == null || r.minutes <= maxMin))
        .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name)),
    [data.recipes, q, maxMin],
  )
  const foods = useMemo(() => data.activeFoods.filter((f) => foodMatchesQuery(f, query)), [data.activeFoods, query])
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: MealEntry[] = []
    for (const e of recents) {
      if (e.status === 'pending') continue
      const key = `${e.label}|${(e.items ?? []).map((i) => `${i.food_id}:${i.grams}`).join(',')}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(e)
      if (out.length >= 8) break
    }
    return out
  }, [recents])

  function startFrom(r: { rows: MealRow[]; base: Base; label: string; recipeId: string | null }) {
    setRows(r.rows)
    setBase(r.base)
    setLabel(r.label)
    setRecipeId(r.recipeId)
    setMult('1')
    setQtyMode('raciones')
    setEatenG('')
    setWeightEst(false)
    setNote('')
    setErr(null)
    setComposing(true)
  }

  function pickRecipe(r: Recipe) {
    startFrom(startRowsFor(null, data, r))
  }

  function pickFood(f: Food) {
    const row = f.unit_g
      ? { key: newKey(f.id), food_id: f.id, amount: '1', unit: 'u' as const }
      : { key: newKey(f.id), food_id: f.id, amount: '100', unit: 'g' as const }
    startFrom({ rows: [row], base: [], label: f.name, recipeId: null })
  }

  function pickRecent(e: MealEntry) {
    if (e.items && e.items.length) {
      const b = e.items.map((i) => ({ food_id: i.food_id, grams: i.grams }))
      return startFrom({ rows: rowsFromItems(b, data.foodById), base: b, label: e.label, recipeId: e.recipe_id })
    }
    const r = e.recipe_id ? data.recipes.find((x) => x.id === e.recipe_id) : undefined
    if (r) return pickRecipe(r)
    const f = e.food_id ? data.foodById.get(e.food_id) : undefined
    if (f) return pickFood(f)
  }

  const recipeObj = recipeId ? data.recipes.find((r) => r.id === recipeId) : undefined
  const recipeItems = recipeObj ? data.itemsByRecipe.get(recipeObj.id) ?? [] : []
  /** Una receta de 1 ración se registra por fracción del total (⅛, ¼, ½…) o por plato (1, 1,5, 2). */
  const wholeRecipe = !!recipeObj && recipeObj.servings === 1
  const quantityChips: [string, string][] = wholeRecipe
    ? [['0.125', '⅛'], ['0.25', '¼'], ['0.333', '⅓'], ['0.5', '½'], ['1', '1'], ['1.5', '1,5'], ['2', '2']]
    : [['0.5', '0,5'], ['1', '1'], ['1.5', '1,5'], ['2', '2']]
  const byWeight = recipeObj && base.length > 0 && qtyMode === 'peso' ? servingsForWeight(parseAmount(eatenG), recipeObj, recipeItems) : null

  /** Por peso: lo que pesó tu parte, comparado con el peso total de la receta, da las raciones equivalentes. */
  function applyWeight(g: string) {
    setEatenG(g)
    if (!recipeObj) return
    const r = servingsForWeight(parseAmount(g), recipeObj, recipeItems)
    setWeightEst(!!r?.total.estimated)
    if (r) {
      const k = Math.round(r.servings * 1000) / 1000
      setMult(String(k).replace('.', ','))
      setRows(rowsFromItems(base, data.foodById, k))
    }
  }

  function applyMult(m: string) {
    setWeightEst(false)
    setMult(m)
    const k = parseAmount(m)
    if (base.length && k > 0) setRows(rowsFromItems(base, data.foodById, k))
  }

  const macros = useMemo(() => roundMacros(rowsMacros(rows, data.foodById)), [rows, data.foodById])

  /** Cierra la ventana; si hay ingredientes sin guardar, pregunta antes de descartarlos. */
  function close() {
    const unsaved = composing && rows.length > 0 && !saving
    if (unsaved && !window.confirm('Todavía no has guardado este registro. ¿Descartar lo que escribiste?')) return
    onClose()
  }
  const validRows = useMemo(() => toStoredItems(rows, data.foodById), [rows, data.foodById])
  const estimatedKcal = useMemo(() => Math.round(rowsEstimatedKcal(rows, data.foodById)), [rows, data.foodById])

  /** Oculta un alimento de las búsquedas (sin borrar nada) para quitar duplicados al momento. */
  async function disableFood(f: Food) {
    const ok = window.confirm(`¿Deshabilitar "${f.name}"?\n\nDejará de salir en las búsquedas. Tus registros anteriores y tus recetas no cambian, y puedes habilitarlo de nuevo en Alimentación → Alimentos → Deshabilitados.`)
    if (!ok) return
    const { error } = await supabase.from('foods').update({ disabled: true }).eq('id', f.id)
    if (error) return setErr(error.message)
    await data.reload()
  }

  /** Un alimento recién creado pasa directo a lo que comiste (100 g o 1 unidad). */
  function useNewFood(food: Food) {
    const row: MealRow = food.unit_g ? { key: newKey(food.id), food_id: food.id, amount: '1', unit: 'u' } : { key: newKey(food.id), food_id: food.id, amount: '100', unit: 'g' }
    startFrom({ rows: [row], base: [], label: food.name, recipeId: null })
  }

  // al guardar una receta nueva desde aquí, se vuelve al registro con esa receta ya elegida
  useEffect(() => {
    if (!pendingRecipe) return
    const r = data.recipes.find((x) => x.id === pendingRecipe)
    if (r) {
      setPendingRecipe(null)
      pickRecipe(r)
    }
  }, [pendingRecipe, data.recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  async function capturePending(file: File) {
    setErr(null)
    setSaving(true)
    try {
      const path = await uploadMealPhoto(file)
      const { error } = await supabase.from('meal_log').insert({ date, meal, label: 'Sin completar', kcal: 0, protein: 0, status: 'pending', photo_path: path })
      if (error) throw error
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  async function saveQuick() {
    const kcal = parseAmount(qKcal)
    const protein = parseAmount(qProtein || '0')
    if (!qLabel.trim()) return setErr('Escribe qué comiste.')
    if (!qKcal.trim() || !(kcal >= 0)) return setErr('Escribe las calorías.')
    if (!(protein >= 0)) return setErr('Revisa la proteína.')
    setSaving(true)
    const { error } = await supabase.from('meal_log').insert({
      date, meal, label: qLabel.trim(), kcal: Math.round(kcal), protein, carbs: parseAmount(qCarbs || '0') || 0, fat: parseAmount(qFat || '0') || 0, note: note.trim() || null,
      kcal_estimated: qEstimated ? Math.round(kcal) : 0,
    })
    setSaving(false)
    if (error) return setErr(error.message)
    onSaved()
  }

  async function save() {
    setErr(null)
    if (validRows.length === 0) return setErr('Añade al menos un alimento con cantidad.')
    const name = label.trim() || (validRows.length === 1 ? validRows[0].name : 'Plato')
    if (saveRecipe && !recipeName.trim()) return setErr('Ponle un nombre a tu receta.')
    setSaving(true)
    try {
      let photoPath = editEntry?.photo_path ?? null
      if (photo) photoPath = await uploadMealPhoto(photo)

      let usedRecipeId = recipeId
      if (saveRecipe) {
        const ins = await supabase.from('recipes').insert({ name: recipeName.trim(), minutes: 10, meal, tags: ['mía'], steps: '', servings: 1 }).select('id').single()
        if (ins.error) throw new Error(ins.error.code === '23505' ? 'Ya tienes una receta con ese nombre.' : ins.error.message)
        const its = await supabase.from('recipe_items').insert(validRows.map((v, i) => ({ recipe_id: ins.data.id, food_id: v.food_id, grams: v.grams, position: i })))
        if (its.error) throw its.error
        usedRecipeId = ins.data.id
      }

      const row = {
        date: editEntry?.date ?? date,
        meal,
        recipe_id: usedRecipeId,
        food_id: null,
        label: name,
        servings: null,
        grams: null,
        ...macros,
        kcal_estimated: weightEst ? macros.kcal : Math.min(macros.kcal, estimatedKcal),
        items: validRows,
        photo_path: photoPath,
        status: 'done',
        note: note.trim() || null,
      }
      const res = editEntry ? await supabase.from('meal_log').update(row).eq('id', editEntry.id) : await supabase.from('meal_log').insert(row)
      if (res.error) throw res.error
      if (saveRecipe) await data.reload()
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-label={editEntry ? 'Completar registro' : 'Nuevo registro'}>
      {creatingRecipe && (
        <RecipeEditor
          data={data}
          initialName={query.trim()}
          onSaved={(id) => { setCreatingRecipe(false); if (id) setPendingRecipe(id) }}
          onClose={() => setCreatingRecipe(false)}
        />
      )}
      <div className="overlay-inner">
        <div className="row between">
          <h2>{editEntry ? (editEntry.status === 'pending' ? 'Completar registro' : 'Editar registro') : 'Nuevo registro'}</h2>
          <button onClick={close}>Cerrar</button>
        </div>

        <div className="chips">
          {MEALS.map((m) => (
            <button key={m.key} className={`chip ${meal === m.key ? 'on' : ''}`} onClick={() => setMeal(m.key)}>{m.label}</button>
          ))}
        </div>

        {!composing && (
          <>
            <label className="filebtn">
              📷 Foto ahora, detalles después
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void capturePending(f) }} />
            </label>
            <p className="muted">Haz la foto al sentarte a comer (2 toques). Después completas qué llevaba con la foto delante.</p>
            {err && <p className="err">{err}</p>}

            <div className="subtabs">
              {([['recetas', 'Recetas'], ['alimentos', 'Alimentos'], ['etiqueta', 'Etiqueta'], ['rapido', 'Rápido']] as [Mode, string][]).map(([k, lbl]) => (
                <button key={k} className={mode === k ? 'active' : ''} onClick={() => setMode(k)}>{lbl}</button>
              ))}
            </div>

            {(mode === 'recetas' || mode === 'alimentos') && (
              <>
                <input placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
                {!q && recent.length > 0 && (
                  <div>
                    <p className="muted">Repetir algo reciente (con tus mismas cantidades)</p>
                    <div className="chips">
                      {recent.map((e) => <button key={e.id} className="chip" onClick={() => pickRecent(e)}>{e.label}</button>)}
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'recetas' && (
              <>
                <div className="chips">
                  {[null, 5, 10, 15].map((m) => (
                    <button key={String(m)} className={`chip ${maxMin === m ? 'on' : ''}`} onClick={() => setMaxMin(m)}>{m == null ? 'Todas' : `≤ ${m} min`}</button>
                  ))}
                </div>
                {recipes.map((r) => {
                  const m = roundMacros(recipeMacros(data.itemsByRecipe.get(r.id) ?? [], data.foodById, r.servings))
                  return (
                    <button key={r.id} className="exrow" onClick={() => pickRecipe(r)}>
                      <span><strong>{r.name}</strong><small>{r.minutes} min · {m.kcal} kcal · {fmt(m.protein)} g proteína</small></span>
                    </button>
                  )
                })}
                {recipes.length === 0 && <p className="muted">Ninguna receta coincide.</p>}
                <button onClick={() => setCreatingRecipe(true)}>+ Crear receta nueva{query.trim() ? ` ("${query.trim()}")` : ''}</button>
              </>
            )}

            {mode === 'alimentos' && (
              <>
                {foods.map((f) => (
                  <div key={f.id} className="foodline">
                    <button className="exrow" onClick={() => pickFood(f)}>
                      <span><strong>{f.name}{f.estimated ? ' · estimado' : ''}</strong><small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína</small></span>
                    </button>
                    <button className="link small" onClick={() => void disableFood(f)}>Deshabilitar</button>
                  </div>
                ))}
                {foods.length === 0 && <p className="muted">Ningún alimento coincide.</p>}
                <button onClick={() => { setNewName(query.trim()); setMode('etiqueta') }}>+ Crear un alimento nuevo{query.trim() ? ` ("${query.trim()}")` : ''}</button>
              </>
            )}

            {mode === 'etiqueta' && <NewFoodForm data={data} initialName={newName} onCreated={useNewFood} onUse={pickFood} />}

            {mode === 'rapido' && (
              <section className="card">
                <p className="muted">Para lo que no está en la lista. Calorías y proteína bastan; el resto es opcional.</p>
                <label>Qué comiste<input value={qLabel} onChange={(e) => setQLabel(e.target.value)} /></label>
                <div className="row">
                  <label style={{ flex: 1 }}>Calorías<input inputMode="numeric" value={qKcal} onChange={(e) => setQKcal(e.target.value)} /></label>
                  <label style={{ flex: 1 }}>Proteína (g)<input inputMode="decimal" value={qProtein} onChange={(e) => setQProtein(e.target.value)} /></label>
                </div>
                <div className="row">
                  <label style={{ flex: 1 }}>Carbohidratos (g)<input inputMode="decimal" placeholder="opcional" value={qCarbs} onChange={(e) => setQCarbs(e.target.value)} /></label>
                  <label style={{ flex: 1 }}>Grasa (g)<input inputMode="decimal" placeholder="opcional" value={qFat} onChange={(e) => setQFat(e.target.value)} /></label>
                </div>
                <label>Nota (opcional)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
                <label className="check-row">
                  <input type="checkbox" checked={qEstimated} onChange={(e) => setQEstimated(e.target.checked)} />
                  <span>Son valores estimados (no los pesé ni los leí en una etiqueta)</span>
                </label>
                {err && <p className="err">{err}</p>}
                <button className="primary" disabled={saving} onClick={saveQuick}>Registrar</button>
              </section>
            )}
          </>
        )}

        {composing && (
          <section className="card">
            {editEntry?.photo_path && <p className="muted">Este registro tiene foto: mírala en la lista del día mientras completas los ingredientes.</p>}
            <label>Nombre<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Cena de huevos y atún" /></label>

            {base.length > 0 && (
              <>
                <div className="chips">
                  <button className={`chip ${qtyMode === 'raciones' ? 'on' : ''}`} onClick={() => setQtyMode('raciones')}>Por raciones</button>
                  <button className={`chip ${qtyMode === 'peso' ? 'on' : ''}`} onClick={() => setQtyMode('peso')} disabled={!recipeObj}>Por peso</button>
                </div>
                {qtyMode === 'raciones' ? (
                  <>
                    <p className="muted">
                      {wholeRecipe ? 'Qué parte comiste (1 = todo): estímalo a ojo, por ejemplo un cuarto o la mitad.' : 'Raciones (reescala todo lo que comiste)'}
                    </p>
                    <div className="chips">
                      {quantityChips.map(([value, label]) => (
                        <button key={value} className={`chip ${parseAmount(mult) === Number(value) ? 'on' : ''}`} onClick={() => applyMult(value)}>{label}</button>
                      ))}
                      <input style={{ width: 86 }} inputMode="decimal" value={mult} onChange={(e) => applyMult(e.target.value)} aria-label="Otra cantidad de raciones" placeholder="otra" />
                    </div>
                  </>
                ) : (
                  <>
                    <label>Peso de lo que comiste (g)<input inputMode="decimal" value={eatenG} onChange={(e) => applyWeight(e.target.value)} placeholder="ej. 180" /></label>
                    {byWeight ? (
                      <p className="muted">
                        = {fmt(byWeight.servings, 2)} raciones, sobre un total de {fmt(byWeight.total.grams)} g {byWeight.total.estimated ? '(estimado a partir de los ingredientes: lo marco como estimado)' : '(pesado)'}.
                      </p>
                    ) : (
                      <p className="muted">
                        {recipeObj && !recipeObj.final_weight_g && weightFactorMissing(recipeObj.method)
                          ? 'Esta receta no tiene peso total y su método no permite estimarlo. Usa raciones, o edita la receta y añade el peso total de lo preparado.'
                          : 'Escribe cuánto pesó lo que comiste.'}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            <IngredientEditor rows={rows} setRows={setRows} data={data} labels={MEAL_LABELS} onAdd={(f) => { if (!label) setLabel(f.name) }} />

            <p>
              <strong>{macros.kcal} kcal</strong> · <strong>{fmt(macros.protein, 1)} g proteína</strong>
              <span className="muted"> · {fmt(macros.carbs, 1)} g carb · {fmt(macros.fat, 1)} g grasa</span>
              {estimatedKcal > 0 && <span className="muted est"> · ≈ {estimatedKcal} kcal estimadas</span>}
            </p>

            <label className="filebtn secondary">
              📷 {photo ? 'Foto lista (cambiar)' : editEntry?.photo_path ? 'Cambiar foto' : 'Añadir foto'}
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPhoto(f) }} />
            </label>

            <label>Nota (opcional: cómo te sentó, molestias…)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>

            <label className="check-row">
              <input type="checkbox" checked={saveRecipe} onChange={(e) => { setSaveRecipe(e.target.checked); if (e.target.checked && !recipeName) setRecipeName(label) }} />
              <span>Guardar como mi receta</span>
            </label>
            {saveRecipe && <label>Nombre de la receta<input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} /></label>}

            {err && <p className="err">{err}</p>}
            <button className="primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : editEntry && editEntry.status === 'pending' ? 'Completar' : editEntry ? 'Guardar cambios' : 'Registrar'}</button>
            {!editEntry && <button className="link" onClick={() => setComposing(false)}>← Elegir otra cosa</button>}
          </section>
        )}
      </div>
    </div>
  )
}
