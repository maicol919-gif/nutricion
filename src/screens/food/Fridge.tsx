import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/date'
import { daysSince, fridgeState, fridgeText, type Kind } from '../../lib/fridge'

interface Item { id: string; name: string; made_on: string; kind: Kind; grams: number | null }

/** Aviso "En la nevera": qué guardaste y desde cuándo, con alerta al llegar a 3 días. */
export default function Fridge() {
  const [items, setItems] = useState<Item[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('nevera')
  const [madeOn, setMadeOn] = useState(() => toISODate(new Date()))
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('fridge_items').select('id,name,made_on,kind,grams').in('kind', ['nevera', 'congelador']).not('made_on', 'is', null).order('kind').order('made_on')
    if (error) return setMsg(error.message)
    setItems((data ?? []).map((r) => ({ ...r, grams: r.grams == null ? null : Number(r.grams) })) as Item[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function add() {
    if (!name.trim()) return
    const { error } = await supabase.from('fridge_items').insert({ name: name.trim(), made_on: madeOn, kind })
    if (error) return setMsg(error.message)
    setName('')
    setAdding(false)
    setMsg(null)
    await load()
  }

  async function finish(id: string) {
    const { error } = await supabase.from('fridge_items').delete().eq('id', id)
    if (error) return setMsg(error.message)
    await load()
  }

  if (items.length === 0 && !adding) return <button className="link" onClick={() => setAdding(true)}>+ Guardé algo en la nevera o el congelador</button>

  return (
    <section className={`card ${items.some((i) => fridgeState(daysSince(i.made_on, today), i.kind) !== 'ok') ? 'warn' : ''}`}>
      <h3>Nevera y congelador</h3>
      {msg && <p className="err">{msg}</p>}
      {items.map((i) => {
        const days = daysSince(i.made_on, today)
        return (
          <div key={i.id} className="entry">
            <div>
              <strong>{i.kind === 'congelador' ? '❄ ' : ''}{i.name}{i.grams != null ? ` · ${Math.round(i.grams)} g` : ''}</strong>
              <small className={fridgeState(days, i.kind) === 'ok' ? 'muted' : 'warn-text'}>{fridgeText(days, i.kind)}</small>
            </div>
            <button className="link" onClick={() => finish(i.id)}>Terminado</button>
          </div>
        )
      })}
      {adding ? (
        <>
          <label>Qué es<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Pizza hawaiana (2 cuartos)" /></label>
          <label>Dónde
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="nevera">Nevera</option>
              <option value="congelador">Congelador</option>
            </select>
          </label>
          <label>{kind === 'congelador' ? 'Congelado el' : 'Hecho el'}<input type="date" value={madeOn} max={today} onChange={(e) => setMadeOn(e.target.value)} /></label>
          <div className="row">
            <button className="primary" onClick={add} disabled={!name.trim()}>Guardar</button>
            <button onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <button className="link" onClick={() => setAdding(true)}>+ Guardé algo más</button>
      )}
    </section>
  )
}
