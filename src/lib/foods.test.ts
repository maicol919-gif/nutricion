import { describe, expect, it } from 'vitest'
import { equivalents, foodMatchesQuery, keyWords, matchesQuery, normalize, similarFoods } from './foods'
import type { Food } from '../types'

const food = (name: string): Food => ({ id: name, name, kcal: 100, protein: 10, carbs: 0, fat: 5, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })
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

  it('unifica los sinónimos: banano, guineo y plátano son la misma palabra clave', () => {
    expect(keyWords('banano maduro')).toEqual(['platano', 'maduro'])
    expect(keyWords('Plátano')).toEqual(['platano'])
    expect(keyWords('guineo')).toEqual(['platano'])
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

describe('búsqueda con sinónimos', () => {
  const platano = { ...food('Plátano'), aliases: [] as string[] }
  const patata = { ...food('Patata cocida'), aliases: [] as string[] }
  const cacahuete = { ...food('Crema de cacahuete'), aliases: [] as string[] }
  const guineo = { ...food('Plátano macho'), aliases: ['guineo verde'] }

  it('banano encuentra plátano, y papa encuentra patata', () => {
    expect(foodMatchesQuery(platano, 'banano')).toBe(true)
    expect(foodMatchesQuery(platano, 'BANANO maduro')).toBe(true)
    expect(foodMatchesQuery(patata, 'papa')).toBe(true)
    expect(foodMatchesQuery(patata, 'papas')).toBe(true)
    expect(foodMatchesQuery(cacahuete, 'maní')).toBe(true)
  })

  it('lo que no es sinónimo no coincide', () => {
    expect(foodMatchesQuery(platano, 'patata')).toBe(false)
    expect(foodMatchesQuery(patata, 'banano')).toBe(false)
  })

  it('coincide al escribir solo una parte de la palabra', () => {
    expect(foodMatchesQuery(platano, 'plat')).toBe(true)
    expect(foodMatchesQuery(patata, 'pata')).toBe(true)
  })

  it('usa también los otros nombres que puso el usuario', () => {
    expect(foodMatchesQuery(guineo, 'guineo')).toBe(true)
    expect(foodMatchesQuery({ ...patata, aliases: ['tubérculo'] }, 'tuberculo')).toBe(true)
  })

  it('una búsqueda vacía coincide con todo; todas las palabras deben coincidir', () => {
    expect(foodMatchesQuery(platano, '')).toBe(true)
    expect(matchesQuery('Pollo con arroz', 'pollo arroz')).toBe(true)
    expect(matchesQuery('Pollo con arroz', 'pollo pasta')).toBe(false)
  })

  it('torta y bizcocho son lo mismo al buscar recetas', () => {
    expect(matchesQuery('Bizcocho casero', 'torta')).toBe(true)
  })

  it('equivalents devuelve el grupo completo', () => {
    expect(equivalents('banano')).toEqual(expect.arrayContaining(['banano', 'platano', 'guineo']))
    expect(equivalents('queso')).toEqual(['queso'])
  })
})

describe('parecidos con sinónimos', () => {
  it('"Banano maduro" avisa de que ya existe Plátano', () => {
    const lista = [{ ...food('Plátano'), aliases: [] as string[] }, { ...food('Arroz cocido'), aliases: [] as string[] }]
    expect(similarFoods('Banano maduro', lista).map((f) => f.name)).toEqual(['Plátano'])
  })

  it('los otros nombres cuentan para los parecidos', () => {
    const lista = [{ ...food('Muslo de pollo crudo'), aliases: ['pernil'] }]
    expect(similarFoods('pernil', lista)).toHaveLength(1)
  })
})

