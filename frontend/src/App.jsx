import { FileStack } from 'lucide-react'

function App() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-slate-50 text-slate-800">
      <div className="flex items-center gap-3 text-indigo-600">
        <FileStack size={40} strokeWidth={1.75} />
        <h1 className="text-4xl font-semibold tracking-tight">ContaAssist</h1>
      </div>
      <p className="mt-2 text-slate-500">
        Plataforma de preparación y transformación de información contable
      </p>
      <span className="mt-8 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-400">
        Frontend inicializado — módulos en construcción
      </span>
    </div>
  )
}

export default App
