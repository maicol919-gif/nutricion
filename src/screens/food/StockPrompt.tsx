import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface UsedStock { id: string; name: string }

/** Tras registrar una comida: "¿se acabó algo?" con lo que usaste y tienes anotado en casa. */
export default function StockPrompt({ items, onDone }: { items: UsedStock[]; onDone: () => void }) {
  const [left, setLeft] = useState(items)
  const [msg, setMsg] = useState<string | null>(null)

  function remove(id: string) {
    const next = left.filter((i) => i.id !== id)
    setLeft(next)
    if (next.length === 0) onDone()
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
      <h3>¿Se acabó algo?</h3>
      <p className="muted">Usaste estos productos que tienes anotados en casa.</p>
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
      <button className="link" onClick={onDone}>No, nada</button>
    </section>
  )
}
