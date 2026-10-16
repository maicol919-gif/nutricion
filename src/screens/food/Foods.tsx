import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FoodData } from '../../lib/useFoodData'
import type { Food } from '../../types'
import { similarFoods } from '../../lib/foods'
import SimilarFoods from './SimilarFoods'

const parse = (s: string): number => Number(s.replace(',', '.'))
const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

interface Form {
  id: string | null
  name: string
  kcal: string
  protein: string
  carbs: string
  fat: string
  unit_g: string
  unit_label: string
  unit_plural: string
  estimated: boolean
}

const EMPTY: Form = { id: null, name: '', kcal: '', protein: '', carbs: '', fat: '', unit_g: '', unit_label: '', unit_plural: '', estimated: false }

function toForm(f: Food): Form {
  return {
    id: f.id,
    name: f.name,
    kcal: String(f.kcal),
    protein: String(f.protein),
    carbs: String(f.carbs),
    fat: String(f.fat),
    unit_g: f.unit_g == null ? '' : String(f.unit_g),
    unit_label: f.unit_label ?? '',
    unit_plural: f.unit_plural ?? '',
    estimated: f.estimated,
  }
}

/** Cuántas recetas y comidas registradas usan un alimento (para saber si se puede borrar de verdad). */
async function countUsage(foodId: string): Promise<{ recipes: number; meals: number } | null> {
  const [r, m1, m2] = await Promise.all([
    supabase.from('recipe_items').select('id', { count: 'exact', head: true }).eq('food_id', foodId),
    supabase.from('meal_log').select('id', { count: 'exact', head: true }).contains('items', [{ food_id: foodId }]),
    supabase.from('meal_log').select('id', { count: 'exact', head: true }).eq('food_id', foodId),
  ])
  // ante cualquier error no se sabe si se usó: devolver null para no ofrecer borrar
  if (r.error || m1.error || m2.error || r.count == null || m1.count == null || m2.count == null) return null
  return { recipes: r.count, meals: m1.count + m2.count }
}

function FoodRow({ f, onOpen }: { f: Food; onOpen: () => void }) {
  return (
    <button className="exrow" onClick={onOpen}>
      <span>
        <strong>{f.name}{f.estimated ? ' · estimado' : ''}</strong>
        <small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} P · {fmt(f.carbs, 1)} C · {fmt(f.fat, 1)} G{f.unit_g ? ` · 1 ${f.unit_label} = ${fmt(f.unit_g)} g` : ''}</small>
      </span>
    </button>
  )
}

