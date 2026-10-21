import { describe, expect, it } from 'vitest'
import { zoneOf } from './shopping'

describe('zona del súper', () => {
  it('por el nombre del alimento', () => {
    expect(zoneOf('Tomate triturado')).toBe('Fruta y verdura')
    expect(zoneOf('Pan integral')).toBe('Pan y masas')
    expect(zoneOf('Verdura variada (congelada o microondas)')).toBe('Congelados')
    expect(zoneOf('Queso cottage')).toBe('Nevera')
    expect(zoneOf('Atún en aceite de oliva (escurrido)')).toBe('Despensa')
  })
})
