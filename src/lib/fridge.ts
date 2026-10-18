/** Restos cocinados en nevera (≤ 4 °C): 3-4 días (pauta general: Mayo Clinic, USDA). */
export const FRIDGE_WARN_DAYS = 3
export const FRIDGE_MAX_DAYS = 4

export type FridgeState = 'ok' | 'aviso' | 'pasado'

/** Días enteros entre dos fechas ISO (YYYY-MM-DD). */
export function daysSince(madeOn: string, today: string): number {
  const a = new Date(madeOn + 'T00:00:00').getTime()
  const b = new Date(today + 'T00:00:00').getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

export function fridgeState(days: number): FridgeState {
  return days > FRIDGE_MAX_DAYS ? 'pasado' : days >= FRIDGE_WARN_DAYS ? 'aviso' : 'ok'
}

export function fridgeText(days: number): string {
  const age = days === 0 ? 'hecho hoy' : days === 1 ? 'hecho ayer' : `hecho hace ${days} días`
  const state = fridgeState(days)
  if (state === 'pasado') return `${age} · pasó el límite de ${FRIDGE_MAX_DAYS} días: mejor no comerlo`
  if (state === 'aviso') return `${age} · cómelo hoy o congélalo`
  return `${age} · te quedan ${FRIDGE_MAX_DAYS - days} días`
}
