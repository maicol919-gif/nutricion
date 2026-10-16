import type { Food } from '../../types'

const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',')

/** Aviso de alimentos parecidos antes de crear uno nuevo: evita tener el mismo alimento dos veces con números distintos. */
export default function SimilarFoods({ similar, onUse }: { similar: Food[]; onUse?: (f: Food) => void }) {
  if (similar.length === 0) return null
  return (
    <div className="card warn">
      <h3>Ya tienes {similar.length === 1 ? 'un alimento parecido' : 'alimentos parecidos'}</h3>
      <p className="muted">
        Tener el mismo alimento dos veces con números distintos confunde. Si es el mismo, úsalo{onUse ? ' (tócalo)' : ''}. Crea uno nuevo solo si de verdad
        se mide distinto (por ejemplo, crudo con hueso frente a cocinado sin hueso) y pon ese estado en el nombre.
      </p>
      {similar.map((f) =>
        onUse ? (
          <button key={f.id} className="exrow" onClick={() => onUse(f)}>
            <span>
              <strong>{f.name}{f.estimated ? ' · estimado' : ''}</strong>
              <small>por 100 g: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína{f.unit_g ? ` · 1 ${f.unit_label} = ${fmt(f.unit_g)} g` : ''}</small>
            </span>
          </button>
        ) : (
          <p key={f.id} className="muted">
            <strong>{f.name}</strong>: {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g proteína por 100 g
          </p>
        ),
      )}
    </div>
  )
}
