import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const { default: StockPrompt } = await import('./StockPrompt')

describe('StockPrompt (render)', () => {
  it('pregunta si se acabó lo que usaste', () => {
    const html = renderToString(<StockPrompt items={[{ id: '1', name: 'Huevos' }, { id: '2', name: 'Burrata' }]} onDone={() => {}} />)
    expect(html).toContain('¿Se acabó algo?')
    expect(html).toContain('Huevos')
    expect(html).toContain('Burrata')
    expect(html).toContain('Se acabó')
    expect(html).toContain('Queda poco')
    expect(html).toContain('No, nada')
  })
})
