import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isBarcode, productIssues, productLabel, type FoundProduct } from '../../lib/product'
import BarcodeScanner, { canScanBarcodes } from './BarcodeScanner'

const fmt = (n: number | null, d = 0) => (n == null ? '—' : n.toFixed(d).replace('.', ','))

interface Props {
  initialQuery?: string
  onPick: (p: FoundProduct) => void
}

/** Busca un producto (por nombre o código de barras) en Open Food Facts y deja elegir uno para rellenar el formulario. */
export default function ProductSearch({ initialQuery = '', onPick }: Props) {
  const [q, setQ] = useState(initialQuery)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [results, setResults] = useState<FoundProduct[] | null>(null)
  const [scanning, setScanning] = useState(false)

  async function search(text: string) {
    const clean = text.trim()
    if (clean.length < 2) return setErr('Escribe al menos 2 letras o un código de barras.')
    setErr(null)
    setBusy(true)
    setResults(null)
    try {
      const body = isBarcode(clean) ? { barcode: clean.replace(/\s+/g, '') } : { query: clean }
      const { data, error } = await supabase.functions.invoke('find-product', { body })
      if (error) {
        let detail: { message?: string } | null = null
        try {
          detail = await (error as { context?: Response }).context?.json()
        } catch {
          /* sin detalle */
        }
        throw new Error(detail?.message ?? 'No se pudo buscar el producto. Inténtalo de nuevo o créalo a mano.')
      }
      setResults(((data as { products?: FoundProduct[] } | null)?.products ?? []) as FoundProduct[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Buscar producto</h3>
      <p className="muted">Escribe el nombre (ej. "gotas chocolate hacendado") o el código de barras, y elige. Se rellena el formulario y tú confirmas.</p>
      <div className="row">
        <input
          placeholder="Nombre o código de barras"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void search(q) }}
        />
        <button disabled={busy} onClick={() => void search(q)}>{busy ? 'Buscando…' : 'Buscar'}</button>
      </div>
      {canScanBarcodes() && <button className="link" onClick={() => setScanning(true)}>📷 Escanear código de barras</button>}
      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onCode={(code) => {
            setScanning(false)
            setQ(code)
            void search(code)
          }}
        />
      )}
      {err && <p className="err">{err}</p>}
      {results && results.length === 0 && <p className="muted">No encontré ese producto. Créalo a mano con los valores de su etiqueta.</p>}
      {results?.map((p) => {
        const issues = productIssues(p)
        return (
          <button key={`${p.code}-${p.name}`} className="exrow" onClick={() => onPick(p)}>
            <span>
              <strong>{productLabel(p)}</strong>
              <small>
                {p.quantity ? `${p.quantity} · ` : ''}por 100 g: {fmt(p.kcal)} kcal · {fmt(p.protein, 1)} g proteína · {fmt(p.carbs, 1)} C · {fmt(p.fat, 1)} G
              </small>
              {issues.length > 0 && <small className="est">⚠ {issues[0]}</small>}
            </span>
          </button>
        )
      })}
      {results && <p className="muted">Datos de <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>, una base colaborativa: puede tener errores, compara con la etiqueta.</p>}
    </div>
  )
}
