import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/date'
import { daysSince, fridgeState, fridgeText } from '../../lib/fridge'

interface Item { id: string; name: string; made_on: string }

/** Aviso "En la nevera": qué guardaste y desde cuándo, con alerta al llegar a 3 días. */
export default function Fridge() {
  const [items, setItems] = useState<Item[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [madeOn, setMadeOn] = useState(() => toISODate(new Date()))
  const [msg, setMsg] = useState<string | null>(null)
  const today = toISODate(new Date())

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('fridge_items').select('id,name,made_on').order('made_on')
    if (error) return setMsg(error.message)
    setItems((data ?? []) as Item[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function add() {
    if (!name.trim()) return
    const { error } = await supabase.from('fridge_items').insert({ name: name.trim(), made_on: madeOn })
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

  if (items.length === 0 && !adding) return <button className="link" onClick={() => setAdding(true)}>+ Guardé algo en la nevera</button>

  return (
    <section className={`card ${items.some((i) => fridgeState(daysSince(i.made_on, today)) !== 'ok') ? 'warn' : ''}`}>
      <h3>En la nevera</h3>
      {msg && <p className="err">{msg}</p>}
      {items.map((i) => {
        const days = daysSince(i.made_on, today)
        return (
          <div key={i.id} className="entry">
            <div>
              <strong>{i.name}</strong>
              <small className={fridgeState(days) === 'ok' ? 'muted' : 'warn-text'}>{fridgeText(days)}</small>
            </div>
            <button className="link" onClick={() => finish(i.id)}>Terminado</button>
          </div>
        )
      })}
      {adding ? (
        <>
          <label>Qué es<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Pizza hawaiana (2 cuartos)" /></label>
          <label>Hecho el<input type="date" value={madeOn} max={today} onChange={(e) => setMadeOn(e.target.value)} /></label>
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
