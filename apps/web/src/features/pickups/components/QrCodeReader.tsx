import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options: {
  formats: string[]
}) => BarcodeDetectorLike

const barcodeDetector = () => {
  const constructor = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorConstructor
    }
  ).BarcodeDetector
  return constructor ? new constructor({ formats: ['qr_code'] }) : null
}

export function QrCodeReader({ onCode }: { onCode(code: string): void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    const detector = barcodeDetector()
    let stream: MediaStream | undefined
    let timer: number | undefined
    let cancelled = false

    const start = async () => {
      if (!detector || !navigator.mediaDevices?.getUserMedia) {
        setMessage('Leitura de QR indisponível neste navegador. Digite o código.')
        setActive(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!video || cancelled) return
        video.srcObject = stream
        await video.play()
        timer = window.setInterval(async () => {
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
          try {
            const result = await detector.detect(video)
            const value = result[0]?.rawValue
            if (value) {
              onCode(value)
              setMessage('QR lido. Confira o código antes de confirmar.')
              setActive(false)
            }
          } catch {
            setMessage('Não foi possível ler o QR. Tente novamente ou digite o código.')
          }
        }, 500)
      } catch {
        setMessage('Câmera indisponível. Digite o código de seis números.')
        setActive(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [active, onCode])

  return (
    <div className="qr-reader">
      <Button
        className="qr-reader__button"
        icon={active ? 'warning' : 'route'}
        onClick={() => setActive((current) => !current)}
        variant="secondary"
      >
        {active ? 'Cancelar câmera' : 'Ler código QR'}
      </Button>
      {active ? (
        <video
          aria-label="Visualização da câmera para leitura do QR"
          className="qr-reader__video"
          muted
          playsInline
          ref={videoRef}
        />
      ) : null}
      {message ? <output className="qr-reader__message">{message}</output> : null}
    </div>
  )
}
