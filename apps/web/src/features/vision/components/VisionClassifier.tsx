import type {
  Classification,
  DonationCategory,
  DonationUnit,
  FoodCondition,
} from '@resgata/shared'
import { useEffect, useId, useMemo, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import {
  AppIcon,
  Button,
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
  prepareImageForUpload,
  type VisionMode,
} from '../model/classification'
import './vision.css'

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

const conditionView: Record<
  FoodCondition,
  { label: string; tone: 'danger' | 'success' | 'warning' }
> = {
  attention: { label: visionMessages.conditionAttention, tone: 'warning' },
  good: { label: visionMessages.conditionGood, tone: 'success' },
  unsafe: { label: visionMessages.conditionUnsafe, tone: 'danger' },
}

const amount = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

interface VisionClassifierProps {
  apiClient: ApiClient
  disabled?: boolean
  /** Receives null while re-analyzing and when the photo shows no food. */
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
  const freshnessHours = result
    ? Math.max(1, Math.round(result.perishabilityMinutes / 60))
    : null

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
    setMode(source)
    let imageBase64: string
    try {
      // Downscaled JPEG: fast on mobile data and readable for any phone format.
      imageBase64 = await prepareImageForUpload(file)
    } catch {
      setFileError(visionMessages.fileError)
      return
    }
    await classify(createImageClassificationRequest(imageBase64, source))
  }

  return (
    <div className="vision-classifier">
      <section
        className="screen-card vision-capture"
        aria-labelledby="vision-capture-title"
      >
        {previewUrl ? (
          <img
            alt="Prévia do alimento selecionado"
            className="vision-capture__preview"
            src={previewUrl}
          />
        ) : null}

        <div className="vision-capture__content">
          <div className="vision-capture__heading">
            <AppIcon name="camera" size={28} />
            <div>
              <h2 id="vision-capture-title">{visionMessages.eyebrow}</h2>
              <p>{visionMessages.description}</p>
            </div>
          </div>

          <div className="vision-capture__sources">
            <input
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={disabled}
              id={cameraInputId}
              onChange={(event) => void handleFile(event.currentTarget, 'camera')}
              type="file"
            />
            <label className="screen-chip" htmlFor={cameraInputId}>
              <AppIcon name="camera" />
              {previewUrl ? visionMessages.retry : visionMessages.camera}
            </label>

            <input
              accept="image/*"
              className="sr-only"
              disabled={disabled}
              id={uploadInputId}
              onChange={(event) => void handleFile(event.currentTarget, 'upload')}
              type="file"
            />
            <label className="screen-chip" htmlFor={uploadInputId}>
              {visionMessages.upload}
            </label>

            <button
              aria-pressed={mode === 'manual'}
              className="screen-chip"
              disabled={disabled || classificationMutation.isPending}
              onClick={() => setMode('manual')}
              type="button"
            >
              {visionMessages.manual}
            </button>
          </div>

          {mode === 'camera' && !supportsCapture ? (
            <p className="vision-capture__fallback">
              {visionMessages.cameraFallback}
            </p>
          ) : null}

          {mode === 'manual' ? (
            <form
              className="vision-manual"
              onSubmit={(event) => {
                event.preventDefault()
                void classify(
                  createManualClassificationRequest(manualDescription),
                )
              }}
            >
              <label htmlFor="vision-description">
                {visionMessages.manualLabel}
              </label>
              <textarea
                disabled={disabled || classificationMutation.isPending}
                id="vision-description"
                onChange={(event) => setManualDescription(event.target.value)}
                placeholder={visionMessages.manualPlaceholder}
                required
                value={manualDescription}
              />
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
        </div>
      </section>

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

      {result && result.isFood === false ? (
        <section className="screen-card vision-result" role="alert">
          <div className="vision-result__heading">
            <div>
              <span>{visionMessages.result}</span>
              <h2>{visionMessages.notFoodTitle}</h2>
            </div>
          </div>
          <p className="vision-result__notes">
            {result.conditionNotes || visionMessages.notFoodDescription}
          </p>
        </section>
      ) : null}

      {result && result.isFood !== false ? (
        <section className="screen-card vision-result">
          <div className="vision-result__heading">
            <div>
              <span>{visionMessages.result}</span>
              <h2>{result.description.replace(/\s+—\s+SIMULADO$/u, '')}</h2>
            </div>
            {result.simulated ? <SimuladoBadge /> : null}
          </div>

          <div className="vision-result__chips">
            <span className="screen-chip">
              {categoryLabels[result.category]}
            </span>
            <StatusBadge
              label={`Folga · bom por ~${freshnessHours}h`}
              tone="success"
            />
            {result.suggestedQuantity && result.suggestedUnit ? (
              <span className="screen-chip">
                ≈ {amount.format(result.suggestedQuantity)}{' '}
                {unitLabels[result.suggestedUnit][result.suggestedQuantity === 1 ? 0 : 1]}
              </span>
            ) : null}
            {result.estimatedWeightKg ? (
              <span className="screen-chip">
                {amount.format(result.estimatedWeightKg)} kg
              </span>
            ) : null}
          </div>

          {result.items && result.items.length > 1 ? (
            <p className="vision-result__items">{result.items.join(' · ')}</p>
          ) : null}

          {result.condition ? (
            <div
              className={`vision-result__condition vision-result__condition--${result.condition}`}
            >
              <StatusBadge
                label={conditionView[result.condition].label}
                tone={conditionView[result.condition].tone}
              />
              {result.conditionNotes ? <p>{result.conditionNotes}</p> : null}
            </div>
          ) : null}

          <div className="vision-result__confidence">
            <span aria-hidden="true">
              {[0.25, 0.5, 0.75, 0.9].map((threshold) => (
                <i
                  className={
                    result.confidence >= threshold
                      ? 'vision-result__dot vision-result__dot--active'
                      : 'vision-result__dot'
                  }
                  key={threshold}
                />
              ))}
            </span>
            <span>
              {visionMessages.confidence}:{' '}
              {Math.round(result.confidence * 100)}%
            </span>
          </div>

          <button
            className="vision-result__edit"
            onClick={() => setMode('manual')}
            type="button"
          >
            {visionMessages.editSuggestion}
          </button>
        </section>
      ) : null}
    </div>
  )
}
