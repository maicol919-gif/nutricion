import { useMemo, useState } from 'react'
import type { FoodData } from '../../lib/useFoodData'
import type { Food } from '../../types'
import { foodMacros } from '../../lib/nutrition'
import { rowGrams, type MealRow } from '../../lib/meal'
import NewFoodForm from './NewFoodForm'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')
let seq = 0
const newKey = (id: string) => `${id}-e${++seq}`

export interface EditorLabels {
  title: string
  addButton: string
  searchPlaceholder: string
  empty: string
}

const RECIPE_LABELS: EditorLabels = {
  title: 'Ingredientes',
  addButton: '+ Añadir ingrediente',
  searchPlaceholder: 'Buscar ingrediente',
  empty: 'Aún no hay ingredientes. Añade el primero.',
}

interface Props {
  rows: MealRow[]
  setRows: (updater: (rows: MealRow[]) => MealRow[]) => void
  data: FoodData
  /** se avisa al añadir un ingrediente (por ejemplo, para poner nombre por defecto) */
  onAdd?: (f: Food) => void
  hint?: string
  /** textos: al registrar son "alimentos"; en una receta son "ingredientes" */
  labels?: EditorLabels
}

/** Lista editable de ingredientes (cantidad en gramos o medida casera, calorías de cada uno) con buscador para añadir más. */
export default function IngredientEditor({ rows, setRows, data, onAdd, hint, labels = RECIPE_LABELS }: Props) {
  const [adding, setAdding] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const addFoods = useMemo(() => {
    const s = addQuery.trim().toLowerCase()
    return data.activeFoods.filter((f) => !s || f.name.toLowerCase().includes(s)).slice(0, 8)
  }, [data.activeFoods, addQuery])

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
    setCreating(false)
    setAddQuery('')
    onAdd?.(f)
  }

  return (
    <>
      <h3>{labels.title}</h3>
      <p className="muted">{hint ?? 'Ajusta lo que usaste, mejor en cosas que puedas contar (1 muslo, 2 huevos, 3 cucharadas). No hace falta apuntar lo que suma menos de unas 20 kcal (ajo, especias, sal, limón): quítalo con la ✕.'}</p>
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
      {rows.length === 0 && <p className="muted">{labels.empty}</p>}

      {adding && creating ? (
        <NewFoodForm
          data={data}
          initialName={addQuery.trim()}
          onCreated={addIngredient}
          onUse={addIngredient}
          onCancel={() => setCreating(false)}
          intro="El alimento no está en tu lista: créalo una vez (valores por 100 g o por unidad) y se añade aquí."
        />
      ) : adding ? (
        <div>
          <input autoFocus placeholder={labels.searchPlaceholder} value={addQuery} onChange={(e) => setAddQuery(e.target.value)} />
          {addFoods.map((f) => (
            <button key={f.id} className="exrow" onClick={() => addIngredient(f)}>
              <span><strong>{f.name}</strong><small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína</small></span>
            </button>
          ))}
          {addFoods.length === 0 && <p className="muted">Ningún alimento coincide.</p>}
          <button onClick={() => setCreating(true)}>+ Crear alimento nuevo{addQuery.trim() ? ` ("${addQuery.trim()}")` : ''}</button>
          <button className="link" onClick={() => setAdding(false)}>Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}>{labels.addButton}</button>
      )}
    </>
  )
}
