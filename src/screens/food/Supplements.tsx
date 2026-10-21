import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BEDTIME, CAFFEINE_DAY_MAX, CAFFEINE_DOSE_MAX, caffeineStatus, recentDistinct, type Supp } from '../../lib/supplements'

const COLUMNS = 'id, date, taken_at, name, dose, caffeine_mg, note'
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const clock = (iso: string) => hhmm(new Date(iso))

/** Suplementos y medicación del día: nombre, dosis, cafeína y hora, con la suma de cafeína y lo que queda al dormir. */
export default function Supplements({ date }: { date: string }) {
  const [entries, setEntries] = useState<Supp[]>([])
  const [recent, setRecent] = useState<Supp[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [caffeine, setCaffeine] = useState('')
  const [time, setTime] = useState(() => hhmm(new Date()))
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [day, last] = await Promise.all([
      supabase.from('supplement_log').select(COLUMNS).eq('date', date).order('taken_at'),
      supabase.from('supplement_log').select(COLUMNS).order('taken_at', { ascending: false }).limit(40),
    ])
    if (day.error) return setMsg(day.error.message)
    const norm = (r: Record<string, unknown>) => ({ ...r, caffeine_mg: Number(r.caffeine_mg) }) as Supp
    setEntries((day.data ?? []).map(norm))
    setRecent(recentDistinct((last.data ?? []).map(norm)))
  }, [date])
  useEffect(() => {
    void load()
  }, [load])

  const status = useMemo(() => caffeineStatus(entries, date), [entries, date])

  async function add(n: string, d: string, c: number, t: string) {
    const takenAt = new Date(`${date}T${t || hhmm(new Date())}:00`)
    const { error } = await supabase.from('supplement_log').insert({ date, taken_at: takenAt.toISOString(), name: n.trim(), dose: d.trim() || null, caffeine_mg: c })
    if (error) return setMsg(error.message)
    setMsg(null)
    setName('')
    setDose('')
    setCaffeine('')
    setAdding(false)
    await load()
  }

  async function save() {
    const c = caffeine.trim() ? Number(caffeine.replace(',', '.')) : 0
    if (!(c >= 0)) return setMsg('La cafeína tiene que ser un número de mg (o déjalo vacío).')
    await add(name, dose, c, time)
  }

  async function remove(id: string) {
    const { error } = await supabase.from('supplement_log').delete().eq('id', id)
    if (error) return setMsg(error.message)
    await load()
  }

  if (entries.length === 0 && !adding && recent.length === 0) return <button className="link" onClick={() => setAdding(true)}>+ Suplementos y medicación</button>

  return (
    <section className="card">
      <h3>Suplementos y medicación</h3>
      {msg && <p className="err">{msg}</p>}
      {entries.map((e) => (
        <div key={e.id} className="entry">
          <div>
            <strong>{e.name}</strong>
            <small className="muted">{clock(e.taken_at)}{e.dose ? ` · ${e.dose}` : ''}{e.caffeine_mg > 0 ? ` · ${Math.round(e.caffeine_mg)} mg de cafeína` : ''}</small>
          </div>
          <button className="link" onClick={() => remove(e.id)} aria-label={`Quitar ${e.name}`}>✕</button>
        </div>
      ))}
      {status.total > 0 && (
        <p className={status.overDay || status.bigDose ? 'warn-text' : 'muted'}>
          Cafeína de hoy: {Math.round(status.total)} mg (límite orientativo {CAFFEINE_DAY_MAX} mg al día y {CAFFEINE_DOSE_MAX} mg de una vez){status.overDay ? ' · pasas del día' : ''}{status.bigDose ? ' · una toma pasa de 200 mg' : ''}.
          {' '}A las {BEDTIME} te quedarían ≈ {Math.round(status.atBedtime)} mg (aproximado).
        </p>
      )}
      {adding ? (
        <>
          <label>Qué tomaste<input value={name} onChange={(e) => setName(e.target.value)} list="supp-names" placeholder="ej. Normogrip antitusivo" /></label>
          <datalist id="supp-names">{recent.map((r) => <option key={r.id} value={r.name} />)}</datalist>
          <label>Dosis (opcional)<input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ej. 1 sobre" /></label>
          <label>Cafeína en mg (si lleva)<input inputMode="decimal" value={caffeine} onChange={(e) => setCaffeine(e.target.value)} placeholder="ej. 250" /></label>
          <label>Hora<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <div className="row">
            <button className="primary" onClick={save} disabled={!name.trim()}>Guardar</button>
            <button onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          {recent.length > 0 && (
            <p className="muted">Repetir:{' '}
              {recent.map((r) => (
                <button key={r.id} className="link" onClick={() => add(r.name, r.dose ?? '', r.caffeine_mg, hhmm(new Date()))}>{r.name}</button>
              ))}
            </p>
          )}
          <button className="link" onClick={() => { setTime(hhmm(new Date())); setAdding(true) }}>+ Anotar otro</button>
        </>
      )}
    </section>
  )
}
