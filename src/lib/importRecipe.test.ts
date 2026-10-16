import { describe, expect, it } from 'vitest'
import { gramsFor, importedMethod, matchFood, rowsFromImported, type ImportedIngredient } from './importRecipe'
import { rowGrams } from './meal'
import type { Food } from '../types'

const f = (name: string, unit_g: number | null = null, unit_label: string | null = null, unit_plural: string | null = null): Food => ({ id: name, name, kcal: 100, protein: 10, carbs: 10, fat: 5, unit_g, unit_label, unit_plural, estimated: false, disabled: false })
const foods = [
  f('Huevo entero', 55, 'huevo', 'huevos'),
  f('Harina de trigo', 10, 'cucharada', 'cucharadas'),
  f('Plátano', 120, 'plátano', 'plátanos'),
  f('Aceite de oliva', 12, 'cucharada', 'cucharadas'),
  f('Azúcar', 5, 'cucharadita', 'cucharaditas'),
  f('Leche condensada', 20, 'cucharada', 'cucharadas'),
  f('Especias, sal y hierbas', 1, 'pizca', 'pizcas'),
  f('Pechuga de pollo cruda'),
  f('Muslo de pollo crudo (con hueso y piel)', 150, 'muslo', 'muslos'),
]
const ing = (name: string, quantity: number | null, unit: string | null, grams: number | null = null, optional = false): ImportedIngredient => ({ name, quantity, unit, grams, optional })

describe('enlazar con tus alimentos', () => {
  it('nombre exacto, sin tildes ni mayúsculas', () => {
    expect(matchFood('PLATANO', foods)?.name).toBe('Plátano')
    expect(matchFood('aceite de oliva', foods)?.name).toBe('Aceite de oliva')
  })

  it('por palabras clave, en plural y con adjetivos', () => {
    expect(matchFood('huevos', foods)?.name).toBe('Huevo entero')
    expect(matchFood('plátano maduro', foods)?.name).toBe('Plátano')
    expect(matchFood('harina', foods)?.name).toBe('Harina de trigo')
  })

  it('entre varios candidatos elige el más parecido', () => {
    expect(matchFood('pechuga de pollo', foods)?.name).toBe('Pechuga de pollo cruda')
    expect(matchFood('muslo de pollo', foods)?.name).toBe('Muslo de pollo crudo (con hueso y piel)')
  })

  it('sin parecido devuelve null', () => {
    expect(matchFood('levadura química', foods)).toBeNull()
    expect(matchFood('', foods)).toBeNull()
  })
})

describe('gramos de un ingrediente', () => {
  const huevo = foods[0]
  const harina = foods[1]

  it('peso o volumen directo', () => {
    expect(gramsFor(ing('harina', 200, 'g'), harina)).toBe(200)
    expect(gramsFor(ing('harina', 0.5, 'kg'), harina)).toBe(500)
    expect(gramsFor(ing('leche', 250, 'ml'), harina)).toBe(250)
    expect(gramsFor(ing('leche', 1, 'l'), harina)).toBe(1000)
  })

  it('unidades y medidas caseras con el peso de tu alimento', () => {
    expect(gramsFor(ing('huevos', 3, 'unidad'), huevo)).toBe(165)
    expect(gramsFor(ing('harina', 4, 'cucharada'), harina)).toBe(40)
  })

  it('si la unidad no encaja usa la estimación del lector', () => {
    expect(gramsFor(ing('harina', 1, 'taza', 120), harina)).toBe(120)
  })

  it('sin cantidad, al gusto o pizca no hay gramos', () => {
    expect(gramsFor(ing('sal', null, 'al_gusto'), harina)).toBeNull()
    expect(gramsFor(ing('sal', 1, 'pizca'), harina)).toBeNull()
    expect(gramsFor(ing('harina', 1, 'taza', null), harina)).toBeNull()
  })
})

describe('receta completa leída de una foto', () => {
  const imported = [
    ing('huevos', 3, 'unidad'),
    ing('harina de trigo', 200, 'g'),
    ing('plátanos maduros', 3, 'unidad'),
    ing('aceite de oliva', 2, 'cucharada'),
    ing('levadura química', 1, 'cucharadita', 5),
    ing('sal', null, 'al_gusto'),
    ing('canela', null, null),
  ]

  it('separa lo enlazado, lo no encontrado y lo omitido', () => {
    const r = rowsFromImported(imported, foods)
    expect(r.rows).toHaveLength(4)
    expect(r.unmatched).toEqual(['levadura química (1 cucharadita)'])
    expect(r.omitted).toEqual(['sal', 'canela'])
  })

  it('convierte las cantidades a las medidas de tu alimento', () => {
    const r = rowsFromImported(imported, foods)
    const huevos = r.rows.find((x) => x.food_id === 'Huevo entero')!
    expect(huevos).toMatchObject({ amount: '3', unit: 'u' })
    expect(rowGrams(huevos, foods[0])).toBe(165)
    const harina = r.rows.find((x) => x.food_id === 'Harina de trigo')!
    expect(rowGrams(harina, foods[1])).toBe(200)
  })

  it('un ingrediente enlazado pero sin cantidad clara se pide a mano', () => {
    const r = rowsFromImported([ing('harina', 1, 'taza', null)], foods)
    expect(r.rows).toEqual([])
    expect(r.unmatched[0]).toContain('sin cantidad clara')
  })
})

describe('método leído', () => {
  it('traduce los métodos válidos y descarta el resto', () => {
    expect(importedMethod('horno')).toBe('horno')
    expect(importedMethod('sin_cocinar')).toBe('sin_cocinar')
    expect(importedMethod('no_indicado')).toBeNull()
    expect(importedMethod(null)).toBeNull()
  })
})
