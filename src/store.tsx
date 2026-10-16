import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'

export interface Settings {
  height_cm: number
  kcal_target: number
  protein_target: number
}

export const DEFAULT_SETTINGS: Settings = { height_cm: 172, kcal_target: 2150, protein_target: 148 }

interface Data {
  settings: Settings
  reload: () => Promise<void>
}

const Ctx = createContext<Data | null>(null)

export function useData(): Data {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData fuera de DataProvider')
  return v
}

/** Metas y altura del usuario (tabla `settings`, compartida con la app Entreno). */
export function DataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error: e } = await supabase.from('settings').select('height_cm,kcal_target,protein_target').maybeSingle()
    if (e) return setError(e.message)
    setSettings({
      height_cm: Number(data?.height_cm ?? DEFAULT_SETTINGS.height_cm),
      kcal_target: Number(data?.kcal_target ?? DEFAULT_SETTINGS.kcal_target),
      protein_target: Number(data?.protein_target ?? DEFAULT_SETTINGS.protein_target),
    })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  if (error) return <div className="center"><p className="err">No se pudieron cargar los datos: {error}</p></div>
  if (!settings) return <div className="center"><p>Cargando…</p></div>
  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>
}
