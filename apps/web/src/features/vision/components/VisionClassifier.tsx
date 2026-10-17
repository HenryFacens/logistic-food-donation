import type {
  Classification,
  DonationCategory,
  DonationUnit,
  FoodCondition,
} from '@resgata/shared'
import { useEffect, useId, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import {
  AppIcon,
  Button,
  Card,
  LoadingState,
  SimuladoBadge,
  StatusBadge,
  type StatusTone,
} from '../../../shared/ui'
import { useVisionClassification } from '../api/classification'
import { visionMessages } from '../messages'
import {
  createImageClassificationRequest,
  createManualClassificationRequest,
  prepareImageForUpload,
} from '../model/classification'

const categoryLabels: Record<DonationCategory, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Alimento preparado',
  produce: 'Hortifruti',
}

const unitLabels: Record<DonationUnit, [singular: string, plural: string]> = {
  box: ['caixa', 'caixas'],
  kg: ['kg', 'kg'],
  tray: ['bandeja', 'bandejas'],
  unit: ['unidade', 'unidades'],
}

const conditionTones: Record<
  FoodCondition,
  { label: string; tone: StatusTone; panel: string }
> = {
  good: {
    label: visionMessages.conditionGood,
    panel: 'border-success/30 bg-success/10',
    tone: 'success',
  },
  attention: {
    label: visionMessages.conditionAttention,
    panel: 'border-warning/30 bg-warning/10',
    tone: 'warning',
  },
  unsafe: {
    label: visionMessages.conditionUnsafe,
    panel: 'border-danger/30 bg-danger/10',
    tone: 'danger',
  },
}

const numberFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})

const formatShelfLife = (minutes: number) =>
  minutes < 120
    ? `${minutes} min`
    : minutes < 48 * 60
      ? `${Math.round(minutes / 60)} h`
      : `${Math.round(minutes / (24 * 60))} dias`

const summarize = (result: Classification) => {
  const parts: string[] = []
  if (result.suggestedQuantity && result.suggestedUnit) {
    parts.push(
      `≈ ${numberFormat.format(result.suggestedQuantity)} ${unitLabels[result.suggestedUnit][result.suggestedQuantity === 1 ? 0 : 1]}`,
    )
  }
  if (result.estimatedWeightKg) {
    parts.push(`${numberFormat.format(result.estimatedWeightKg)} kg`)
  }
  parts.push(`${visionMessages.goodFor} ${formatShelfLife(result.perishabilityMinutes)}`)
  return parts.join(' · ')
}

interface VisionClassifierProps {
  apiClient: ApiClient
  disabled?: boolean
  onChange(classification: Classification | null): void
  value?: Classification | null
}

