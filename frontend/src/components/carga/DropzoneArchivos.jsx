import { useRef, useState } from 'react'
import { UploadCloud, X, FileIcon } from 'lucide-react'

function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DropzoneArchivos({ archivos, onChange, accept, disabled }) {
  const inputRef = useRef(null)
  const [arrastrando, setArrastrando] = useState(false)

  function agregarArchivos(lista) {
    onChange([...archivos, ...Array.from(lista)])
  }

  function quitarArchivo(index) {
    onChange(archivos.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          if (!disabled && e.dataTransfer.files.length) agregarArchivos(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${arrastrando ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
      >
        <UploadCloud className="text-slate-400" size={28} strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-600">Arrastra archivos aquí o haz clic para seleccionarlos</p>
        <p className="text-xs text-slate-400">Puedes seleccionar varios a la vez</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files.length) agregarArchivos(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {archivos.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {archivos.map((archivo, index) => (
            <li key={`${archivo.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <FileIcon size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{archivo.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">{formatearTamano(archivo.size)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => quitarArchivo(index)}
                    className="text-slate-400 hover:text-red-500"
                    aria-label={`Quitar ${archivo.name}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
