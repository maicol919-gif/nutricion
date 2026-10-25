export type SleepKind = 'noche' | 'siesta'

export type WakeReason = 'solo' | 'despertador' | 'ruido'

export const WAKE_LABEL: Record<WakeReason, string> = { solo: 'me desperté solo', despertador: 'con el despertador', ruido: 'por un ruido' }

export interface SleepRow {
  id: string
  date: string
  kind: SleepKind
  start_at: string
  end_at: string
  quality: number | null
  wake_reason?: WakeReason | null
}

const MAX_NAP_MIN = 4 * 60
const MAX_NIGHT_MIN = 16 * 60

const parse = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h > 23 || min > 59 ? null : h * 60 + min
}

const addDay = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface SleepWindow { start: Date; end: Date; minutes: number }

/**
 * Convierte "me dormí a" y "me desperté a" en fechas. El sueño termina en `date`; si la hora de dormir es posterior
 * a la de despertar, empezó el día anterior (una noche normal). Devuelve un texto de error si no cuadra.
 */
export function sleepWindow(date: string, kind: SleepKind, from: string, to: string): SleepWindow | string {
  const a = parse(from)
  const b = parse(to)
  if (a == null || b == null) return 'Escribe las dos horas.'
  if (a === b) return 'La hora de dormir y la de despertar no pueden ser la misma.'
  const startDate = a > b ? addDay(date, -1) : date
  const start = new Date(`${startDate}T${from.padStart(5, '0')}:00`)
  const end = new Date(`${date}T${to.padStart(5, '0')}:00`)
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
  if (kind === 'siesta' && a > b) return 'Una siesta empieza y termina el mismo día. Si fue por la noche, elige "Noche".'
  if (minutes > (kind === 'siesta' ? MAX_NAP_MIN : MAX_NIGHT_MIN)) return kind === 'siesta' ? 'Una siesta de más de 4 h parece una noche: elige "Noche".' : 'Más de 16 h seguidas no parece un sueño.'
  return { start, end, minutes }
}

export const hoursText = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export interface SleepDay { total: number; night: number; nap: number }

/** Suma de un día: noche, siestas y total de las 24 h. */
export function sleepDay(rows: SleepRow[]): SleepDay {
  let night = 0
  let nap = 0
  for (const r of rows) {
    const min = Math.round((new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) / 60000)
    if (r.kind === 'siesta') nap += min
    else night += min
  }
  return { total: night + nap, night, nap }
}
