import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMealPhoto } from '../../lib/photo'
import type { FoodData } from '../../lib/useFoodData'
import type { Food, MealEntry, MealKey, Recipe } from '../../types'
import { MEALS, foodMacros, labelToPer100, recipeMacros, roundMacros } from '../../lib/nutrition'
import { parseAmount, rowFromGrams, rowGrams, rowsEstimatedKcal, rowsFromItems, rowsMacros, toStoredItems, type MealRow } from '../../lib/meal'

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
  const [label, setLabel] = useState(start.label)
  const [recipeId, setRecipeId] = useState<string | null>(start.recipeId)
  const [adding, setAdding] = useState(false)
  const [addQuery, setAddQuery] = useState('')
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
  const [lName, setLName] = useState('')
  const [lBasis, setLBasis] = useState<'100g' | 'unit'>('100g')
  const [lUnitG, setLUnitG] = useState('')
  const [lUnitName, setLUnitName] = useState('')
  const [lKcal, setLKcal] = useState('')
  const [lProtein, setLProtein] = useState('')
  const [lCarbs, setLCarbs] = useState('')
  const [lFat, setLFat] = useState('')
  const [lEstimated, setLEstimated] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const q = query.trim().toLowerCase()
  const recipes = useMemo(
    () =>
      data.recipes
        .filter((r) => (!q || r.name.toLowerCase().includes(q)) && (maxMin == null || r.minutes <= maxMin))
        .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name)),
    [data.recipes, q, maxMin],
  )
  const foods = useMemo(() => data.foods.filter((f) => !q || f.name.toLowerCase().includes(q)), [data.foods, q])
  const addFoods = useMemo(() => {
    const s = addQuery.trim().toLowerCase()
    return data.foods.filter((f) => !s || f.name.toLowerCase().includes(s)).slice(0, 8)
  }, [data.foods, addQuery])

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

  function applyMult(m: string) {
    setMult(m)
    const k = parseAmount(m)
    if (base.length && k > 0) setRows(rowsFromItems(base, data.foodById, k))
  }

  function updateRow(key: string, patch: Partial<MealRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function changeUnit(row: MealRow, unit: 'g' | 'u') {
    const f = data.foodById.get(row.food_id)
    const g = rowGrams(row, f)
    if (!f || row.unit === unit) return
    const amount = unit === 'u' && f.unit_g ? String(Math.round((g / f.unit_g) * 10) / 10).replace('.', ',') : String(Math.round(g * 10) / 10).replace('.', ',')
    updateRow(row.key, { unit, amount: g > 0 ? amount : '' })
  }

  function addIngredient(f: Food) {
    setRows((rs) => [...rs, f.unit_g ? { key: newKey(f.id), food_id: f.id, amount: '1', unit: 'u' } : { key: newKey(f.id), food_id: f.id, amount: '100', unit: 'g' }])
    setAdding(false)
    setAddQuery('')
    if (!label) setLabel(f.name)
  }

  const macros = useMemo(() => roundMacros(rowsMacros(rows, data.foodById)), [rows, data.foodById])

  /** Cierra la ventana; si hay ingredientes sin guardar, pregunta antes de descartarlos. */
  function close() {
    const unsaved = composing && rows.length > 0 && !saving
    if (unsaved && !window.confirm('Todavía no has registrado esta comida. ¿Descartar lo que escribiste?')) return
    onClose()
  }
  const validRows = useMemo(() => toStoredItems(rows, data.foodById), [rows, data.foodById])
  const estimatedKcal = useMemo(() => Math.round(rowsEstimatedKcal(rows, data.foodById)), [rows, data.foodById])

  async function saveLabelFood() {
    setErr(null)
    const name = lName.trim()
    if (!name) return setErr('Escribe el nombre del producto.')
    const unitGrams = lBasis === 'unit' ? parseAmount(lUnitG) : undefined
    const per100 = labelToPer100({ basis: lBasis, unitGrams, kcal: parseAmount(lKcal), protein: parseAmount(lProtein || '0'), carbs: parseAmount(lCarbs || '0'), fat: parseAmount(lFat || '0') })
    if (!lKcal.trim() || !per100) return setErr(lBasis === 'unit' && !(unitGrams && unitGrams > 0) ? 'Escribe cuánto pesa una unidad (en gramos).' : 'Revisa las calorías y los demás valores.')
    const unitName = lUnitName.trim() || 'unidad'
    setSaving(true)
    const { data: row, error } = await supabase
      .from('foods')
      .insert({
        name,
        kcal: Math.round(per100.kcal * 10) / 10,
        protein: Math.round(per100.protein * 10) / 10,
        carbs: Math.round(per100.carbs * 10) / 10,
        fat: Math.round(per100.fat * 10) / 10,
        unit_g: unitGrams ?? null,
        unit_label: unitGrams ? unitName : null,
        unit_plural: unitGrams ? (unitName === 'unidad' ? 'unidades' : unitName) : null,
        estimated: lEstimated,
      })
      .select('id')
      .single()
    setSaving(false)
    if (error) return setErr(error.code === '23505' ? 'Ya existe un alimento con ese nombre: búscalo en Alimentos.' : error.message)
    await data.reload()
    startFrom({
      rows: [unitGrams ? { key: newKey(row.id), food_id: row.id, amount: '1', unit: 'u' } : { key: newKey(row.id), food_id: row.id, amount: '100', unit: 'g' }],
      base: [],
      label: name,
      recipeId: null,
    })
  }

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
    if (validRows.length === 0) return setErr('Añade al menos un ingrediente con cantidad.')
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
        kcal_estimated: Math.min(macros.kcal, estimatedKcal),
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
    <div className="overlay" role="dialog" aria-label={editEntry ? 'Completar comida' : 'Añadir comida'}>
      <div className="overlay-inner">
        <div className="row between">
          <h2>{editEntry ? (editEntry.status === 'pending' ? 'Completar comida' : 'Editar comida') : 'Añadir comida'}</h2>
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
                    <p className="muted">Repetir una comida reciente (con tus mismas cantidades)</p>
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
              </>
            )}

            {mode === 'alimentos' && (
              <>
                {foods.map((f) => (
                  <button key={f.id} className="exrow" onClick={() => pickFood(f)}>
                    <span><strong>{f.name}{f.estimated ? ' · estimado' : ''}</strong><small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína</small></span>
                  </button>
                ))}
                {foods.length === 0 && <p className="muted">Ningún alimento coincide.</p>}
                <button onClick={() => { setLName(query.trim()); setMode('etiqueta') }}>+ Crear un alimento nuevo{query.trim() ? ` ("${query.trim()}")` : ''}</button>
              </>
            )}

            {mode === 'etiqueta' && (
              <section className="card">
                <p className="muted">Sirve para productos con etiqueta y para crear un alimento nuevo (muslo, plátano…): escribes los valores una sola vez y queda guardado.</p>
                <label>Producto<input value={lName} onChange={(e) => setLName(e.target.value)} placeholder="ej. Galletas de avena" /></label>
                <label>La etiqueta indica los valores
                  <select value={lBasis} onChange={(e) => setLBasis(e.target.value as '100g' | 'unit')}>
                    <option value="100g">por 100 g</option>
                    <option value="unit">por unidad (galleta, barrita, lata…)</option>
                  </select>
                </label>
                {lBasis === 'unit' && (
                  <div className="row">
                    <label style={{ flex: 1 }}>Peso de 1 unidad (g)<input inputMode="decimal" value={lUnitG} onChange={(e) => setLUnitG(e.target.value)} /></label>
                    <label style={{ flex: 1 }}>Se llama<input placeholder="galleta" value={lUnitName} onChange={(e) => setLUnitName(e.target.value)} /></label>
                  </div>
                )}
                <div className="row">
                  <label style={{ flex: 1 }}>Calorías<input inputMode="decimal" value={lKcal} onChange={(e) => setLKcal(e.target.value)} /></label>
                  <label style={{ flex: 1 }}>Proteína (g)<input inputMode="decimal" value={lProtein} onChange={(e) => setLProtein(e.target.value)} /></label>
                </div>
                <div className="row">
                  <label style={{ flex: 1 }}>Carbohidratos (g)<input inputMode="decimal" placeholder="opcional" value={lCarbs} onChange={(e) => setLCarbs(e.target.value)} /></label>
                  <label style={{ flex: 1 }}>Grasa (g)<input inputMode="decimal" placeholder="opcional" value={lFat} onChange={(e) => setLFat(e.target.value)} /></label>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={lEstimated} onChange={(e) => setLEstimated(e.target.checked)} />
                  <span>Valores aproximados (no vienen de una etiqueta)</span>
                </label>
                {err && <p className="err">{err}</p>}
                <button className="primary" disabled={saving} onClick={saveLabelFood}>Guardar y usar</button>
              </section>
            )}

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
            {editEntry?.photo_path && <p className="muted">Esta comida tiene foto: mírala en la lista del día mientras completas los ingredientes.</p>}
            <label>Nombre de la comida<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Cena de huevos y atún" /></label>

            {base.length > 0 && (
              <>
                <p className="muted">Raciones (reescala todos los ingredientes)</p>
                <div className="chips">
                  {['0.5', '1', '1.5', '2'].map((s) => (
                    <button key={s} className={`chip ${mult === s ? 'on' : ''}`} onClick={() => applyMult(s)}>{s.replace('.', ',')}</button>
                  ))}
                </div>
              </>
            )}

            <h3>Ingredientes</h3>
            <p className="muted">Ajusta lo que usaste, mejor en cosas que puedas contar (1 muslo, 2 huevos, 3 cucharadas). No hace falta apuntar lo que suma menos de unas 20 kcal (ajo, especias, sal, limón): quítalo con la ✕.</p>
            {rows.map((r) => {
              const f = data.foodById.get(r.food_id)
              if (!f) return null
              const rowKcal = Math.round(foodMacros(f, rowGrams(r, f)).kcal)
              return (
                <div key={r.key} className="ing">
                  <span className="ing-name">{f.name}{f.estimated && <em className="est"> · estimado</em>}<small className="muted"> · {rowKcal} kcal</small></span>
                  <input inputMode="decimal" value={r.amount} onChange={(e) => updateRow(r.key, { amount: e.target.value })} aria-label={`Cantidad de ${f.name}`} />
                  <select value={r.unit === 'u' && f.unit_g ? 'u' : 'g'} onChange={(e) => changeUnit(r, e.target.value as 'g' | 'u')} aria-label={`Unidad de ${f.name}`}>
                    <option value="g">g</option>
                    {f.unit_g && <option value="u">{f.unit_plural ?? f.unit_label}</option>}
                  </select>
                  <button className="link" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Quitar ${f.name}`}>✕</button>
                </div>
              )
            })}
            {rows.length === 0 && <p className="muted">Aún no hay ingredientes. Añade el primero.</p>}

            {adding ? (
              <div>
                <input autoFocus placeholder="Buscar ingrediente" value={addQuery} onChange={(e) => setAddQuery(e.target.value)} />
                {addFoods.map((f) => (
                  <button key={f.id} className="exrow" onClick={() => addIngredient(f)}>
                    <span><strong>{f.name}</strong><small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína</small></span>
                  </button>
                ))}
                <button className="link" onClick={() => setAdding(false)}>Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)}>+ Añadir ingrediente</button>
            )}

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
