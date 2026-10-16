import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { shrinkImage, toBase64 } from '../../lib/photo'
import type { ImportedRecipe } from '../../lib/importRecipe'

const MAX_PDF_BYTES = 4_500_000

interface Props {
  onRead: (recipe: ImportedRecipe) => void
  onClose: () => void
}

const SETUP_HELP =
  'La lectura de recetas necesita una clave de la API de Claude guardada como secreto en Supabase (nombre: ANTHROPIC_API_KEY). Mientras no esté configurada puedes crear la receta a mano con "+ Nueva".'

/** Lee una receta desde una foto o un PDF con la función read-recipe y devuelve los datos para revisarlos antes de guardar. */
export default function RecipeImport({ onRead, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handle(file: File) {
    setErr(null)
    setFileName(file.name)
    setBusy(true)
    try {
      let mediaType: string
      let data: string
      if (file.type === 'application/pdf') {
        if (file.size > MAX_PDF_BYTES) throw new Error('El PDF es demasiado grande (máximo unos 4,5 MB). Prueba con una foto de la receta.')
        mediaType = 'application/pdf'
        data = await toBase64(file)
      } else if (file.type.startsWith('image/')) {
        mediaType = 'image/jpeg'
        data = await toBase64(await shrinkImage(file, 1600))
      } else {
        throw new Error('Usa una foto (JPG, PNG, WebP) o un PDF.')
      }

      const { data: res, error } = await supabase.functions.invoke('read-recipe', { body: { mediaType, data } })
      if (error) {
        let detail: { error?: string; message?: string } | null = null
        try {
          detail = await (error as { context?: Response }).context?.json()
        } catch {
          /* sin detalle */
        }
        if (detail?.error === 'not_configured') throw new Error(SETUP_HELP)
        throw new Error(detail?.message ?? 'No se pudo leer la receta. Inténtalo de nuevo.')
      }
      const recipe = (res as { recipe?: ImportedRecipe } | null)?.recipe
      if (!recipe || !Array.isArray(recipe.ingredients)) throw new Error('No se pudo interpretar la receta. Prueba con una foto más nítida.')
      onRead(recipe)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-label="Importar receta">
      <div className="overlay-inner">
        <div className="row between">
          <h2>Importar receta</h2>
          <button onClick={onClose} disabled={busy}>Cerrar</button>
        </div>
        <section className="card">
          <p className="muted">
            Sube una foto o captura de la receta, o un PDF. La app lee los ingredientes, las raciones y los pasos y los busca en tus alimentos.
            Después <strong>tú revisas y confirmas</strong> antes de guardar nada: la lectura puede equivocarse.
          </p>
          <label className="filebtn">
            📷 {busy ? 'Leyendo la receta…' : 'Elegir foto o PDF'}
            <input
              type="file"
              accept="image/*,application/pdf"
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void handle(f)
              }}
            />
          </label>
          {fileName && <p className="muted">Archivo: {fileName}</p>}
          {busy && <p className="muted">Puede tardar unos segundos.</p>}
          {err && <p className="err">{err}</p>}
          <p className="muted">El archivo se envía al servicio de lectura solo para esta receta; la app no lo guarda.</p>
        </section>
      </div>
    </div>
  )
}
