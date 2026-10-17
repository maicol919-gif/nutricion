import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FoodData } from '../../lib/useFoodData'
import type { Food } from '../../types'
import { similarFoods } from '../../lib/foods'
import { labelToPer100 } from '../../lib/nutrition'
import { parseAmount } from '../../lib/meal'
import SimilarFoods from './SimilarFoods'
import ProductSearch from './ProductSearch'
import { formatField, productIssues, productLabel, type FoundProduct } from '../../lib/product'

interface Props {
  data: FoodData
  initialName?: string
  /** se llama con el alimento ya guardado */
  onCreated: (f: Food) => void
  /** se llama si el usuario prefiere usar un alimento parecido que ya existe */
  onUse?: (f: Food) => void
  onCancel?: () => void
  intro?: string
}

/** Formulario para crear un alimento nuevo: valores por 100 g o por unidad (como en una etiqueta), con aviso de parecidos. */
export default function NewFoodForm({ data, initialName = '', onCreated, onUse, onCancel, intro }: Props) {
  const [name, setName] = useState(initialName)
  const [basis, setBasis] = useState<'100g' | 'unit'>('100g')
  const [unitG, setUnitG] = useState('')
  const [unitName, setUnitName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [estimated, setEstimated] = useState(false)
  const [mUnitG, setMUnitG] = useState('')
  const [mName, setMName] = useState('')
  const [mPlural, setMPlural] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fromProduct, setFromProduct] = useState<FoundProduct | null>(null)

  /** Rellena el formulario con un producto de Open Food Facts (siempre por 100 g); el usuario revisa y guarda. */
  function fill(p: FoundProduct) {
    setFromProduct(p)
    setName(productLabel(p))
    setBasis('100g')
    setKcal(formatField(p.kcal))
    setProtein(formatField(p.protein))
    setCarbs(formatField(p.carbs))
    setFat(formatField(p.fat))
    setEstimated(false)
    setErr(null)
  }

  const similar = useMemo(() => similarFoods(name, data.activeFoods), [name, data.activeFoods])

  async function save() {
    setErr(null)
    const clean = name.trim()
    if (!clean) return setErr('Escribe el nombre.')
    const unitGrams = basis === 'unit' ? parseAmount(unitG) : undefined
    const per100 = labelToPer100({ basis, unitGrams, kcal: parseAmount(kcal), protein: parseAmount(protein || '0'), carbs: parseAmount(carbs || '0'), fat: parseAmount(fat || '0') })
    if (!kcal.trim() || !per100) return setErr(basis === 'unit' && !(unitGrams && unitGrams > 0) ? 'Escribe cuánto pesa una unidad (en gramos).' : 'Revisa las calorías y los demás valores.')
    const measureG = basis === '100g' && mUnitG.trim() ? parseAmount(mUnitG) : undefined
    if (basis === '100g' && mUnitG.trim() && !(measureG && measureG > 0)) return setErr('El peso de la medida debe ser mayor que cero (en gramos).')
    if (measureG && !mName.trim()) return setErr('Ponle nombre a la medida (por ejemplo rebanada).')
    const finalUnitG = unitGrams ?? measureG
    const label = basis === 'unit' ? unitName.trim() || 'unidad' : mName.trim()
    const plural = basis === 'unit' ? (label === 'unidad' ? 'unidades' : label) : mPlural.trim() || label
    const r1 = (n: number) => Math.round(n * 10) / 10
    setSaving(true)
    const { data: row, error } = await supabase
      .from('foods')
      .insert({
        name: clean,
        kcal: r1(per100.kcal),
        protein: r1(per100.protein),
        carbs: r1(per100.carbs),
        fat: r1(per100.fat),
        unit_g: finalUnitG ?? null,
        unit_label: finalUnitG ? label : null,
        unit_plural: finalUnitG ? plural : null,
        estimated,
      })
      .select('*')
      .single()
    if (error) {
      setSaving(false)
      return setErr(error.code === '23505' ? 'Ya existe un alimento con ese nombre (quizá deshabilitado: habilítalo en Alimentación → Alimentos).' : error.message)
    }
    await data.reload()
    setSaving(false)
    onCreated({ ...row, kcal: Number(row.kcal), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), unit_g: row.unit_g == null ? null : Number(row.unit_g) } as Food)
  }

  return (
    <section className="card">
      <ProductSearch initialQuery={initialName} onPick={fill} />
      {fromProduct && (
        <div className="card warn">
          <h3>Rellenado desde Open Food Facts</h3>
          <p className="muted">Comprueba los valores con la etiqueta de tu producto antes de guardar. La base solo da valores por 100 g: si lo cuentas en rebanadas o unidades, indica abajo cuánto pesa una.</p>
          {productIssues(fromProduct).map((i) => <p key={i} className="est">⚠ {i}</p>)}
        </div>
      )}
      <p className="muted">{intro ?? 'Sirve para productos con etiqueta y para crear un alimento nuevo (muslo, plátano…): escribes los valores una sola vez y queda guardado.'}</p>
      <label>Producto<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Galletas de avena" /></label>
      <SimilarFoods similar={similar} onUse={onUse} />
      <label>Los valores son
        <select value={basis} onChange={(e) => setBasis(e.target.value as '100g' | 'unit')}>
          <option value="100g">por 100 g</option>
          <option value="unit">por unidad (galleta, barrita, lata…)</option>
        </select>
      </label>
      {basis === 'unit' && (
        <div className="row">
          <label style={{ flex: 1 }}>Peso de 1 unidad (g)<input inputMode="decimal" value={unitG} onChange={(e) => setUnitG(e.target.value)} /></label>
          <label style={{ flex: 1 }}>Se llama<input placeholder="galleta" value={unitName} onChange={(e) => setUnitName(e.target.value)} /></label>
        </div>
      )}
      <div className="row">
        <label style={{ flex: 1 }}>Calorías<input inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
        <label style={{ flex: 1 }}>Proteína (g)<input inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} /></label>
      </div>
      <div className="row">
        <label style={{ flex: 1 }}>Carbohidratos (g)<input inputMode="decimal" placeholder="opcional" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></label>
        <label style={{ flex: 1 }}>Grasa (g)<input inputMode="decimal" placeholder="opcional" value={fat} onChange={(e) => setFat(e.target.value)} /></label>
      </div>
      {basis === '100g' && (
        <>
          <h3>¿Cómo lo cuentas? (opcional)</h3>
          <p className="muted">Si lo comes en rebanadas, puñados o unidades, di cuánto pesa una y podrás registrar "2 rebanadas". Si lo dejas vacío, se registra en gramos.</p>
          <div className="row">
            <label style={{ flex: 1 }}>Una pesa (g)<input inputMode="decimal" placeholder="ej. 30" value={mUnitG} onChange={(e) => setMUnitG(e.target.value)} /></label>
            <label style={{ flex: 1 }}>Se llama<input placeholder="rebanada" value={mName} onChange={(e) => setMName(e.target.value)} /></label>
            <label style={{ flex: 1 }}>Plural<input placeholder="rebanadas" value={mPlural} onChange={(e) => setMPlural(e.target.value)} /></label>
          </div>
        </>
      )}
      <label className="check-row">
        <input type="checkbox" checked={estimated} onChange={(e) => setEstimated(e.target.checked)} />
        <span>Valores aproximados (no vienen de una etiqueta)</span>
      </label>
      {err && <p className="err">{err}</p>}
      <button className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : similar.length > 0 ? 'Crear de todos modos y usar' : 'Guardar y usar'}</button>
      {onCancel && <button className="link" onClick={onCancel}>Cancelar</button>}
    </section>
  )
}
