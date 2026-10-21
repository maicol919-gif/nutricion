import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/date'
import { KIND_LABEL, KIND_ORDER, groupStock, sinceText, type Kind, type StockItem } from '../../lib/fridge'
import type { FoodData } from '../../lib/useFoodData'

/** "En casa": lo que hay en nevera, congelador y despensa. Sin cantidades: solo qué hay y si queda poco. */
export default function Home({ data }: { data: FoodData }) {
  const [items, setItems] = useState<StockItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('nevera')
  const [since, setSince] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase.from('fridge_items').select('id,name,kind,made_on,food_id,low,note')
    if (error) return setMsg(error.message)
    setItems((rows ?? []) as StockItem[])
    setLoaded(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => groupStock(items), [items])
  const foodByName = useMemo(() => new Map(data.activeFoods.map((f) => [f.name.toLowerCase(), f.id])), [data.activeFoods])

  async function add() {
    const n = name.trim()
    if (!n) return
    const { error } = await supabase.from('fridge_items').insert({ name: n, kind, made_on: since || null, food_id: foodByName.get(n.toLowerCase()) ?? null })
    if (error) return setMsg(error.message)
    setName('')
    setSince('')
    setAdding(false)
    setMsg(null)
    await load()
  }

  async function toggleLow(i: StockItem) {
    const { error } = await supabase.from('fridge_items').update({ low: !i.low }).eq('id', i.id)
    if (error) return setMsg(error.message)
    await load()
  }

  async function finish(i: StockItem) {
    const { error } = await supabase.from('fridge_items').delete().eq('id', i.id)
    if (error) return setMsg(error.message)
    await load()
  }

  return (
    <>
      <p className="muted">Lo que tienes en casa. Marca "Queda poco" o "Se acabó" cuando cambie.</p>
      {msg && <p className="err">{msg}</p>}
      {loaded && groups.length === 0 && <p className="muted">Todavía no hay nada anotado.</p>}
      {groups.map((g) => (
        <section key={g.kind} className="card">
          <h3>{KIND_LABEL[g.kind]} ({g.items.length})</h3>
          {g.items.map((i) => {
            const meta = [sinceText(i.made_on, today), i.note].filter(Boolean).join(' · ')
            return (
              <div key={i.id} className="entry">
                <div>
                  <strong>{i.name}</strong>
                  {i.low && <small className="warn-text">Queda poco</small>}
                  {meta && <small className="muted">{meta}</small>}
                </div>
                <div>
                  <button className="link" onClick={() => toggleLow(i)}>{i.low ? 'Hay de sobra' : 'Queda poco'}</button>
                  <button className="link" onClick={() => finish(i)}>Se acabó</button>
                </div>
              </div>
            )
          })}
        </section>
      ))}
      {adding ? (
        <section className="card">
          <label>Qué es
            <input value={name} onChange={(e) => setName(e.target.value)} list="home-foods" placeholder="ej. Huevos" />
            <datalist id="home-foods">{data.activeFoods.map((f) => <option key={f.id} value={f.name} />)}</datalist>
          </label>
          <label>Dónde
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label>Desde cuándo (opcional)<input type="date" value={since} max={today} onChange={(e) => setSince(e.target.value)} /></label>
          <div className="row">
            <button className="primary" onClick={add} disabled={!name.trim()}>Guardar</button>
            <button onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </section>
      ) : (
        <button className="primary" onClick={() => setAdding(true)}>Añadir a casa</button>
      )}
    </>
  )
}
