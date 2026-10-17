import {
  donationCategorySchema,
  donationUnitSchema,
  type Address,
  type Classification,
} from '@resgata/shared'
import { useEffect, useRef, useState } from 'react'
import { useNow } from '../model/useNow'
import type { ApiClient } from '../../../shared/api'
import { createIdempotencyKey } from '../../../shared/api'
import { AppIcon, Button, StatusBadge } from '../../../shared/ui'
import { usePublishDonation } from '../api/donations'
import { PickupLocation } from './PickupLocation'
import { donationMessages } from '../messages'
import {
  donationCategoryLabels,
  donationUnitLabels,
} from '../model/donationView'
import {
  applyAddress,
  applyClassification,
  buildDonationPublishOperation,
  buildDonationRequest,
  createStableIdempotencyRegistry,
  formatBrl,
  isUnsafeClassification,
  parseOptionalBrl,
  rescaleWeight,
  resolvePickupWindow,
  type AiFilledField,
  type DonationFormValues,
  type DonationPublisher,
  type DonationPublishOutcome,
} from '../model/publish'

const createInitialValues = (shopAddress?: Address | null): DonationFormValues => {
  const values: DonationFormValues = {
    category: '',
    // Replaced by the shop's registered address when it is available.
    city: 'Campinas',
    description: '',
    district: 'Cambuí',
    disposalCostBrl: '',
    estimatedWeightKg: '5',
    expiryMinutes: '120',
    expiryTime: '',
    latitude: '-22.8974',
    line1: 'Rua Coronel Quirino, 900',
    longitude: '-47.051',
    perishabilityMinutes: '360',
    postalCode: '13025-001',
    quantity: '10',
    state: 'SP',
    unit: 'unit',
    unitValueBrl: '',
  }
  return shopAddress ? applyAddress(values, shopAddress) : values
}

const expiryPresets = [
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
] as const

