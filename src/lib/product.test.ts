import { describe, expect, it } from 'vitest'
import { formatField, isBarcode, productIssues, productLabel, type FoundProduct } from './product'

const base: FoundProduct = { code: '8480000121509', name: 'Gotas de Chocolate', brand: 'Hacendado', quantity: '250 g', serving: null, kcal: 501, protein: 6, carbs: 59, fat: 25, sugars: 55, fiber: 7.6 }

describe('códigos de barras', () => {
  it('reconoce de 8 a 14 cifras, con o sin espacios', () => {
    expect(isBarcode('8480000121509')).toBe(true)
    expect(isBarcode('848 0000 121509')).toBe(true)
    expect(isBarcode('12345678')).toBe(true)
  })

  it('no confunde un nombre ni un número corto', () => {
    expect(isBarcode('gotas de chocolate')).toBe(false)
    expect(isBarcode('1234567')).toBe(false)
    expect(isBarcode('123456789012345')).toBe(false)
    expect(isBarcode('84800001215O9')).toBe(false)
  })
})

describe('nombre del producto', () => {
  it('añade la marca entre paréntesis', () => {
    expect(productLabel(base)).toBe('Gotas de Chocolate (Hacendado)')
  })

  it('no repite la marca si ya está en el nombre ni añade paréntesis vacíos', () => {
    expect(productLabel({ name: 'Yogur soja chocolate - Hacendado', brand: 'Hacendado' })).toBe('Yogur soja chocolate - Hacendado')
    expect(productLabel({ name: 'Yogur griego', brand: null })).toBe('Yogur griego')
  })
})

describe('avisos de una base colaborativa', () => {
  it('el producto de la etiqueta real de Mercadona no tiene avisos', () => {
    expect(productIssues(base)).toEqual([])
  })

  it('detecta el dato imposible de azúcares (300 g por 100 g)', () => {
    const issues = productIssues({ ...base, name: 'Bolinho', kcal: 395, protein: 5, carbs: 47.5, fat: 20, sugars: 300 })
    expect(issues.some((i) => i.includes('imposible'))).toBe(true)
    expect(issues.some((i) => i.includes('azúcares'))).toBe(true)
  })

  it('detecta calorías que no cuadran con los macros', () => {
    const issues = productIssues({ ...base, kcal: 150 })
    expect(issues.some((i) => i.includes('no cuadran'))).toBe(true)
  })

  it('detecta macros que faltan o suman más de 100 g', () => {
    expect(productIssues({ ...base, protein: null })[0]).toContain('Faltan')
    expect(productIssues({ ...base, protein: 40, carbs: 50, fat: 30 }).some((i) => i.includes('supera'))).toBe(true)
  })

  it('todo a cero (dato vacío, como el código de la mermelada de Mercadona) avisa', () => {
    const issues = productIssues({ ...base, name: 'Fresa Morango', kcal: 0, protein: 0, carbs: 0, fat: 0, sugars: null, fiber: null })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('a cero')
  })

  it('sin calorías avisa y no sigue', () => {
    expect(productIssues({ ...base, kcal: null })).toEqual(['Faltan las calorías.'])
  })

  it('el alcohol o la fibra no provocan falsos avisos dentro del margen', () => {
    // cerveza: 43 kcal con 3,6 g de carbohidratos y 0,5 g de proteína (el resto es alcohol): margen de 40 kcal
    expect(productIssues({ ...base, name: 'Cerveza', kcal: 43, protein: 0.5, carbs: 3.6, fat: 0, sugars: 0.3, fiber: 0 })).toEqual([])
  })
})

describe('campos de texto', () => {
  it('usa coma decimal y un decimal como máximo', () => {
    expect(formatField(7.6)).toBe('7,6')
    expect(formatField(501)).toBe('501')
    expect(formatField(0.04)).toBe('0')
    expect(formatField(null)).toBe('')
  })
})
