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
  /** gramos que quedan; null si no se lleva cantidad (solo hay / queda poco / se acabó) */
  grams: number | null
  /** gramos con los que empezó, para saber cuándo queda poco */
  pack_g: number | null
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

export interface Used { food_id: string; grams: number }
export interface StockRow { id: string; name: string; food_id: string | null; grams: number | null; pack_g: number | null; low: boolean }

export interface UsageResult {
  /** lo que lleva cantidad y sigue habiendo */
  updates: { id: string; name: string; grams: number; low: boolean }[]
  /** lo que lleva cantidad y se agotó */
  deletes: { id: string; name: string }[]
  /** lo que se usó pero no lleva cantidad: hay que preguntar si se acabó */
  untracked: { id: string; name: string }[]
}

/** Queda poco cuando resta el 25 % o menos de lo que había al empezar. */
export const LOW_FRACTION = 0.25

/** Descuenta lo usado en una comida de lo que hay en casa (los alimentos se enlazan por food_id). */
export function applyUsage(stock: StockRow[], used: Used[]): UsageResult {
  const usedBy = new Map<string, number>()
  for (const u of used) usedBy.set(u.food_id, (usedBy.get(u.food_id) ?? 0) + u.grams)
  const out: UsageResult = { updates: [], deletes: [], untracked: [] }
  const consumed = new Set<string>()
  for (const s of stock) {
    if (!s.food_id || !usedBy.has(s.food_id)) continue
    if (s.grams == null) {
      out.untracked.push({ id: s.id, name: s.name })
      continue
    }
    // si hay varios paquetes del mismo alimento, el primero absorbe lo usado
    if (consumed.has(s.food_id)) continue
    consumed.add(s.food_id)
    const left = s.grams - (usedBy.get(s.food_id) ?? 0)
    if (left <= 0) out.deletes.push({ id: s.id, name: s.name })
    else out.updates.push({ id: s.id, name: s.name, grams: Math.round(left * 10) / 10, low: s.low || left <= LOW_FRACTION * (s.pack_g ?? s.grams) })
  }
  return out
}
