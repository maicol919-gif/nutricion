import { useMemo, useState } from 'react'
import type { FoodData } from '../../lib/useFoodData'
import { householdLabel, recipeMacros, roundMacros } from '../../lib/nutrition'
import RecipeEditor, { type RecipeDraft } from './RecipeEditor'
import RecipeImport from './RecipeImport'
import { importedMethod, rowsFromImported, type ImportedRecipe } from '../../lib/importRecipe'
import { methodLabel } from '../../lib/recipes'
import type { Recipe } from '../../types'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

export default function Recipes({ data, onLog }: { data: FoodData; onLog: (recipeId: string) => void }) {
  const [query, setQuery] = useState('')
  const [maxMin, setMaxMin] = useState<number | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ recipe: Recipe | null; copy: boolean; draft?: RecipeDraft } | null>(null)
  const [importing, setImporting] = useState(false)

  function onImported(x: ImportedRecipe) {
    const mapped = rowsFromImported(x.ingredients, data.activeFoods)
    const draft: RecipeDraft = {
      name: x.name ?? '',
      servings: x.servings && x.servings > 0 ? String(x.servings).replace('.', ',') : '1',
      minutes: x.minutes && x.minutes > 0 ? String(Math.round(x.minutes)) : '',
      steps: (x.steps ?? []).join('\n'),
      method: importedMethod(x.method) ?? '',
      rows: mapped.rows,
      unmatched: mapped.unmatched,
      omitted: mapped.omitted,
      notes: x.notes ?? '',
    }
    setImporting(false)
    setEditor({ recipe: null, copy: false, draft })
  }

  const q = query.trim().toLowerCase()
  const list = useMemo(
    () =>
      data.recipes
        .filter((r) => (!q || r.name.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))) && (maxMin == null || r.minutes <= maxMin))
        .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name)),
    [data.recipes, q, maxMin],
  )

  return (
    <div>
      <div className="row">
        <input placeholder="Buscar receta o etiqueta (horno, sin cocinar…)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={() => setEditor({ recipe: null, copy: false })}>+ Nueva</button>
      </div>
      <button className="link" onClick={() => setImporting(true)}>📷 Importar receta desde foto o PDF</button>
      {importing && <RecipeImport onRead={onImported} onClose={() => setImporting(false)} />}
      {editor && <RecipeEditor data={data} recipe={editor.recipe} copy={editor.copy} draft={editor.draft ?? null} onSaved={() => { setEditor(null); setQuery('') }} onClose={() => setEditor(null)} />}
      <div className="chips">
        {[null, 5, 10, 15].map((m) => (
          <button key={String(m)} className={`chip ${maxMin === m ? 'on' : ''}`} onClick={() => setMaxMin(m)}>
            {m == null ? 'Todas' : `≤ ${m} min`}
          </button>
        ))}
      </div>

      {list.map((r) => {
        const items = data.itemsByRecipe.get(r.id) ?? []
        const m = roundMacros(recipeMacros(items, data.foodById, r.servings))
        const isOpen = open === r.id
        return (
          <section key={r.id} className="card">
            <button className="exrow" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
              <span>
                <strong>{r.name}</strong>
                <small>{r.minutes} min{r.servings !== 1 ? ` · rinde ${String(r.servings).replace('.', ',')} raciones` : ''} · cada ración {m.kcal} kcal · {fmt(m.protein)} g proteína · {fmt(m.carbs)} g carb · {fmt(m.fat)} g grasa</small>
              </span>
            </button>
            {isOpen && (
              <div className="guide">
                {(r.method || r.tags.length > 0) && <p className="muted">{[methodLabel(r.method), ...r.tags].filter(Boolean).join(' · ')}</p>}
                {r.final_weight_g ? <p className="muted">Peso total de lo preparado: {fmt(r.final_weight_g)} g</p> : null}
                <h3>Ingredientes (1 ración)</h3>
                <ul>
                  {items.map((it) => {
                    const f = data.foodById.get(it.food_id)
                    const perServing = it.grams / r.servings
                    const house = f ? householdLabel(f, perServing) : null
                    return <li key={it.id}>{f?.name ?? '—'}: {fmt(perServing)} g{house ? ` (${house})` : ''}</li>
                  })}
                </ul>
                <h3>Preparación</h3>
                <ol>
                  {r.steps.split('\n').filter(Boolean).map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <button className="primary" onClick={() => onLog(r.id)}>Registrar en mi día</button>
                <div className="row">
                  <button onClick={() => setEditor({ recipe: r, copy: false })}>Editar</button>
                  <button onClick={() => setEditor({ recipe: r, copy: true })}>Duplicar</button>
                </div>
              </div>
            )}
          </section>
        )
      })}
      {list.length === 0 && <p className="muted">Ninguna receta coincide.</p>}
    </div>
  )
}
