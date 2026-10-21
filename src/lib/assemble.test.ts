import { describe, expect, it } from 'vitest'
import { assemble, roleOf } from './assemble'
import type { Food } from '../types'

const food = (id: string, name: string, kcal: number, protein: number, carbs: number, fat: number): Food => ({ id, name, kcal, protein, carbs, fat, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })

const huevo = food('huevo', 'Huevo entero', 143, 12.6, 0.7, 9.5)
const arroz = food('arroz', 'Arroz cocido', 130, 2.7, 28, 0.3)
const verdura = food('verdura', 'Verdura variada', 35, 2, 6, 0.4)
const pollo = food('pollo', 'Pechuga de pollo cruda', 110, 23, 0, 1.5)
const chocolate = food('choco', 'Gotas de chocolate', 501, 6, 59, 25)
const aceite = food('aceite', 'Aceite de oliva', 884, 0, 0, 100)
const foods = new Map([huevo, arroz, verdura, pollo, chocolate, aceite].map((f) => [f.id, f]))

describe('papel de cada alimento', () => {
  it('proteína, hidrato, verdura y lo que no sirve de base', () => {
    expect(roleOf(pollo)).toBe('proteina')
    expect(roleOf(huevo)).toBe('proteina')
    expect(roleOf(arroz)).toBe('carbo')
    expect(roleOf(verdura)).toBe('verdura')
    expect(roleOf(chocolate)).toBeNull()
    expect(roleOf(food('melon', 'Melón piel de sapo', 34, 0.8, 8.2, 0.2))).toBeNull()
    expect(roleOf(aceite)).toBeNull()
  })
})

describe('comida armada con lo que hay', () => {
  it('con solo arroz y huevo, propone arroz y huevo ajustados al presupuesto', () => {
    const out = assemble('comida', { kcal: 700, protein: 50 }, new Map([['huevo', null], ['arroz', null]]), foods)
    expect(out).toHaveLength(1)
    const names = out[0].parts.map((p) => p.food.name)
    expect(names).toEqual(['Huevo entero', 'Arroz cocido'])
    const egg = out[0].parts.find((p) => p.food.id === 'huevo')!
    expect(egg.grams).toBe(110) // máximo 2 huevos
    // presupuesto de la comida con 700 kcal por cubrir: 700 × 0,35 / 0,75 ≈ 327 kcal
    expect(out[0].kcal).toBeGreaterThan(250)
    expect(out[0].kcal).toBeLessThan(420)
    expect(out[0].notes.join(' ')).toContain('proteína') // dos huevos no llegan a la proteína que toca
  })

  it('usa lo que queda en casa como tope', () => {
    const out = assemble('comida', { kcal: 900, protein: 90 }, new Map([['pollo', 100], ['arroz', null]]), foods)
    const p = out[0].parts.find((x) => x.food.id === 'pollo')!
    expect(p.grams).toBeLessThanOrEqual(100)
  })

  it('propone opciones distintas según la proteína disponible', () => {
    const out = assemble('cena', { kcal: 800, protein: 60 }, new Map([['pollo', null], ['huevo', null], ['arroz', null], ['verdura', null]]), foods)
    expect(out.length).toBe(2)
    expect(out[0].parts.some((p) => p.food.id === 'verdura')).toBe(true)
    expect(new Set(out.map((o) => o.parts[0].food.id)).size).toBe(2)
  })

  it('sin nada utilizable o sin presupuesto no hay propuesta', () => {
    expect(assemble('comida', { kcal: 800, protein: 60 }, new Map([['choco', null], ['aceite', null]]), foods)).toEqual([])
    expect(assemble('comida', { kcal: 20, protein: 2 }, new Map([['arroz', null]]), foods)).toEqual([])
  })
})
