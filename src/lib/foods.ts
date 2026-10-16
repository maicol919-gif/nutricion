import type { Food } from '../types'

/** Palabras que describen el estado o la preparación, no el alimento: no sirven para saber si dos nombres son el mismo alimento. */
const STOP = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'y', 'al', 'a', 'o', 'un', 'una',
  'crudo', 'cruda', 'cocido', 'cocida', 'cocinado', 'cocinada', 'asado', 'asada', 'frito', 'frita',
  'hervido', 'hervida', 'plancha', 'horno', 'entero', 'entera', 'natural', 'escurrido', 'escurrida',
  'hueso', 'piel', 'estimado', 'casero', 'casera', 'mi', 'mis',
])

/** Minúsculas, sin tildes y sin signos. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Palabras con significado de un nombre (sin conectores ni estados), sin plural simple. */
export function keyWords(name: string): string[] {
  return normalize(name)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
}

/** Alimentos ya guardados que comparten alguna palabra clave con el nombre que se quiere crear (los más parecidos primero). */
export function similarFoods(name: string, foods: Food[], max = 5): Food[] {
  const words = new Set(keyWords(name))
  if (words.size === 0) return []
  return foods
    .map((f) => ({ f, shared: keyWords(f.name).filter((w) => words.has(w)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.f.name.localeCompare(b.f.name))
    .slice(0, max)
    .map((x) => x.f)
}
