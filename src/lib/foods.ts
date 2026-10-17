import type { Food } from '../types'

/** Palabras que describen el estado o la preparación, no el alimento: no sirven para saber si dos nombres son el mismo alimento. */
const STOP = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'y', 'al', 'a', 'o', 'un', 'una',
  'crudo', 'cruda', 'cocido', 'cocida', 'cocinado', 'cocinada', 'asado', 'asada', 'frito', 'frita',
  'hervido', 'hervida', 'plancha', 'horno', 'entero', 'entera', 'natural', 'escurrido', 'escurrida',
  'hueso', 'piel', 'estimado', 'casero', 'casera', 'mi', 'mis',
  // marcas y estados de conservación: no identifican el alimento
  'hacendado', 'mercadona', 'congelado', 'congelada', 'congelados', 'congeladas',
])

/** Palabras que al buscar se ignoran (describen, no identifican): "banano maduro" busca banano. */
const DESCRIPTORS = new Set(['maduro', 'madura', 'maduros', 'maduras', 'fresco', 'fresca', 'frescos', 'frescas', 'grande', 'grandes', 'pequeno', 'pequena', 'pequenos', 'pequenas'])

/**
 * Palabras distintas para lo mismo (Colombia / España). Sin tildes y en singular. La primera de cada grupo es la
 * que usa la app (España) y sirve de referencia común: "banano" se entiende como "plátano".
 * Ojo: en Colombia "plátano" suele ser el plátano macho; aquí "plátano" es el banano.
 */
export const SYNONYM_GROUPS: string[][] = [
  ['platano', 'banano', 'guineo', 'banana'],
  ['patata', 'papa'],
  ['cacahuete', 'mani', 'cacahuate'],
  ['melocoton', 'melocotone', 'durazno'],
  ['alubia', 'frijol', 'frijole', 'judia', 'habichuela', 'poroto'],
  ['zumo', 'jugo'],
  ['pastel', 'torta', 'bizcocho', 'tarta'],
  ['guisante', 'arveja', 'chicharo'],
  ['aguacate', 'palta'],
  ['fresa', 'frutilla'],
  ['maiz', 'choclo', 'elote'],
  ['calabaza', 'ahuyama', 'auyama', 'zapallo'],
  ['gamba', 'camaron', 'langostino'],
  ['cerdo', 'cochino', 'puerco'],
  ['ternera', 'res', 'vaca'],
  ['refresco', 'gaseosa'],
  ['yogur', 'yogurt', 'yoghurt'],
  ['pimiento', 'pimenton'],
  ['picada', 'molida'],
  ['tocino', 'bacon', 'beicon', 'panceta'],
  ['tomate', 'jitomate'],
]

const CANON = new Map<string, string>()
const GROUP_OF = new Map<string, string[]>()
for (const g of SYNONYM_GROUPS) {
  for (const w of g) {
    CANON.set(w, g[0])
    GROUP_OF.set(w, g)
  }
}

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

/** Plural simple: "tomates" → "tomate". */
function singular(w: string): string {
  return w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w
}

/** Todas las formas que significan lo mismo que una palabra (ella incluida): banano → platano, banano, guineo… */
export function equivalents(word: string): string[] {
  const w = singular(normalize(word))
  return [...new Set([normalize(word), w, ...(GROUP_OF.get(w) ?? [])])]
}

/** Palabras con significado de un nombre (sin conectores ni estados), sin plural simple y con los sinónimos unificados. */
export function keyWords(name: string): string[] {
  return normalize(name)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map(singular)
    .map((w) => CANON.get(w) ?? w)
}

/** Palabras clave de un alimento: su nombre y sus "otros nombres". */
export function foodKeyWords(f: Pick<Food, 'name'> & { aliases?: string[] }): string[] {
  return keyWords([f.name, ...(f.aliases ?? [])].join(' '))
}

/**
 * ¿Coincide el texto con lo que se busca? Cada palabra buscada debe aparecer (o alguno de sus sinónimos) en el texto;
 * se ignoran conectores y descriptores ("maduro"). Una búsqueda vacía coincide con todo.
 */
export function matchesQuery(text: string, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const hay = normalize(text).split(' ').filter(Boolean)
  const tokens = q.split(' ').filter((t) => t.length >= 2 && !STOP.has(t) && !DESCRIPTORS.has(t))
  if (tokens.length === 0) return normalize(text).includes(q)
  return tokens.every((t) => equivalents(t).some((form) => hay.some((h) => h.includes(form))))
}

export function foodMatchesQuery(f: Pick<Food, 'name'> & { aliases?: string[] }, query: string): boolean {
  return matchesQuery([f.name, ...(f.aliases ?? [])].join(' '), query)
}

/** Alimentos ya guardados que comparten palabras clave con el nombre que se quiere crear (los más parecidos primero). */
export function similarFoods(name: string, foods: Food[], max = 5): Food[] {
  const words = new Set(keyWords(name))
  if (words.size === 0) return []
  // un nombre corto es específico (basta una palabra en común); uno largo (varios ingredientes) pide dos para no avisar por una palabra suelta
  const need = words.size <= 2 ? 1 : 2
  return foods
    .map((f) => ({ f, shared: foodKeyWords(f).filter((w) => words.has(w)).length }))
    .filter((x) => x.shared >= need)
    .sort((a, b) => b.shared - a.shared || a.f.name.localeCompare(b.f.name))
    .slice(0, max)
    .map((x) => x.f)
}