const clock = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const inMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`
}

const singularUnit: Record<string, string> = { box: 'caixa', tray: 'bandeja', unit: 'unidade' }

/** Small tag on fields the photo analysis filled in. */
function AiTag({ show }: { show: boolean }) {
  return show ? <span className="producer-ai-tag">IA</span> : null
}

interface DonationFormProps {
  apiClient: ApiClient
  classification?: Classification | null
  onPublished?(outcome: DonationPublishOutcome): void
  publisher?: DonationPublisher
  /** The shop's registered address, used as the default pickup point. */
  shopAddress?: Address | null
}

export function DonationForm({
  apiClient,
  classification,
  onPublished,
  publisher,
  shopAddress,
}: DonationFormProps) {
  const [values, setValues] = useState(() => createInitialValues(shopAddress))
  const [aiFields, setAiFields] = useState<ReadonlySet<AiFilledField>>(new Set())
  const [customExpiry, setCustomExpiry] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const appliedClassification = useRef<string | null>(null)
  const registry = useRef(
    createStableIdempotencyRegistry(createIdempotencyKey),
  )
  const publishMutation = usePublishDonation(apiClient, publisher)
  const now = useNow(30_000)

  useEffect(() => {
    if (!classification) return
    const signature = JSON.stringify(classification)
    if (appliedClassification.current === signature) return
    appliedClassification.current = signature
    setValues((current) => {
      const applied = applyClassification(current, classification)
      setAiFields(new Set(applied.filled))
      return applied.values
    })
  }, [classification])

  const unsafe = isUnsafeClassification(classification)
  const pickupWindow = resolvePickupWindow(values, new Date(now))
  const minutesLeft = Math.round(
    (pickupWindow.expiresAt.getTime() - now) / 60_000,
  )

  // A field the vendor edits is no longer "filled by the AI".
  const update = (field: keyof DonationFormValues, value: string) => {
    setFormError(null)
    setSuccessMessage(null)
    setAiFields((current) => {
      if (!current.has(field as AiFilledField)) return current
      const next = new Set(current)
      next.delete(field as AiFilledField)
      return next
    })
    setValues((current) => ({ ...current, [field]: value }))
  }

  // Quantity and weight move together (same number in kg; same weight per item otherwise).
  const setQuantity = (quantity: string) => {
    // Rescale from the previous quantity, in the same state update.
    setValues((current) => ({
      ...current,
      estimatedWeightKg: rescaleWeight(current, quantity),
    }))
    update('quantity', quantity)
  }

  const changeQuantity = (direction: -1 | 1) => {
    const step = values.unit === 'kg' ? 0.5 : 1
    const current = Number(values.quantity) || step
    setQuantity(String(Math.max(step, current + direction * step)))
  }

  const setUnit = (unit: string) => {
    update('unit', unit)
    // Switching to kg: the amount becomes the weight we already estimated.
    if (unit === 'kg') {
      setValues((current) => ({ ...current, quantity: current.estimatedWeightKg }))
    }
  }

  const selectExpiry = (minutes: number) => {
    setCustomExpiry(false)
    update('expiryTime', '')
    update('expiryMinutes', String(minutes))
  }

  const formatCurrencyField = (
    field: 'disposalCostBrl' | 'unitValueBrl',
  ) => {
    const current = values[field]
    if (!current.trim()) return
    try {
      const amount = parseOptionalBrl(current)
      if (amount === undefined) return
      setValues((existing) => ({ ...existing, [field]: formatBrl(amount) }))
    } catch {
      // Keep the value so submit validation can explain how to correct it.
    }
  }

  const submit = () => {
    setFormError(null)
    setSuccessMessage(null)
    if (unsafe) {
      setFormError(donationMessages.unsafeBlocked)
      return
    }
    try {
      const body = buildDonationRequest(values, classification)
      const idempotencyKey = registry.current.keyFor(body)
      const operation = buildDonationPublishOperation(body, idempotencyKey)
      publishMutation.mutate(operation, {
        onSuccess(outcome) {
          if (outcome.status === 'confirmed') registry.current.forget(body)
          setSuccessMessage(
            outcome.status === 'queued'
              ? donationMessages.queued
              : donationMessages.published,
          )
          onPublished?.(outcome)
        },
      })
    } catch {
      setFormError(donationMessages.invalidForm)
      setSuccessMessage(null)
    }
  }

  const shelfLifeHours = Math.round((Number(values.perishabilityMinutes) / 60) * 10) / 10
  const weightPerItem =
    values.unit !== 'kg' && Number(values.quantity) > 0
      ? (Number(values.estimatedWeightKg) / Number(values.quantity)) * 1000
      : null
  const categoryLabel = values.category
    ? donationCategoryLabels[values.category as keyof typeof donationCategoryLabels]
    : 'Sem categoria'

  return (
    <form
      className="producer-confirm-form"
      // A required field inside a folded section would block publishing
      // silently: unfold it and say what to check.
      onInvalidCapture={(event) => {
        const details = (event.target as HTMLElement).closest('details')
        if (details) details.open = true
        setFormError(donationMessages.invalidForm)
      }}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <section
        className="screen-card producer-quantity"
        aria-labelledby="producer-quantity-title"
      >
        <h2 id="producer-quantity-title">
          {donationMessages.quantityTitle} <AiTag show={aiFields.has('quantity')} />
        </h2>

        <div className="producer-quantity__stepper">
          <button
            aria-label="Diminuir quantidade"
            onClick={() => changeQuantity(-1)}
            type="button"
          >
            <AppIcon name="minus" size={30} />
          </button>
          <input
            aria-label="Quantidade"
            min={values.unit === 'kg' ? '0.5' : '1'}
            onChange={(event) => setQuantity(event.target.value)}
            required
            step="any"
            type="number"
            value={values.quantity}
          />
          <button
            aria-label="Aumentar quantidade"
            className="producer-quantity__plus"
            onClick={() => changeQuantity(1)}
            type="button"
          >
            <AppIcon name="plus" size={30} />
          </button>
        </div>

        <fieldset className="producer-segmented">
          <legend className="sr-only">Unidade da quantidade</legend>
          {donationUnitSchema.options.map((unit) => (
            <button
              aria-pressed={values.unit === unit}
              className="screen-chip"
              key={unit}
              onClick={() => setUnit(unit)}
              type="button"
            >
              {donationUnitLabels[unit]}
            </button>
          ))}
        </fieldset>

        <label className="producer-weight">
          <span>
            Peso total <AiTag show={aiFields.has('estimatedWeightKg')} />
          </span>
          <span className="producer-weight__field">
            <input
              aria-label="Peso total em kg"
              inputMode="decimal"
              min="0.1"
              onChange={(event) => update('estimatedWeightKg', event.target.value)}
              required
              step="any"
              type="number"
              value={values.estimatedWeightKg}
            />
            kg
          </span>
          {weightPerItem !== null && Number.isFinite(weightPerItem) && weightPerItem > 0 ? (
            <small>
              ≈ {weightPerItem >= 1000
                ? `${(weightPerItem / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
                : `${Math.round(weightPerItem)} g`}{' '}
              por {singularUnit[values.unit] ?? 'item'}.
              Mudou a quantidade? O peso acompanha.
            </small>
          ) : null}
        </label>
      </section>

      <section
        className="screen-card producer-expiry"
        aria-labelledby="producer-expiry-title"
      >
        <h2 id="producer-expiry-title">{donationMessages.expiryTitle}</h2>
        <fieldset className="producer-expiry__presets">
          <legend className="sr-only">Prazo para retirada</legend>
          {expiryPresets.map((preset) => (
            <button
              aria-pressed={!customExpiry && values.expiryMinutes === String(preset.minutes)}
              className="screen-chip"
              key={preset.minutes}
              onClick={() => selectExpiry(preset.minutes)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
          <button
            aria-pressed={customExpiry}
            className="screen-chip"
            onClick={() => {
              setCustomExpiry(true)
              update('expiryTime', clock(pickupWindow.expiresAt))
            }}
            type="button"
          >
            Outro
          </button>
        </fieldset>
        {customExpiry ? (
          <label className="producer-expiry__custom">
            Retirar até às
            <input
              onChange={(event) => update('expiryTime', event.target.value)}
              required
              type="time"
              value={values.expiryTime}
            />
          </label>
        ) : null}
        <p className="producer-expiry__summary">
          <AppIcon name="clock" size={18} />
          <span>
            Até <strong>{clock(pickupWindow.expiresAt)}</strong> (daqui a {inMinutes(Math.max(0, minutesLeft))}).
            {pickupWindow.capped
              ? ` A IA estima que o alimento fica bom por ~${shelfLifeHours}h, então limitamos o prazo.`
              : ''}
          </span>
        </p>
      </section>

      <PickupLocation
        apiClient={apiClient}
        fromShop={Boolean(shopAddress)}
        setValues={setValues}
        values={values}
      />

      <details
        className="screen-card producer-financial"
        open={aiFields.has('unitValueBrl') || aiFields.has('disposalCostBrl') || undefined}
      >
        <summary id="producer-financial-title">
          <span>
            {donationMessages.financialTitle}
            {values.unitValueBrl || values.disposalCostBrl ? (
              <small>
                {values.unitValueBrl ? `R$ ${values.unitValueBrl}/kg` : ''}
                {values.unitValueBrl && values.disposalCostBrl ? ' · ' : ''}
                {values.disposalCostBrl ? `descarte R$ ${values.disposalCostBrl}` : ''}
              </small>
            ) : null}
          </span>
        </summary>
        <p className="producer-financial__notice" id="financial-values-notice">
          {donationMessages.financialNotice}
        </p>
        <div className="producer-financial__fields">
          <label>
            <span>
              {donationMessages.unitValueLabel} <AiTag show={aiFields.has('unitValueBrl')} />
            </span>
            <input
              aria-describedby="financial-values-notice unit-value-help"
              autoComplete="off"
              inputMode="decimal"
              onBlur={() => formatCurrencyField('unitValueBrl')}
              onChange={(event) =>
                update('unitValueBrl', event.target.value)
              }
              placeholder="Ex.: 4,20"
              type="text"
              value={values.unitValueBrl}
            />
            <small id="unit-value-help">
              {donationMessages.unitValueHelp}
            </small>
          </label>
          <label>
            <span>
              {donationMessages.disposalCostLabel} <AiTag show={aiFields.has('disposalCostBrl')} />
            </span>
            <input
              aria-describedby="financial-values-notice disposal-cost-help"
              autoComplete="off"
              inputMode="decimal"
              onBlur={() => formatCurrencyField('disposalCostBrl')}
              onChange={(event) =>
                update('disposalCostBrl', event.target.value)
              }
              placeholder="Ex.: 35,00"
              type="text"
              value={values.disposalCostBrl}
            />
            <small id="disposal-cost-help">
              {donationMessages.disposalCostHelp}
            </small>
          </label>
        </div>
      </details>

      <details className="screen-card producer-details">
        <summary>
          <span>
            {donationMessages.publicationDetails}
            <small>
              {categoryLabel} · bom por ~{shelfLifeHours}h
            </small>
          </span>
        </summary>
        <div className="producer-details__content">
          <label>
            <span>
              Categoria <AiTag show={aiFields.has('category')} />
            </span>
            <select
              onChange={(event) => update('category', event.target.value)}
              required
              value={values.category}
            >
              <option value="">Selecione</option>
              {donationCategorySchema.options.map((category) => (
                <option key={category} value={category}>
                  {donationCategoryLabels[category]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>
              Descrição <AiTag show={aiFields.has('description')} />
            </span>
            <textarea
              onChange={(event) => update('description', event.target.value)}
              placeholder="Ex.: pães franceses de hoje"
              required
              value={values.description}
            />
          </label>

          <label>
            <span>
              Fica bom para consumo por (horas){' '}
              <AiTag show={aiFields.has('perishabilityMinutes')} />
            </span>
            <input
              inputMode="decimal"
              max="168"
              min="0.25"
              onChange={(event) =>
                update(
                  'perishabilityMinutes',
                  String(Math.round(Number(event.target.value) * 60)),
                )
              }
              required
              step="any"
              type="number"
              value={shelfLifeHours}
            />
          </label>
        </div>
      </details>

      {unsafe ? (
        <div
          className="producer-form-message producer-form-message--error"
          role="alert"
        >
          {donationMessages.unsafeBlocked}
        </div>
      ) : null}

      {formError || publishMutation.isError ? (
        <div
          className="producer-form-message producer-form-message--error"
          role="alert"
        >
          {formError ||
            publishMutation.error?.message ||
            'Não foi possível publicar a doação.'}
        </div>
      ) : null}

      {successMessage ? (
        <output className="producer-form-message">
          <StatusBadge label={successMessage} tone="success" />
        </output>
      ) : null}

      <div className="producer-confirm-form__submit">
        <Button
          className="w-full"
          disabled={publishMutation.isPending || unsafe}
          icon="arrow-right"
          type="submit"
          variant="primary"
        >
          {publishMutation.isPending
            ? donationMessages.publishing
            : donationMessages.publish}
        </Button>
      </div>
    </form>
  )
}