export function VisionClassifier({
  apiClient,
  disabled = false,
  onChange,
  value,
}: VisionClassifierProps) {
  const cameraInputId = useId()
  const galleryInputId = useId()
  const descriptionId = useId()
  const [describing, setDescribing] = useState(false)
  const [manualDescription, setManualDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const classificationMutation = useVisionClassification(apiClient)
  const result = classificationMutation.data || value || null
  const busy = disabled || classificationMutation.isPending

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
    onChange(null)
    try {
      const classification = await classificationMutation.mutateAsync(request)
      onChange(classification.isFood === false ? null : classification)
    } catch {
      // The mutation error is rendered below.
    }
  }

  const handleFile = async (
    input: HTMLInputElement,
    source: 'camera' | 'upload',
  ) => {
    const file = input.files?.[0]
    // Reset so choosing the same photo again still triggers a change.
    input.value = ''
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setDescribing(false)
    let imageBase64: string
    try {
      imageBase64 = await prepareImageForUpload(file)
    } catch {
      setFileError(visionMessages.fileError)
      return
    }
    await classify(createImageClassificationRequest(imageBase64, source))
  }

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFileError(null)
    classificationMutation.reset()
    onChange(null)
  }

  const hasAttempt =
    Boolean(previewUrl) || classificationMutation.status !== 'idle'
  const condition = result?.condition ? conditionTones[result.condition] : null
  const errorMessage =
    fileError ||
    (classificationMutation.isError
      ? classificationMutation.error?.message || visionMessages.genericError
      : null)

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{visionMessages.eyebrow}</span>
          <h2 className="mb-2 text-xl font-extrabold">{visionMessages.title}</h2>
          <p className="mb-0 text-sm">{visionMessages.description}</p>
        </div>
        {result?.simulated ? <SimuladoBadge /> : null}
      </div>

      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy}
        id={cameraInputId}
        onChange={(event) => void handleFile(event.currentTarget, 'camera')}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        disabled={busy}
        id={galleryInputId}
        onChange={(event) => void handleFile(event.currentTarget, 'upload')}
        type="file"
      />

      {!hasAttempt ? (
        <div className="grid gap-3">
          <label
            aria-disabled={busy}
            className="button button--primary min-h-20 cursor-pointer text-lg"
            htmlFor={cameraInputId}
          >
            <AppIcon name="camera" size={28} />
            <span>{visionMessages.takePhoto}</span>
          </label>
          <label
            aria-disabled={busy}
            className="button button--secondary min-h-12 cursor-pointer"
            htmlFor={galleryInputId}
          >
            <AppIcon name="image" />
            <span>{visionMessages.gallery}</span>
          </label>
          {!describing ? (
            <Button
              className="justify-self-center"
              disabled={busy}
              onClick={() => setDescribing(true)}
              variant="ghost"
            >
              {visionMessages.noPhoto}
            </Button>
          ) : null}
        </div>
      ) : null}

      {describing && !hasAttempt ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void classify(createManualClassificationRequest(manualDescription))
          }}
        >
          <label className="grid gap-2 font-bold" htmlFor={descriptionId}>
            {visionMessages.manualLabel}
            <textarea
              className="min-h-24 rounded-control border border-border bg-surface p-3 font-normal text-text"
              disabled={busy}
              id={descriptionId}
              onChange={(event) => setManualDescription(event.target.value)}
              placeholder={visionMessages.manualPlaceholder}
              required
              value={manualDescription}
            />
          </label>
          <Button
            disabled={busy || !manualDescription.trim()}
            type="submit"
            variant="primary"
          >
            {visionMessages.classify}
          </Button>
        </form>
      ) : null}

      {previewUrl ? (
        <img
          alt={visionMessages.previewAlt}
          className="max-h-72 w-full rounded-card object-cover"
          src={previewUrl}
        />
      ) : null}

      {classificationMutation.isPending ? (
        <LoadingState label={visionMessages.classifying} />
      ) : null}

      {errorMessage ? (
        <div
          className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      {result && result.isFood === false ? (
        <div
          className="grid gap-1 rounded-card border border-warning/30 bg-warning/10 p-4"
          role="alert"
        >
          <strong>{visionMessages.notFoodTitle}</strong>
          <p className="mb-0 text-sm">
            {result.conditionNotes || visionMessages.notFoodDescription}
          </p>
        </div>
      ) : null}

      {result && result.isFood !== false ? (
        <output className="grid gap-3 rounded-card border border-primary/25 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow mb-0">
              {categoryLabels[result.category]}
            </span>
            <StatusBadge
              label={`${Math.round(result.confidence * 100)}% ${visionMessages.confidence}`}
              tone="info"
            />
          </div>
          <p className="mb-0 text-lg font-extrabold text-text">
            {result.description.replace(/\s+—\s+SIMULADO$/u, '')}
          </p>
          {result.items && result.items.length > 1 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {result.items.map((item) => (
                <li
                  className="rounded-full border border-border px-3 py-1 text-sm"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mb-0 text-sm font-bold">{summarize(result)}</p>
          {condition ? (
            <div className={`grid gap-1 rounded-control border p-3 ${condition.panel}`}>
              <StatusBadge label={condition.label} tone={condition.tone} />
              {result.conditionNotes ? (
                <p className="mb-0 text-sm">{result.conditionNotes}</p>
              ) : null}
            </div>
          ) : null}
          <p className="mb-0 text-xs">{visionMessages.reviewHint}</p>
        </output>
      ) : null}

      {hasAttempt && !classificationMutation.isPending ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className="button button--secondary min-h-12 cursor-pointer"
            htmlFor={cameraInputId}
          >
            <AppIcon name="camera" />
            <span>{visionMessages.retake}</span>
          </label>
          <Button onClick={reset} variant="ghost">
            {visionMessages.startOver}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
