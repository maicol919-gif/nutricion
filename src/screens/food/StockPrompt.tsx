import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface UsedStock { id: string; name: string }

/**
 * Tras registrar una comida: lo que se descontó de En casa y, para lo que no lleva cantidad,
 * "¿se acabó algo?".
 */
export default function StockPrompt({ items, notes = [], onDone }: { items: UsedStock[]; notes?: string[]; onDone: () => void }) {
  const [left, setLeft] = useState(items)
  const [msg, setMsg] = useState<string | null>(null)

  function remove(id: string) {
    const next = left.filter((i) => i.id !== id)
    setLeft(next)
    if (next.length === 0 && notes.length === 0) onDone()
  }

  async function low(i: UsedStock) {
    const { error } = await supabase.from('fridge_items').update({ low: true }).eq('id', i.id)
    if (error) return setMsg(error.message)
    remove(i.id)
  }

  async function finished(i: UsedStock) {
    const { error } = await supabase.from('fridge_items').delete().eq('id', i.id)
    if (error) return setMsg(error.message)
    remove(i.id)
  }

  return (
    <section className="card warn">
      {notes.length > 0 && (
        <>
          <h3>Descontado de En casa</h3>
          {notes.map((n) => <p key={n} className="muted">{n}</p>)}
        </>
      )}
      {left.length > 0 && (
        <>
          <h3>¿Se acabó algo?</h3>
          <p className="muted">Usaste estos alimentos que tienes anotados sin cantidad.</p>
          {msg && <p className="err">{msg}</p>}
          {left.map((i) => (
            <div key={i.id} className="entry">
              <div><strong>{i.name}</strong></div>
              <div>
                <button className="link" onClick={() => low(i)}>Queda poco</button>
                <button className="link" onClick={() => finished(i)}>Se acabó</button>
              </div>
            </div>
          ))}
        </>
      )}
      <button className="link" onClick={onDone}>{left.length > 0 ? 'No, nada' : 'Entendido'}</button>
    </section>
  )
}
