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

  it('muestra lo descontado de En casa', () => {
    const html = renderToString(<StockPrompt items={[]} notes={['Pollo: quedan 450 g', 'York: se acabó']} onDone={() => {}} />)
    expect(html).toContain('Descontado de En casa')
    expect(html).toContain('Pollo: quedan 450 g')
    expect(html).toContain('York: se acabó')
    expect(html).not.toContain('¿Se acabó algo?')
  })
})