export default function Foods({ data }: { data: FoodData }) {
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ recipes: number; meals: number } | null>(null)

  const formId = form?.id ?? null
  useEffect(() => {
    let alive = true
    setUsage(null)
    if (formId) void countUsage(formId).then((u) => alive && setUsage(u))
    return () => {
      alive = false
    }
  }, [formId])

  const q = query.trim().toLowerCase()
  const match = (f: Food) => !q || f.name.toLowerCase().includes(q)
  const list = data.activeFoods.filter(match)
  const disabledList = data.foods.filter((f) => f.disabled && match(f))
  const similar = form && !form.id ? similarFoods(form.name, data.activeFoods) : []
  const current = formId ? data.foodById.get(formId) : undefined

  async function save() {
    if (!form) return
    const kcal = parse(form.kcal)
    const protein = parse(form.protein || '0')
    const carbs = parse(form.carbs || '0')
    const fat = parse(form.fat || '0')
    const unitG = form.unit_g.trim() ? parse(form.unit_g) : null
    if (!form.name.trim()) return setMsg('Escribe el nombre.')
    if (!form.kcal.trim() || ![kcal, protein, carbs, fat].every((n) => n >= 0)) return setMsg('Revisa los valores por 100 g.')
    if (unitG != null && !(unitG > 0)) return setMsg('Los gramos de la medida deben ser mayores que cero.')
    if (unitG != null && !form.unit_label.trim()) return setMsg('Escribe el nombre de la medida (ej. cucharada).')
    const row = {
      name: form.name.trim(),
      kcal,
      protein,
      carbs,
      fat,
      unit_g: unitG,
      unit_label: unitG != null ? form.unit_label.trim() : null,
      unit_plural: unitG != null ? form.unit_plural.trim() || form.unit_label.trim() : null,
      estimated: form.estimated,
    }
    const { error } = form.id ? await supabase.from('foods').update(row).eq('id', form.id) : await supabase.from('foods').insert(row)
    if (error) return setMsg(error.code === '23505' ? 'Ya existe un alimento con ese nombre (puede estar deshabilitado: míralo abajo en "Deshabilitados").' : error.message)
    setMsg('Guardado. Las comidas ya registradas no cambian.')
    setForm(null)
    await data.reload()
  }

  async function setDisabled(disabled: boolean) {
    if (!form?.id) return
    const { error } = await supabase.from('foods').update({ disabled }).eq('id', form.id)
    if (error) return setMsg(error.message)
    setMsg(disabled ? 'Alimento deshabilitado: ya no sale en las búsquedas. Tus comidas anteriores siguen igual y puedes habilitarlo cuando quieras.' : 'Alimento habilitado.')
    setForm(null)
    await data.reload()
  }

  async function remove() {
    if (!form?.id) return
    const { error } = await supabase.from('foods').delete().eq('id', form.id)
    if (error) return setMsg(error.code === '23503' ? 'No se puede borrar: lo usa alguna receta.' : error.message)
    setMsg('Alimento borrado.')
    setForm(null)
    await data.reload()
  }

  const set = (k: Exclude<keyof Form, 'estimated'>) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))

  if (form) {
    const unused = usage != null && usage.recipes === 0 && usage.meals === 0
    return (
      <section className="card">
        <h3>{form.id ? 'Editar alimento' : 'Nuevo alimento'}</h3>
        {current?.disabled && <p className="warn-text">Este alimento está deshabilitado: no sale en las búsquedas, pero tus comidas anteriores lo conservan.</p>}
        <p className="muted">Valores por 100 g, tal como salen en la etiqueta.</p>
        {msg && <p className="err">{msg}</p>}
        <label>Nombre<input value={form.name} onChange={set('name')} /></label>
        <SimilarFoods similar={similar} />
        <div className="row">
          <label style={{ flex: 1 }}>Calorías<input inputMode="decimal" value={form.kcal} onChange={set('kcal')} /></label>
          <label style={{ flex: 1 }}>Proteína (g)<input inputMode="decimal" value={form.protein} onChange={set('protein')} /></label>
        </div>
        <div className="row">
          <label style={{ flex: 1 }}>Carbohidratos (g)<input inputMode="decimal" value={form.carbs} onChange={set('carbs')} /></label>
          <label style={{ flex: 1 }}>Grasa (g)<input inputMode="decimal" value={form.fat} onChange={set('fat')} /></label>
        </div>
        <h3>Medida casera (opcional)</h3>
        <div className="row">
          <label style={{ flex: 1 }}>Gramos de 1<input inputMode="decimal" placeholder="ej. 15" value={form.unit_g} onChange={set('unit_g')} /></label>
          <label style={{ flex: 1 }}>Nombre<input placeholder="cucharada" value={form.unit_label} onChange={set('unit_label')} /></label>
          <label style={{ flex: 1 }}>Plural<input placeholder="cucharadas" value={form.unit_plural} onChange={set('unit_plural')} /></label>
        </div>
        <p className="muted">Consejo: pesa una pieza una sola vez y pon aquí sus gramos; desde entonces registrar "1 unidad" usa tu peso real.</p>
        <label className="check-row">
          <input type="checkbox" checked={form.estimated} onChange={(e) => setForm((f) => (f ? { ...f, estimated: e.target.checked } : f))} />
          <span>Valor estimado (no viene de la etiqueta de tu producto)</span>
        </label>
        <button className="primary" onClick={save}>Guardar</button>
        {form.id && (
          <div className="card">
            <h3>{current?.disabled ? 'Habilitar' : 'Deshabilitar'}</h3>
            <p className="muted">
              {current?.disabled
                ? 'Vuelve a salir en las búsquedas.'
                : 'Deja de salir en las búsquedas, pero tus comidas y recetas que lo usan no cambian. Es reversible.'}
            </p>
            {usage && <p className="muted">Usado en {usage.meals} {usage.meals === 1 ? 'comida registrada' : 'comidas registradas'} y {usage.recipes} {usage.recipes === 1 ? 'receta' : 'recetas'}.</p>}
            <button onClick={() => setDisabled(!current?.disabled)}>{current?.disabled ? 'Habilitar' : 'Deshabilitar'}</button>
            {unused && <button className="link" onClick={remove}>Borrar definitivamente (nunca se usó)</button>}
          </div>
        )}
        <button className="link" onClick={() => { setForm(null); setMsg(null) }}>Cancelar</button>
      </section>
    )
  }

  return (
    <div>
      {msg && <p className={msg.startsWith('No') || msg.startsWith('Ya') ? 'err' : 'ok'}>{msg}</p>}
      <div className="row">
        <input placeholder="Buscar alimento" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={() => { setMsg(null); setForm({ ...EMPTY }) }}>Nuevo</button>
      </div>
      <p className="muted">Toca un alimento para corregir sus valores con la etiqueta de tu marca.</p>
      {list.map((f) => <FoodRow key={f.id} f={f} onOpen={() => { setMsg(null); setForm(toForm(f)) }} />)}
      {disabledList.length > 0 && (
        <details>
          <summary>Deshabilitados ({disabledList.length})</summary>
          {disabledList.map((f) => <FoodRow key={f.id} f={f} onOpen={() => { setMsg(null); setForm(toForm(f)) }} />)}
        </details>
      )}
    </div>
  )
}
