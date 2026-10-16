import { useEffect, useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { DataProvider } from './store'
import Login from './screens/Login'
import Food from './screens/Food'
import Body from './screens/Body'
import SettingsTab from './screens/Settings'
import UpdateBanner from './UpdateBanner'

type Tab = 'food' | 'body' | 'settings'

const TABS: [Tab, string][] = [
  ['food', 'Alimentación'],
  ['body', 'Cuerpo'],
  ['settings', 'Ajustes'],
]

export default function App() {
  const [auth, setAuth] = useState<AuthSession | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('food')

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuth(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (auth === undefined) return <div className="center"><p>Cargando…</p></div>
  if (!auth) return (
    <>
      <Login />
      <UpdateBanner />
    </>
  )

  return (
    <DataProvider>
      <UpdateBanner />
      <main>
        {tab === 'food' && <Food />}
        {tab === 'body' && <Body />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>
    </DataProvider>
  )
}
