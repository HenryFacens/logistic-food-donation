import type { Classification, DonationCategory } from '@resgata/shared'
import { useEffect, useId, useMemo, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import {
  Button,
  Card,
  LoadingState,
  SimuladoBadge,
  StatusBadge,
} from '../../../shared/ui'
import { useVisionClassification } from '../api/classification'
import { visionMessages } from '../messages'
import {
  browserSupportsCameraCapture,
  createImageClassificationRequest,
  createManualClassificationRequest,
  imageFileToBase64,
  type VisionMode,
} from '../model/classification'

const categoryLabels: Record<DonationCategory, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Alimento preparado',
  produce: 'Hortifruti',
}

interface VisionClassifierProps {
  apiClient: ApiClient
  disabled?: boolean
  onChange(classification: Classification): void
  value?: Classification | null
}

export function VisionClassifier({
  apiClient,
  disabled = false,
  onChange,
  value,
}: VisionClassifierProps) {
  const cameraInputId = useId()
  const uploadInputId = useId()
  const [mode, setMode] = useState<VisionMode>('camera')
  const [manualDescription, setManualDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const classificationMutation = useVisionClassification(apiClient)
  const supportsCapture = useMemo(
    () => browserSupportsCameraCapture(),
    [],
  )
  const result = classificationMutation.data || value || null

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const classify = async (
    request:
      | ReturnType<typeof createImageClassificationRequest>
      | ReturnType<typeof createManualClassificationRequest>,
  ) => {
    setFileError(null)
    const classification = await classificationMutation.mutateAsync(request)
    onChange(classification)
  }

  const handleFile = async (
    file: File | undefined,
    source: 'camera' | 'upload',
  ) => {
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setMode(source)
    try {
      const imageBase64 = await imageFileToBase64(file)
      await classify(createImageClassificationRequest(imageBase64, source))
    } catch {
      setFileError(visionMessages.fileError)
    }
  }

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{visionMessages.eyebrow}</span>
          <h2 className="mb-2 text-xl font-extrabold">{visionMessages.title}</h2>
          <p className="mb-0 text-sm">{visionMessages.description}</p>
        </div>
        <SimuladoBadge />
      </div>

      <fieldset
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        <legend className="sr-only">Forma de identificar o alimento</legend>
        {(
          [
            ['camera', visionMessages.camera],
            ['upload', visionMessages.upload],
            ['manual', visionMessages.manual],
          ] as const
        ).map(([itemMode, label]) => (
          <Button
            aria-pressed={mode === itemMode}
            disabled={disabled || classificationMutation.isPending}
            key={itemMode}
            onClick={() => setMode(itemMode)}
            variant={mode === itemMode ? 'primary' : 'secondary'}
          >
            {label}
          </Button>
        ))}
      </fieldset>

      {mode === 'camera' ? (
        <div className="grid gap-3">
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled}
            id={cameraInputId}
            onChange={(event) =>
              void handleFile(event.target.files?.[0], 'camera')
            }
            type="file"
          />
          <label
            className="button button--primary min-h-12 cursor-pointer"
            htmlFor={cameraInputId}
          >
            {visionMessages.camera}
          </label>
          {!supportsCapture ? (
            <p className="mb-0 text-sm">{visionMessages.cameraFallback}</p>
          ) : null}
        </div>
      ) : null}

      {mode === 'upload' ? (
        <div>
          <input
            accept="image/*"
            className="block min-h-12 w-full cursor-pointer rounded-control border border-border bg-surface p-3 text-sm"
            disabled={disabled}
            id={uploadInputId}
            onChange={(event) =>
              void handleFile(event.target.files?.[0], 'upload')
            }
            type="file"
          />
        </div>
      ) : null}

      {mode === 'manual' ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void classify(
              createManualClassificationRequest(manualDescription),
            )
          }}
        >
          <label className="grid gap-2 font-bold" htmlFor="vision-description">
            {visionMessages.manualLabel}
            <textarea
              className="min-h-28 rounded-control border border-border bg-surface p-3 font-normal text-text"
              disabled={disabled || classificationMutation.isPending}
              id="vision-description"
              onChange={(event) => setManualDescription(event.target.value)}
              placeholder={visionMessages.manualPlaceholder}
              required
              value={manualDescription}
            />
          </label>
          <Button
            disabled={
              disabled ||
              classificationMutation.isPending ||
              !manualDescription.trim()
            }
            type="submit"
            variant="primary"
          >
            {visionMessages.classify}
          </Button>
        </form>
      ) : null}

      {previewUrl ? (
        <img
          alt="Prévia do alimento selecionado"
          className="max-h-64 w-full rounded-card object-cover"
          src={previewUrl}
        />
      ) : null}

      {classificationMutation.isPending ? (
        <LoadingState label={visionMessages.classifying} />
      ) : null}

      {classificationMutation.isError || fileError ? (
        <div
          className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {fileError ||
            classificationMutation.error?.message ||
            'Não foi possível classificar o alimento.'}
        </div>
      ) : null}

      {result ? (
        <output
          className="grid gap-3 rounded-card border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{visionMessages.result}</strong>
            <StatusBadge
              label={`${Math.round(result.confidence * 100)}% ${visionMessages.confidence.toLocaleLowerCase('pt-BR')}`}
              tone="info"
            />
          </div>
          <div>
            <p className="mb-1 font-extrabold text-text">
              {categoryLabels[result.category]}
            </p>
            <p className="mb-0 text-sm">{result.description}</p>
          </div>
        </output>
      ) : null}
    </Card>
  )
}
