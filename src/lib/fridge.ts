/** Restos cocinados en nevera (≤ 4 °C): 3-4 días (pauta general: Mayo Clinic, USDA). */
export const FRIDGE_WARN_DAYS = 3
export const FRIDGE_MAX_DAYS = 4
/** Congelador (-18 °C): seguro indefinidamente; la calidad baja, así que se avisa a los ~2 meses (orientativo). */
export const FREEZER_WARN_DAYS = 60

export type Kind = 'nevera' | 'congelador' | 'despensa'
export type FridgeState = 'ok' | 'aviso' | 'pasado'

/** Días enteros entre dos fechas ISO (YYYY-MM-DD). */
export function daysSince(madeOn: string, today: string): number {
  const a = new Date(madeOn + 'T00:00:00').getTime()
  const b = new Date(today + 'T00:00:00').getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

export function fridgeState(days: number, kind: Kind = 'nevera'): FridgeState {
  if (kind === 'despensa') return 'ok'
  if (kind === 'congelador') return days >= FREEZER_WARN_DAYS ? 'aviso' : 'ok'
  return days > FRIDGE_MAX_DAYS ? 'pasado' : days >= FRIDGE_WARN_DAYS ? 'aviso' : 'ok'
}

export function fridgeText(days: number, kind: Kind = 'nevera'): string {
  if (kind === 'despensa') return ''
  if (kind === 'congelador') {
    const age = days === 0 ? 'congelado hoy' : days === 1 ? 'congelado ayer' : `congelado hace ${days} días`
    return days >= FREEZER_WARN_DAYS ? `${age} · llevan ya 2 meses: cómelo pronto, pierde calidad` : `${age} · se conserva bien ≈ 2 meses`
  }
  const age = days === 0 ? 'hecho hoy' : days === 1 ? 'hecho ayer' : `hecho hace ${days} días`
  const state = fridgeState(days)
  if (state === 'pasado') return `${age} · pasó el límite de ${FRIDGE_MAX_DAYS} días: mejor no comerlo`
  if (state === 'aviso') return `${age} · cómelo hoy o congélalo`
  return `${age} · te quedan ${FRIDGE_MAX_DAYS - days} días`
}

export const KIND_LABEL: Record<Kind, string> = { nevera: 'Nevera', congelador: 'Congelador', despensa: 'Despensa' }
export const KIND_ORDER: Kind[] = ['nevera', 'congelador', 'despensa']

export interface StockItem {
  id: string
  name: string
  kind: Kind
  made_on: string | null
  food_id: string | null
  low: boolean
  note: string | null
}

/** Agrupa lo que hay en casa por lugar (nevera, congelador, despensa); dentro de cada uno, primero lo que queda poco y luego por nombre. */
export function groupStock(items: StockItem[]): { kind: Kind; items: StockItem[] }[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    items: items.filter((i) => i.kind === kind).sort((a, b) => Number(b.low) - Number(a.low) || a.name.localeCompare(b.name, 'es')),
  })).filter((g) => g.items.length > 0)
}

/** "desde hoy" / "desde hace 3 días"; vacío si no se sabe desde cuándo. */
export function sinceText(madeOn: string | null, today: string): string {
  if (!madeOn) return ''
  const d = daysSince(madeOn, today)
  return d === 0 ? 'desde hoy' : d === 1 ? 'desde ayer' : `desde hace ${d} días`
}
