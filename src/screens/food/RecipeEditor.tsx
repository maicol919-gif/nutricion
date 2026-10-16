import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FoodData } from '../../lib/useFoodData'
import { roundMacros, scaleMacros } from '../../lib/nutrition'
import { parseAmount, rowsMacros, toStoredItems, type MealRow } from '../../lib/meal'
import IngredientEditor from './IngredientEditor'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

interface Props {
  data: FoodData
  onSaved: () => void
  onClose: () => void
}

/** Crea una receta con los ingredientes de TODA la preparación y las raciones que salen; luego se registran 1, 1,5, 2… raciones. */
export default function RecipeEditor({ data, onSaved, onClose }: Props) {
  const [name, setName] = useState('')
  const [servings, setServings] = useState('1')
  const [minutes, setMinutes] = useState('')
  const [steps, setSteps] = useState('')
  const [rows, setRows] = useState<MealRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const n = parseAmount(servings)
  const total = useMemo(() => roundMacros(rowsMacros(rows, data.foodById)), [rows, data.foodById])
  const perServing = useMemo(() => (n > 0 ? roundMacros(scaleMacros(rowsMacros(rows, data.foodById), 1 / n)) : null), [rows, data.foodById, n])
  const items = useMemo(() => toStoredItems(rows, data.foodById), [rows, data.foodById])

  function close() {
    if (rows.length > 0 && !saving && !window.confirm('Todavía no has guardado esta receta. ¿Descartar lo que escribiste?')) return
    onClose()
  }

  async function save() {
    setErr(null)
    if (!name.trim()) return setErr('Ponle un nombre a la receta.')
    if (items.length === 0) return setErr('Añade al menos un ingrediente con cantidad.')
    if (!(n > 0)) return setErr('Indica cuántas raciones salen (por ejemplo 8).')
    const mins = minutes.trim() ? Math.round(parseAmount(minutes)) : 10
    if (!(mins >= 0)) return setErr('Revisa los minutos.')
    setSaving(true)
    try {
      const ins = await supabase.from('recipes').insert({ name: name.trim(), minutes: mins, meal: 'cualquiera', tags: ['mía'], steps: steps.trim(), servings: n }).select('id').single()
      if (ins.error) throw new Error(ins.error.code === '23505' ? 'Ya tienes una receta con ese nombre.' : ins.error.message)
      const its = await supabase.from('recipe_items').insert(items.map((v, i) => ({ recipe_id: ins.data.id, food_id: v.food_id, grams: v.grams, position: i })))
      if (its.error) {
        await supabase.from('recipes').delete().eq('id', ins.data.id)
        throw its.error
      }
      await data.reload()
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-label="Nueva receta">
      <div className="overlay-inner">
        <div className="row between">
          <h2>Nueva receta</h2>
          <button onClick={close}>Cerrar</button>
        </div>
        <section className="card">
          <p className="muted">Pon los ingredientes de <strong>toda</strong> la preparación (por ejemplo, el pastel entero) y cuántas raciones salen. Luego, al registrar, eliges 1, 1,5 o 2 raciones.</p>
          <label>Nombre de la receta<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Pastel de banano" /></label>
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

          <label>Pasos (opcional)<textarea rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Una línea por paso" /></label>

          {err && <p className="err">{err}</p>}
          <button className="primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar receta'}</button>
        </section>
      </div>
    </div>
  )
}
