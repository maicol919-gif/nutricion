import { supabase } from '../lib/supabase'

export default function SettingsTab() {
  async function exportAll() {
    const tables = ['foods', 'recipes', 'recipe_items', 'meal_log', 'body_weight', 'settings']
    const out: Record<string, unknown> = {}
    for (const t of tables) out[t] = (await supabase.from(t).select('*')).data
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `comida-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  async function forceUpdate() {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      for (const k of await caches.keys()) await caches.delete(k)
    } catch {
      /* sin service worker: basta con recargar */
    }
    location.reload()
  }

  return (
    <div className="screen">
      <h2>Ajustes</h2>

      <section className="card">
        <h3>Datos</h3>
        <p className="muted">Descarga todo lo que has registrado (comidas, alimentos, recetas, peso y cintura).</p>
        <button onClick={exportAll}>Descargar respaldo</button>
      </section>

      <section className="card">
        <h3>Versión de la app</h3>
        <p>Versión <strong>{__VERSION__}</strong></p>
        <p className="muted">Compilada: {__BUILD__}</p>
        <button onClick={forceUpdate}>Buscar actualización</button>
      </section>

      <button className="link" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}
