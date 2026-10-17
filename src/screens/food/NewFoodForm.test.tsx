import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { FoodData } from '../../lib/useFoodData'
import type { Food } from '../../types'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const { default: NewFoodForm } = await import('./NewFoodForm')

const muslo: Food = { id: 'm', name: 'Muslo de pollo crudo (con hueso y piel)', kcal: 166, protein: 12.4, carbs: 0.2, fat: 12.5, unit_g: 150, unit_label: 'muslo', unit_plural: 'muslos', estimated: true, disabled: false }
const data: FoodData = { foods: [muslo], activeFoods: [muslo], recipes: [], items: [], foodById: new Map([[muslo.id, muslo]]), itemsByRecipe: new Map(), reload: async () => {} }

describe('NewFoodForm (render)', () => {
  it('muestra los campos de un alimento nuevo', () => {
    const html = renderToString(<NewFoodForm data={data} onCreated={() => {}} />)
    expect(html).toContain('Producto')
    expect(html).toContain('por 100 g')
    expect(html).toContain('Valores aproximados')
    expect(html).toContain('Guardar y usar')
  })

  it('con un nombre parecido avisa y cambia el botón', () => {
    const html = renderToString(<NewFoodForm data={data} initialName="muslo asado" onCreated={() => {}} onUse={() => {}} />)
    expect(html).toContain('un alimento parecido')
    expect(html).toContain('Muslo de pollo crudo')
    expect(html).toContain('Crear de todos modos y usar')
  })

  it('ofrece cancelar solo cuando se pasa la acción', () => {
    expect(renderToString(<NewFoodForm data={data} onCreated={() => {}} />)).not.toContain('Cancelar')
    expect(renderToString(<NewFoodForm data={data} onCreated={() => {}} onCancel={() => {}} />)).toContain('Cancelar')
  })
})
