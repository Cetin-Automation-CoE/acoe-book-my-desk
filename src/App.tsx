import { HashRouter, Route, Routes } from 'react-router-dom'
import { env } from './lib/env'
import { strings } from './strings'

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-bold uppercase text-brand">{strings.appName}</h1>
      <p className="text-muted">{strings.tagline}</p>
      {!env.isConfigured && (
        <p className="rounded-lg bg-white p-4 text-sm text-accent shadow-sm">{strings.config.missing}</p>
      )}
    </main>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
