import { describe, expect, it } from 'vitest'
import { hoursText, sleepDay, sleepWindow, type SleepRow } from './sleep'

describe('sleepWindow', () => {
  it('una noche que cruza la medianoche empieza el día anterior', () => {
    const w = sleepWindow('2026-10-21', 'noche', '23:30', '07:00')
    if (typeof w === 'string') throw new Error(w)
    expect(w.minutes).toBe(450)
    expect(w.start.getDate()).toBe(20)
    expect(w.end.getDate()).toBe(21)
  })

  it('una siesta de la tarde dura lo que dice', () => {
    const w = sleepWindow('2026-10-20', 'siesta', '17:30', '19:30')
    if (typeof w === 'string') throw new Error(w)
    expect(w.minutes).toBe(120)
  })

  it('rechaza horas vacías, iguales o imposibles', () => {
    expect(typeof sleepWindow('2026-10-21', 'noche', '', '07:00')).toBe('string')
    expect(typeof sleepWindow('2026-10-21', 'noche', '07:00', '07:00')).toBe('string')
    expect(typeof sleepWindow('2026-10-21', 'noche', '25:00', '07:00')).toBe('string')
  })

  it('una siesta no cruza la medianoche ni pasa de 4 h', () => {
    expect(typeof sleepWindow('2026-10-21', 'siesta', '23:00', '01:00')).toBe('string')
    expect(typeof sleepWindow('2026-10-21', 'siesta', '10:00', '15:00')).toBe('string')
  })
})

describe('sleepDay y texto', () => {
  const row = (kind: 'noche' | 'siesta', a: string, b: string): SleepRow => ({ id: a, date: '2026-10-21', kind, start_at: a, end_at: b, quality: null })

  it('separa noche y siestas y suma el total de 24 h', () => {
    const d = sleepDay([row('noche', '2026-10-20T23:30:00', '2026-10-21T06:30:00'), row('siesta', '2026-10-21T17:30:00', '2026-10-21T19:30:00')])
    expect(d).toEqual({ total: 540, night: 420, nap: 120 })
  })

  it('escribe las horas', () => {
    expect(hoursText(450)).toBe('7 h 30 min')
    expect(hoursText(120)).toBe('2 h')
  })
})
