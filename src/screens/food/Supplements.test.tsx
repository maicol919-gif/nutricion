import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const { default: Supplements } = await import('./Supplements')

describe('Supplements (render)', () => {
  it('sin datos ofrece anotar suplementos y medicación', () => {
    const html = renderToString(<Supplements date="2026-10-21" />)
    expect(html).toContain('Suplementos y medicación')
  })
})
