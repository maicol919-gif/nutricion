/** Producto devuelto por la búsqueda en Open Food Facts (Edge Function find-product). Valores por 100 g. */
export interface FoundProduct {
  code: string
  name: string
  brand: string | null
  quantity: string | null
  serving: string | null
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  sugars: number | null
  fiber: number | null
}

/** ¿Es un código de barras (8 a 14 cifras, con o sin espacios)? */
export function isBarcode(text: string): boolean {
  return /^\d{8,14}$/.test(text.replace(/\s+/g, ''))
}

/** Nombre para guardar: "Gotas de Chocolate (Hacendado)". */
export function productLabel(p: Pick<FoundProduct, 'name' | 'brand'>): string {
  const name = p.name.trim()
  const brand = p.brand?.trim()
  if (!brand || name.toLowerCase().includes(brand.toLowerCase())) return name
  return `${name} (${brand})`
}

const MACRO_KCAL = (p: number, c: number, f: number) => p * 4 + c * 4 + f * 9

/**
 * Avisos sobre un producto de una base colaborativa (puede haber errores de quien lo introdujo):
 * datos que faltan, valores imposibles por 100 g y calorías que no cuadran con los macros.
 */
export function productIssues(p: FoundProduct): string[] {
  const issues: string[] = []
  const { kcal, protein, carbs, fat, sugars } = p
  if (kcal == null) return ['Faltan las calorías.']
  if (protein == null || carbs == null || fat == null) issues.push('Faltan proteína, carbohidratos o grasa: complétalos con la etiqueta.')
  const vals = [protein, carbs, fat, sugars].filter((v): v is number => v != null)
  if (vals.some((v) => v < 0 || v > 100)) issues.push('Hay un valor imposible (más de 100 g por cada 100 g).')
  if (kcal < 0 || kcal > 900) issues.push('Las calorías no son posibles para 100 g de alimento.')
  if (protein != null && carbs != null && fat != null) {
    if (protein + carbs + fat > 105) issues.push('La suma de proteína, carbohidratos y grasa supera los 100 g.')
    const est = MACRO_KCAL(protein, carbs, fat)
    if (Math.abs(est - kcal) > Math.max(40, kcal * 0.25)) issues.push('Las calorías no cuadran con los macros: revisa la etiqueta.')
  }
  if (sugars != null && carbs != null && sugars > carbs + 0.5) issues.push('Los azúcares superan los carbohidratos.')
  return issues
}

/** Número con coma decimal y sin ceros sobrantes, para rellenar un campo de texto. */
export function formatField(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return String(Math.round(n * 10) / 10).replace('.', ',')
}
