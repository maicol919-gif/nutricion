import type { Food } from '../types'

export interface Supp {
  id: string
  date: string
  /** momento exacto (ISO) */
  taken_at: string
  name: string
  dose: string | null
  caffeine_mg: number
  note: string | null
}

/** Límites orientativos de la EFSA para adultos sanos: 400 mg al día y 200 mg de una sola vez. */
export const CAFFEINE_DAY_MAX = 400
export const CAFFEINE_DOSE_MAX = 200
/** Vida media aproximada de la cafeína (entre 3 y 7 h según la persona). */
export const CAFFEINE_HALF_LIFE_H = 5
/** Hora a la que suele dormirse (de momento fija). */
export const BEDTIME = '23:30'

export const caffeineTotal = (entries: Supp[]): number => entries.reduce((s, e) => s + e.caffeine_mg, 0)

/** Cafeína que queda en el cuerpo a una hora dada, con una vida media de 5 h (aproximado). */
export function caffeineLeftAt(entries: Supp[], at: Date): number {
  let left = 0
  for (const e of entries) {
    const hours = (at.getTime() - new Date(e.taken_at).getTime()) / 3600000
    if (e.caffeine_mg > 0 && hours >= 0) left += e.caffeine_mg * Math.pow(0.5, hours / CAFFEINE_HALF_LIFE_H)
  }
  return left
}

export interface CaffeineStatus {
  total: number
  /** más de 400 mg en el día */
  overDay: boolean
  /** alguna toma de más de 200 mg */
  bigDose: boolean
  /** mg estimados que quedarían a la hora de dormir */
  atBedtime: number
}

/** Resumen de la cafeína de un día; `date` es el día (YYYY-MM-DD) para calcular la hora de dormir. */
export function caffeineStatus(entries: Supp[], date: string, bedtime = BEDTIME): CaffeineStatus {
  const total = caffeineTotal(entries)
  return {
    total,
    overDay: total > CAFFEINE_DAY_MAX,
    bigDose: entries.some((e) => e.caffeine_mg > CAFFEINE_DOSE_MAX),
    atBedtime: caffeineLeftAt(entries, new Date(`${date}T${bedtime}:00`)),
  }
}

/** Lo último que tomaste, sin repetir nombre: sirve para volver a anotarlo con un toque. */
export function recentDistinct(entries: Supp[], max = 4): Supp[] {
  const seen = new Set<string>()
  const out: Supp[] = []
  for (const e of [...entries].sort((a, b) => b.taken_at.localeCompare(a.taken_at))) {
    const k = e.name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
    if (out.length >= max) break
  }
  return out
}

export interface LoggedFood { created_at: string; items: { food_id: string; grams: number }[] | null }

/** La cafeína que viene en lo que comiste (café, cola, chocolate…): una entrada por alimento, a la hora en que se registró la comida. */
export function caffeineFromMeals(meals: LoggedFood[], foodById: Map<string, Food>): Supp[] {
  const out: Supp[] = []
  meals.forEach((m, mi) => {
    ;(m.items ?? []).forEach((it, ii) => {
      const food = foodById.get(it.food_id)
      const mg = food?.caffeine_mg ? (food.caffeine_mg * Number(it.grams)) / 100 : 0
      if (food && mg > 0) out.push({ id: `meal-${mi}-${ii}`, date: m.created_at.slice(0, 10), taken_at: m.created_at, name: food.name, dose: `${Math.round(Number(it.grams))} g`, caffeine_mg: mg, note: 'En tus comidas' })
    })
  })
  return out
}
