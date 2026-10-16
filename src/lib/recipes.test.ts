import { describe, expect, it } from 'vitest'
import { methodLabel, servingsForWeight, similarRecipes, totalWeight, weightFactor } from './recipes'
import type { Recipe } from '../types'

const recipe = (over: Partial<Recipe> = {}): Recipe => ({ id: 'r', name: 'Pastel de banano', minutes: 50, meal: 'cualquiera', steps: '', tags: [], servings: 8, final_weight_g: null, method: null, ...over })
const items = [{ grams: 500 }, { grams: 300 }] // 800 g de ingredientes

describe('factor de peso por método', () => {
  it('solo hay estimación donde existe una base', () => {
    expect(weightFactor('horno')).toBe(0.9)
    expect(weightFactor('microondas')).toBe(0.85)
    expect(weightFactor('sin_cocinar')).toBe(1)
    expect(weightFactor('sarten')).toBeNull()
    expect(weightFactor('olla')).toBeNull()
    expect(weightFactor('plancha')).toBeNull()
    expect(weightFactor(null)).toBeNull()
  })

  it('etiquetas legibles', () => {
    expect(methodLabel('horno')).toBe('Horno')
    expect(methodLabel(null)).toBe('')
  })
})

describe('peso total de lo preparado', () => {
  it('el peso pesado manda y no es estimado', () => {
    expect(totalWeight(recipe({ final_weight_g: 700, method: 'horno' }), items)).toEqual({ grams: 700, estimated: false })
  })

  it('sin pesar, el horno resta un 10 % a los ingredientes y se marca estimado', () => {
    expect(totalWeight(recipe({ method: 'horno' }), items)).toEqual({ grams: 720, estimated: true })
  })

  it('sin pesar y sin método fiable no se estima', () => {
    expect(totalWeight(recipe({ method: 'sarten' }), items)).toBeNull()
    expect(totalWeight(recipe({ method: null }), items)).toBeNull()
  })

  it('sin ingredientes no hay peso', () => {
    expect(totalWeight(recipe({ method: 'horno' }), [])).toBeNull()
  })
})

describe('raciones a partir de un peso comido', () => {
  it('200 g de un pastel pesado de 800 g con 8 raciones son 2 raciones', () => {
    const r = servingsForWeight(200, recipe({ final_weight_g: 800 }), items)!
    expect(r.servings).toBe(2)
    expect(r.total.estimated).toBe(false)
  })

  it('con el peso estimado (720 g) 180 g son 2 raciones y se marca estimado', () => {
    const r = servingsForWeight(180, recipe({ method: 'horno' }), items)!
    expect(r.servings).toBeCloseTo(2, 10)
    expect(r.total.estimated).toBe(true)
  })

  it('peso comido inválido o sin peso total posible devuelve null', () => {
    expect(servingsForWeight(0, recipe({ final_weight_g: 800 }), items)).toBeNull()
    expect(servingsForWeight(-5, recipe({ final_weight_g: 800 }), items)).toBeNull()
    expect(servingsForWeight(100, recipe({ method: 'olla' }), items)).toBeNull()
  })

  it('con una sola ración, el peso comido es la fracción del total', () => {
    const r = servingsForWeight(100, recipe({ servings: 1, final_weight_g: 400 }), items)!
    expect(r.servings).toBe(0.25)
  })
})

describe('recetas parecidas', () => {
  const list = [recipe({ id: 'a', name: 'Pastel de banano' }), recipe({ id: 'b', name: 'Pastel de coco proteico' }), recipe({ id: 'c', name: 'Wok de pollo' })]

  it('encuentra por palabra clave, la más parecida primero', () => {
    expect(similarRecipes('Pastel de banano con nueces', list).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('puede excluir la receta que se está editando', () => {
    expect(similarRecipes('Pastel de banano con nueces', list, 'a').map((r) => r.id)).toEqual(['b'])
  })

  it('un nombre sin parecidos no devuelve nada', () => {
    expect(similarRecipes('Ensalada', list)).toEqual([])
  })
})
