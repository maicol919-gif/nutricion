import { describe, expect, it } from 'vitest'
import { keyWords, normalize, similarFoods } from './foods'
import type { Food } from '../types'

const food = (name: string): Food => ({ id: name, name, kcal: 100, protein: 10, carbs: 0, fat: 5, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false })
const foods = [
  'Muslo de pollo crudo (con hueso y piel)',
  'Pechuga de pollo cocinada',
  'Pechuga de pollo cruda',
  'Plátano',
  'Arroz cocido',
  'Tomates cherry',
  'Tomate triturado',
  'Atún en aceite de oliva (escurrido)',
].map(food)

describe('normalizar y palabras clave', () => {
  it('quita tildes y signos', () => {
    expect(normalize('  Plátano, (Maduro)! ')).toBe('platano maduro')
  })

  it('ignora conectores y estados de preparación', () => {
    expect(keyWords('Muslo asado en horno con piel')).toEqual(['muslo'])
    expect(keyWords('Muslo de pollo crudo (con hueso y piel)')).toEqual(['muslo', 'pollo'])
  })

  it('trata el plural simple como el singular', () => {
    expect(keyWords('Tomates cherry')).toEqual(['tomate', 'cherry'])
  })
})

describe('alimentos parecidos', () => {
  it('"muslo asado" encuentra el muslo crudo con hueso', () => {
    expect(similarFoods('Muslo asado en horno con piel', foods).map((f) => f.name)).toEqual(['Muslo de pollo crudo (con hueso y piel)'])
  })

  it('no distingue tildes ni mayúsculas', () => {
    expect(similarFoods('PLATANO', foods).map((f) => f.name)).toEqual(['Plátano'])
  })

  it('los más parecidos van primero', () => {
    const names = similarFoods('pechuga de pollo', foods).map((f) => f.name)
    expect(names).toContain('Pechuga de pollo cocinada')
    expect(names).toContain('Pechuga de pollo cruda')
    expect(names[0]).not.toBe('Muslo de pollo crudo (con hueso y piel)')
  })

  it('tomate encuentra los dos tomates', () => {
    expect(similarFoods('tomate', foods).map((f) => f.name).sort()).toEqual(['Tomate triturado', 'Tomates cherry'])
  })

  it('un nombre sin parecidos o vacío no devuelve nada', () => {
    expect(similarFoods('Quinoa', foods)).toEqual([])
    expect(similarFoods('   ', foods)).toEqual([])
    expect(similarFoods('con de', foods)).toEqual([])
  })

  it('respeta el máximo', () => {
    const many = Array.from({ length: 10 }, (_, i) => food(`Pollo número ${i}`))
    expect(similarFoods('pollo', many, 3)).toHaveLength(3)
  })
})
