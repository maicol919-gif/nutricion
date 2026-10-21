import { describe, expect, it } from 'vitest'
import { dishKey, habitsFrom, suggestHabits, type PastMeal } from './habits'
import type { Food } from '../types'

const food = (id: string, name: string, kcal: number, protein: number): Food => ({ id, name, kcal, protein, carbs: 0, fat: 0, unit_g: null, unit_label: null, unit_plural: null, estimated: false, disabled: false, aliases: [] })
const pollo = food('pollo', 'Pollo', 110, 23)
const arroz = food('arroz', 'Arroz', 130, 3)
const pan = food('pan', 'Pan', 250, 10)
const foodById = new Map([pollo, arroz, pan].map((f) => [f.id, f]))

const meal = (date: string, m: PastMeal['meal'], label: string, items: PastMeal['items'], recipe_id: string | null = null): PastMeal => ({ date, meal: m, label, recipe_id, items })
const history: PastMeal[] = [
  meal('2026-10-18', 'comida', 'Pollo con arroz', [{ food_id: 'pollo', grams: 150 }, { food_id: 'arroz', grams: 150 }]), // 360 kcal, 38 g
  meal('2026-10-20', 'comida', 'Pollo con arroz', [{ food_id: 'pollo', grams: 200 }, { food_id: 'arroz', grams: 150 }]), // 415 kcal
  meal('2026-10-19', 'desayuno', 'Sándwich', [{ food_id: 'pan', grams: 70 }, { food_id: 'pollo', grams: 120 }]),
  meal('2026-10-19', 'merienda', 'Café', null),
]

describe('platos de siempre', () => {
  it('la clave identifica la receta o el conjunto de alimentos, sin importar el orden', () => {
    expect(dishKey('r1', [])).toBe('recipe:r1')
    expect(dishKey(null, [{ food_id: 'b', grams: 1 }, { food_id: 'a', grams: 2 }])).toBe('foods:a|b')
  })

  it('une los repetidos con la última vez y descarta lo que no tiene detalle', () => {
    const h = habitsFrom(history)
    expect(h).toHaveLength(2)
    const comida = h.find((x) => x.meal === 'comida')!
    expect(comida.lastDate).toBe('2026-10-20')
    expect(comida.items[0].grams).toBe(200)
  })

  const habits = habitsFrom(history)
  const have = new Map<string, number | null>([['pollo', null], ['arroz', null], ['pan', null]])

  it('propone lo que ya comes, escalado a lo que toca y solo en un momento parecido', () => {
    const out = suggestHabits('cena', { kcal: 600, protein: 60 }, habits, have, foodById, new Map(), '2026-10-22')
    expect(out.map((s) => s.habit.label)).toEqual(['Pollo con arroz']) // el sándwich es de desayuno
    // presupuesto de la cena: 600 × 0,30 / 0,40 = 450 kcal; la última vez eran 415: se sube un poco
    expect(out[0].k).toBeGreaterThan(1)
    expect(out[0].kcal).toBeGreaterThan(415)
  })

  it('no propone lo que no tienes en casa, y respeta lo que queda', () => {
    expect(suggestHabits('cena', { kcal: 600, protein: 60 }, habits, new Map([['pollo', null]]), foodById, new Map(), '2026-10-22')).toEqual([])
    const out = suggestHabits('cena', { kcal: 900, protein: 80 }, habits, new Map([['pollo', 100], ['arroz', null]]), foodById, new Map(), '2026-10-22')
    expect(out[0].parts.find((p) => p.food.id === 'pollo')!.grams).toBeLessThanOrEqual(100)
    expect(suggestHabits('cena', { kcal: 900, protein: 80 }, habits, new Map([['pollo', 40], ['arroz', null]]), foodById, new Map(), '2026-10-22')).toEqual([]) // menos de la mitad
  })

  it('"no me apetece" lo oculta y "me gusta" lo sube', () => {
    const key = habits.find((h) => h.meal === 'comida')!.key
    expect(suggestHabits('comida', { kcal: 900, protein: 80 }, habits, have, foodById, new Map([[key, false]]), '2026-10-22')).toEqual([])
    const base = suggestHabits('comida', { kcal: 900, protein: 80 }, habits, have, foodById, new Map(), '2026-10-22')[0].score
    const liked = suggestHabits('comida', { kcal: 900, protein: 80 }, habits, have, foodById, new Map([[key, true]]), '2026-10-22')[0].score
    expect(liked).toBeCloseTo(base - 0.3)
  })
})
