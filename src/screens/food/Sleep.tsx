import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { hoursText, sleepDay, sleepWindow, WAKE_LABEL, type SleepKind, type SleepRow, type WakeReason } from '../../lib/sleep'

const COLUMNS = 'id, date, kind, start_at, end_at, quality, wake_reason'
const clock = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
const DEFAULTS: Record<SleepKind, { from: string; to: string }> = { noche: { from: '23:30', to: '07:00' }, siesta: { from: '', to: '' } }

/** Sueño del día: la noche (que termina ese día) y las siestas, con hora de dormir y de despertar y cómo descansaste. */
export default function Sleep({ date }: { date: string }) {
  const [rows, setRows] = useState<SleepRow[]>([])
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<SleepKind>('noche')
  const [from, setFrom] = useState(DEFAULTS.noche.from)
  const [to, setTo] = useState(DEFAULTS.noche.to)
  const [quality, setQuality] = useState('')
  const [wake, setWake] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('sleep_log').select(COLUMNS).eq('date', date).order('start_at')
    if (error) return setMsg(error.message)
    setRows((data ?? []) as SleepRow[])
  }, [date])
  useEffect(() => {
    void load()
  }, [load])

  const day = useMemo(() => sleepDay(rows), [rows])

  function pick(k: SleepKind) {
    setKind(k)
    setFrom(DEFAULTS[k].from)
    setTo(DEFAULTS[k].to)
    setMsg(null)
  }

  async function save() {
    const w = sleepWindow(date, kind, from, to)
    if (typeof w === 'string') return setMsg(w)
    const { error } = await supabase.from('sleep_log').insert({ date, kind, start_at: w.start.toISOString(), end_at: w.end.toISOString(), quality: quality ? Number(quality) : null, wake_reason: wake || null })
    if (error) return setMsg(error.message)
    setMsg(null)
    setQuality('')
    setWake('')
    setAdding(false)
    await load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('sleep_log').delete().eq('id', id)
    if (error) return setMsg(error.message)
    await load()
  }

  if (rows.length === 0 && !adding) return <button className="link" onClick={() => setAdding(true)}>+ Sueño (noche o siesta)</button>

  return (
    <section className="card">
      <h3>Sueño</h3>
      {msg && <p className="err">{msg}</p>}
      {rows.map((r) => (
        <div key={r.id} className="entry">
          <div>
            <strong>{r.kind === 'siesta' ? 'Siesta' : 'Noche'}</strong>
            <small className="muted">{clock(r.start_at)} → {clock(r.end_at)} · {hoursText(Math.round((new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) / 60000))}{r.quality ? ` · descanso ${r.quality}/5` : ''}{r.wake_reason ? ` · ${WAKE_LABEL[r.wake_reason]}` : ''}</small>
          </div>
          <button className="link" onClick={() => remove(r.id)} aria-label={`Quitar ${r.kind}`}>✕</button>
        </div>
      ))}
      {rows.length > 0 && (
        <p className="muted">Total de 24 h: {hoursText(day.total)}{day.nap > 0 && day.night > 0 ? ` (noche ${hoursText(day.night)} + siestas ${hoursText(day.nap)})` : ''}. Los adultos suelen necesitar entre 7 y 9 h.</p>
      )}
      {adding ? (
        <>
          <label>Tipo
            <select value={kind} onChange={(e) => pick(e.target.value as SleepKind)}>
              <option value="noche">Noche</option>
              <option value="siesta">Siesta</option>
            </select>
          </label>
          <label>Me dormí a las<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Me desperté a las<input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {kind === 'noche' && (
            <label>Cómo descansaste (opcional)
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="">—</option>
                <option value="1">1 · muy mal</option>
                <option value="2">2 · mal</option>
                <option value="3">3 · regular</option>
                <option value="4">4 · bien</option>
                <option value="5">5 · muy bien</option>
              </select>
            </label>
          )}
          {kind === 'noche' && (
            <label>Cómo te despertaste (opcional)
              <select value={wake} onChange={(e) => setWake(e.target.value as WakeReason | '')}>
                <option value="">—</option>
                {(Object.keys(WAKE_LABEL) as WakeReason[]).map((k) => <option key={k} value={k}>{WAKE_LABEL[k][0].toUpperCase() + WAKE_LABEL[k].slice(1)}</option>)}
              </select>
            </label>
          )}
          <p className="muted">Una hora aproximada vale. Se anota en el día en que te despiertas.</p>
          <div className="row">
            <button className="primary" onClick={save} disabled={!from || !to}>Guardar</button>
            <button onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <button className="link" onClick={() => setAdding(true)}>+ Anotar otro</button>
      )}
    </section>
  )
}
