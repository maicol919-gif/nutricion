import { useEffect, useRef, useState } from 'react'

interface DetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type DetectorCtor = new (opts?: { formats?: string[] }) => DetectorLike

/** ¿Puede este navegador leer códigos de barras con la cámara? (no todos pueden: si no, se escribe el número) */
export function canScanBarcodes(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia
}

/** Lee un código de barras con la cámara y lo devuelve; se cierra solo al leerlo. */
export default function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: number | undefined
    let alive = true
    async function start() {
      try {
        const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!alive || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        timer = window.setInterval(async () => {
          if (!video.current) return
          try {
            const found = await detector.detect(video.current)
            if (found.length > 0 && alive) {
              alive = false
              onCode(found[0].rawValue)
            }
          } catch {
            /* un fotograma sin código: se sigue intentando */
          }
        }, 350)
      } catch {
        setErr('No se pudo usar la cámara. Revisa el permiso del navegador o escribe el número del código.')
      }
    }
    void start()
    return () => {
      alive = false
      if (timer) window.clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  return (
    <div className="overlay" role="dialog" aria-label="Escanear código de barras">
      <div className="overlay-inner">
        <div className="row between">
          <h2>Escanear código</h2>
          <button onClick={onClose}>Cerrar</button>
        </div>
        <p className="muted">Apunta la cámara al código de barras del envase y mantenlo quieto, con buena luz.</p>
        {err ? <p className="err">{err}</p> : <video ref={video} muted playsInline style={{ width: '100%', borderRadius: 12, background: '#000' }} />}
      </div>
    </div>
  )
}
