import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FoodData } from '../../lib/useFoodData'
import type { Method, Recipe } from '../../types'
import { roundMacros, scaleMacros } from '../../lib/nutrition'
import { parseAmount, rowsFromItems, rowsMacros, toStoredItems, type MealRow } from '../../lib/meal'
import { METHODS, similarRecipes, totalWeight, weightFactor } from '../../lib/recipes'
import IngredientEditor from './IngredientEditor'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

interface Props {
  data: FoodData
  /** receta que se edita o se duplica (sin esto, se crea una nueva) */
  recipe?: Recipe | null
  /** true = partir de `recipe` pero guardarla como una receta nueva */
  copy?: boolean
  onSaved: () => void
  onClose: () => void
}

/** Crea una receta con los ingredientes de TODA la preparación y las raciones que salen; luego se registran 1, 1,5, 2… raciones. */
export default function RecipeEditor({ data, recipe = null, copy = false, onSaved, onClose }: Props) {
  const editing = !!recipe && !copy
  const startItems = useMemo(() => (recipe ? (data.itemsByRecipe.get(recipe.id) ?? []).map((i) => ({ food_id: i.food_id, grams: i.grams })) : []), [recipe, data.itemsByRecipe])

  const [name, setName] = useState(recipe ? (copy ? `${recipe.name} (variante)` : recipe.name) : '')
  const [servings, setServings] = useState(recipe ? String(recipe.servings).replace('.', ',') : '1')
  const [minutes, setMinutes] = useState(recipe ? String(recipe.minutes) : '')
  const [steps, setSteps] = useState(recipe?.steps ?? '')
  const [method, setMethod] = useState<Method | ''>(recipe?.method ?? '')
  const [finalWeight, setFinalWeight] = useState(recipe?.final_weight_g ? String(recipe.final_weight_g).replace('.', ',') : '')
  const [rows, setRows] = useState<MealRow[]>(() => rowsFromItems(startItems, data.foodById))
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const n = parseAmount(servings)
  const total = useMemo(() => roundMacros(rowsMacros(rows, data.foodById)), [rows, data.foodById])
  const perServing = useMemo(() => (n > 0 ? roundMacros(scaleMacros(rowsMacros(rows, data.foodById), 1 / n)) : null), [rows, data.foodById, n])
  const items = useMemo(() => toStoredItems(rows, data.foodById), [rows, data.foodById])
  const similar = useMemo(() => (editing ? [] : similarRecipes(name, data.recipes)), [editing, name, data.recipes])
  const fw = parseAmount(finalWeight)
  const estimatedWeight = useMemo(() => (fw > 0 ? null : totalWeight({ final_weight_g: null, method: method || null }, items)), [fw, method, items])

  function close() {
    if (rows.length > 0 && !saving && !window.confirm('Todavía no has guardado esta receta. ¿Descartar lo que escribiste?')) return
    onClose()
  }

  /** Guarda los datos de la receta; `asNew` crea una receta nueva aunque se esté editando una. */
  async function save(asNew: boolean) {
    setErr(null)
    if (!name.trim()) return setErr('Ponle un nombre a la receta.')
    if (items.length === 0) return setErr('Añade al menos un ingrediente con cantidad.')
    if (!(n > 0)) return setErr('Indica cuántas raciones salen (por ejemplo 8).')
    const mins = minutes.trim() ? Math.round(parseAmount(minutes)) : 10
    if (!(mins >= 0)) return setErr('Revisa los minutos.')
    if (finalWeight.trim() && !(fw > 0)) return setErr('El peso total debe ser mayor que cero (en gramos).')
    const fields = {
      name: name.trim(),
      minutes: mins,
      steps: steps.trim(),
      servings: n,
      method: method || null,
      final_weight_g: fw > 0 ? fw : null,
    }
    setSaving(true)
    try {
      if (editing && !asNew && recipe) {
        const up = await supabase.from('recipes').update(fields).eq('id', recipe.id)
        if (up.error) throw new Error(up.error.code === '23505' ? 'Ya tienes otra receta con ese nombre.' : up.error.message)
        const del = await supabase.from('recipe_items').delete().eq('recipe_id', recipe.id)
        if (del.error) throw del.error
        const its = await supabase.from('recipe_items').insert(items.map((v, i) => ({ recipe_id: recipe.id, food_id: v.food_id, grams: v.grams, position: i })))
        if (its.error) throw its.error
      } else {
        const ins = await supabase.from('recipes').insert({ ...fields, meal: recipe?.meal ?? 'cualquiera', tags: recipe ? recipe.tags : ['mía'] }).select('id').single()
        if (ins.error) throw new Error(ins.error.code === '23505' ? 'Ya tienes una receta con ese nombre: cámbiale el nombre para guardarla como nueva.' : ins.error.message)
        const its = await supabase.from('recipe_items').insert(items.map((v, i) => ({ recipe_id: ins.data.id, food_id: v.food_id, grams: v.grams, position: i })))
        if (its.error) {
          await supabase.from('recipes').delete().eq('id', ins.data.id)
          throw its.error
        }
      }
      await data.reload()
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const title = editing ? 'Editar receta' : copy ? 'Duplicar receta' : 'Nueva receta'

  return (
    <div className="overlay" role="dialog" aria-label={title}>
      <div className="overlay-inner">
        <div className="row between">
          <h2>{title}</h2>
          <button onClick={close}>Cerrar</button>
        </div>
        <section className="card">
          <p className="muted">Pon los ingredientes de <strong>toda</strong> la preparación (por ejemplo, el pastel entero) y cuántas raciones salen. Luego, al registrar, eliges 1, 1,5 o 2 raciones, o el peso que comiste.</p>
          {editing && <p className="muted">Al guardar cambios, tus registros anteriores no se modifican.</p>}
          <label>Nombre de la receta<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Pastel de banano" /></label>
          {similar.length > 0 && (
            <div className="card warn">
              <h3>Ya tienes {similar.length === 1 ? 'una receta parecida' : 'recetas parecidas'}</h3>
              <p className="muted">Si es la misma con cambios, mejor edítala en vez de crear otra casi igual. Parecidas: {similar.map((r) => r.name).join(' · ')}.</p>
            </div>
          )}
          <div className="row">
            <label style={{ flex: 1 }}>Raciones que salen<input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
            <label style={{ flex: 1 }}>Minutos (opcional)<input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="10" /></label>
          </div>

          <IngredientEditor rows={rows} setRows={setRows} data={data} hint="Cantidades de toda la receta, en cosas que puedas contar (3 huevos, 4 cucharadas de harina…). Lo que suma menos de unas 20 kcal puedes omitirlo." />

          <p>
            <strong>Toda la receta:</strong> {total.kcal} kcal · {fmt(total.protein, 1)} g proteína
            {perServing && n > 0 && (
              <>
                <br />
                <strong>Cada ración (1/{fmt(n, n % 1 === 0 ? 0 : 1)}):</strong> {perServing.kcal} kcal · {fmt(perServing.protein, 1)} g proteína
              </>
            )}
          </p>
          <p className="muted">Si las raciones no son iguales, esto es un promedio: puedes registrar "1,5" o "0,5" raciones para ajustar.</p>

          <h3>Cómo se prepara</h3>
          <label>Método de cocción
            <select value={method} onChange={(e) => setMethod(e.target.value as Method | '')}>
              <option value="">Sin indicar</option>
              {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label>Peso total de lo preparado, ya cocinado (g, opcional)
            <input inputMode="decimal" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} placeholder="ej. 850" />
          </label>
          <p className="muted">
            {fw > 0
              ? 'Con este peso podrás registrar lo que comiste por peso con exactitud.'
              : estimatedWeight
                ? `Sin pesarlo, la app estima ≈ ${fmt(estimatedWeight.grams)} g (ingredientes${method ? ` × ${fmt(weightFactor(method as Method) ?? 1, 2)}` : ''}) y lo marca como estimado.`
                : 'Si no lo pesas y el método no permite estimarlo (fritos, hervidos, plancha), registra por raciones o añade este peso más tarde.'}
          </p>

          <label>Pasos (opcional)<textarea rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Una línea por paso" /></label>

          {err && <p className="err">{err}</p>}
          {editing ? (
            <>
              <button className="primary" disabled={saving} onClick={() => void save(false)}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              <button disabled={saving} onClick={() => void save(true)}>Guardar como receta nueva (cambia el nombre)</button>
            </>
          ) : (
            <button className="primary" disabled={saving} onClick={() => void save(false)}>{saving ? 'Guardando…' : 'Guardar receta'}</button>
          )}
        </section>
      </div>
    </div>
  )
}
