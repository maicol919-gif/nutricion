import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/date'
import { KIND_LABEL, KIND_ORDER, groupStock, sinceText, type Kind, type StockItem } from '../../lib/fridge'
import type { FoodData } from '../../lib/useFoodData'

const fmt = (n: number) => String(Math.round(n))
const COLUMNS = 'id,name,kind,made_on,food_id,low,note,grams,pack_g'

/**
 * "En casa": lo que hay en nevera, congelador y despensa. Lo que se compra en paquete lleva cantidad en gramos y se descuenta
 * solo al registrar comidas; el resto solo dice si hay, si queda poco o si se acabó.
 */
export default function Home({ data }: { data: FoodData }) {
  const [items, setItems] = useState<StockItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('nevera')
  const [since, setSince] = useState('')
  const [qty, setQty] = useState('')
  const [fixing, setFixing] = useState<{ id: string; value: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase.from('fridge_items').select(COLUMNS)
    if (error) return setMsg(error.message)
    setItems((rows ?? []).map((r) => ({ ...r, grams: r.grams == null ? null : Number(r.grams), pack_g: r.pack_g == null ? null : Number(r.pack_g) })) as StockItem[])
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
    const g = qty.trim() ? Number(qty.replace(',', '.')) : null
    if (g != null && !(g > 0)) return setMsg('La cantidad tiene que ser un número mayor que 0.')
    const foodId = foodByName.get(n.toLowerCase()) ?? null
    // si ya hay un paquete con cantidad del mismo alimento y lugar, se suma
    const same = g != null && foodId ? items.find((i) => i.food_id === foodId && i.kind === kind && i.grams != null) : undefined
    const { error } = same
      ? await supabase.from('fridge_items').update({ grams: (same.grams ?? 0) + (g ?? 0), pack_g: (same.pack_g ?? same.grams ?? 0) + (g ?? 0), low: false }).eq('id', same.id)
      : await supabase.from('fridge_items').insert({ name: n, kind, made_on: since || null, food_id: foodId, grams: g, pack_g: g })
    if (error) return setMsg(error.message)
    setName('')
    setSince('')
    setQty('')
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

  async function fix(i: StockItem) {
    if (!fixing) return
    const g = Number(fixing.value.replace(',', '.'))
    if (!(g >= 0)) return setMsg('Escribe cuántos gramos quedan.')
    const { error } = g === 0
      ? await supabase.from('fridge_items').delete().eq('id', i.id)
      : await supabase.from('fridge_items').update({ grams: g, pack_g: Math.max(i.pack_g ?? 0, g), low: g <= 0.25 * Math.max(i.pack_g ?? 0, g) }).eq('id', i.id)
    if (error) return setMsg(error.message)
    setFixing(null)
    setMsg(null)
    await load()
  }

  return (
    <>
      <p className="muted">Lo que tienes en casa. Lo que lleva cantidad se descuenta solo al registrar comidas; el resto, márcalo tú.</p>
      {msg && <p className="err">{msg}</p>}
      {loaded && groups.length === 0 && <p className="muted">Todavía no hay nada anotado.</p>}
      {groups.map((g) => (
        <section key={g.kind} className="card">
          <h3>{KIND_LABEL[g.kind]} ({g.items.length})</h3>
          {g.items.map((i) => {
            const meta = [i.grams != null ? `${fmt(i.grams)} g` : '', sinceText(i.made_on, today), i.note].filter(Boolean).join(' · ')
            return (
              <div key={i.id} className="entry">
                <div>
                  <strong>{i.name}</strong>
                  {i.low && <small className="warn-text">Queda poco</small>}
                  {meta && <small className="muted">{meta}</small>}
                  {fixing?.id === i.id && (
                    <div className="row">
                      <input inputMode="decimal" value={fixing.value} onChange={(e) => setFixing({ id: i.id, value: e.target.value })} aria-label="Gramos que quedan" />
                      <button className="primary" onClick={() => fix(i)}>Guardar</button>
                      <button onClick={() => setFixing(null)}>Cancelar</button>
                    </div>
                  )}
                </div>
                <div>
                  {i.grams != null && <button className="link" onClick={() => setFixing({ id: i.id, value: fmt(i.grams ?? 0) })}>Me quedan…</button>}
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
          <label>Qué alimento es
            <input value={name} onChange={(e) => setName(e.target.value)} list="home-foods" placeholder="ej. Filete de pechuga de pollo" />
            <datalist id="home-foods">{data.activeFoods.map((f) => <option key={f.id} value={f.name} />)}</datalist>
          </label>
          <label>Cantidad en gramos (si viene en paquete; el peso está en la etiqueta)
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="ej. 600" />
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
