import {
  donationCategorySchema,
  donationUnitSchema,
  type Address,
  type Classification,
} from '@resgata/shared'
import { useEffect, useRef, useState } from 'react'
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
  isUnsafeClassification,
  parseOptionalBrl,
  toLocalInput,
  type DonationFormValues,
  type DonationPublisher,
  type DonationPublishOutcome,
} from '../model/publish'

const createInitialValues = (shopAddress?: Address | null): DonationFormValues => {
  const available = new Date()
  available.setMinutes(available.getMinutes() + 15)
  const expires = new Date(available)
  expires.setHours(expires.getHours() + 2)
  const values: DonationFormValues = {
    availableFrom: toLocalInput(available),
    category: '',
    // Replaced by the shop's registered address when it is available.
    city: 'Campinas',
    description: '',
    district: 'Cambuí',
    disposalCostBrl: '',
    estimatedWeightKg: '5',
    expiresAt: toLocalInput(expires),
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

type ExpiryPreset = '1h' | '2h' | '3h' | 'today' | 'custom'

const expiryPresets: Array<{
  label: string
  value: Exclude<ExpiryPreset, 'custom'>
}> = [
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '3h', value: '3h' },
  { label: 'Hoje', value: 'today' },
]

const createExpiryValue = (preset: Exclude<ExpiryPreset, 'custom'>) => {
  const expires = new Date()
  if (preset === 'today') {
    expires.setHours(23, 59, 0, 0)
  } else {
    expires.setHours(expires.getHours() + Number.parseInt(preset, 10))
  }
  return toLocalInput(expires)
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
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('2h')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const appliedClassification = useRef<string | null>(null)
  const registry = useRef(
    createStableIdempotencyRegistry(createIdempotencyKey),
  )
  const publishMutation = usePublishDonation(apiClient, publisher)

  useEffect(() => {
    if (!classification) return
    const signature = JSON.stringify(classification)
    if (appliedClassification.current === signature) return
    appliedClassification.current = signature
    setValues((current) => {
      const next = applyClassification(current, classification)
      // The analysis shortened the deadline to the food's safe window.
      if (next.expiresAt !== current.expiresAt) setExpiryPreset('custom')
      return next
    })
  }, [classification])

  const unsafe = isUnsafeClassification(classification)

  const update = (field: keyof DonationFormValues, value: string) => {
    setFormError(null)
    setSuccessMessage(null)
    setValues((current) => ({ ...current, [field]: value }))
  }

  const changeQuantity = (direction: -1 | 1) => {
    const step = values.unit === 'kg' ? 0.5 : 1
    const current = Number(values.quantity) || step
    update('quantity', String(Math.max(step, current + direction * step)))
  }

  const selectExpiry = (preset: Exclude<ExpiryPreset, 'custom'>) => {
    setExpiryPreset(preset)
    update('expiresAt', createExpiryValue(preset))
  }

  const formatCurrencyField = (
    field: 'disposalCostBrl' | 'unitValueBrl',
  ) => {
    const current = values[field]
    if (!current.trim()) return
    try {
      const amount = parseOptionalBrl(current)
      if (amount === undefined) return
      update(
        field,
        new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format(amount),
      )
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

  return (
    <form
      className="producer-confirm-form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <section
        className="screen-card producer-quantity"
        aria-labelledby="producer-quantity-title"
      >
        <h2 id="producer-quantity-title">{donationMessages.quantityTitle}</h2>

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
            onChange={(event) => update('quantity', event.target.value)}
            required
            step={values.unit === 'kg' ? '0.5' : '1'}
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
              onClick={() => update('unit', unit)}
              type="button"
            >
              {donationUnitLabels[unit]}
            </button>
          ))}
        </fieldset>
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
              aria-pressed={expiryPreset === preset.value}
              className="screen-chip"
              key={preset.value}
              onClick={() => selectExpiry(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </fieldset>
      </section>

      <PickupLocation
        apiClient={apiClient}
        fromShop={Boolean(shopAddress)}
        setValues={setValues}
        values={values}
      />

      <section
        className="screen-card producer-financial"
        aria-labelledby="producer-financial-title"
      >
        <div>
          <span className="eyebrow">{donationMessages.optional}</span>
          <h2 id="producer-financial-title">
            {donationMessages.financialTitle}
          </h2>
        </div>
        <p className="producer-financial__notice" id="financial-values-notice">
          {donationMessages.financialNotice}
        </p>
        <div className="producer-financial__fields">
          <label>
            {donationMessages.unitValueLabel}
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
            {donationMessages.disposalCostLabel}
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
      </section>

      <details className="screen-card producer-details">
        <summary>{donationMessages.publicationDetails}</summary>
        <div className="producer-details__content">
          <label>
            Categoria
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
            Descrição
            <textarea
              onChange={(event) => update('description', event.target.value)}
              placeholder="Descreva o alimento e suas condições"
              required
              value={values.description}
            />
          </label>

          <div className="producer-details__grid">
            <label>
              Peso estimado (kg)
              <input
                inputMode="decimal"
                min="0.1"
                onChange={(event) =>
                  update('estimatedWeightKg', event.target.value)
                }
                required
                step="0.1"
                type="number"
                value={values.estimatedWeightKg}
              />
            </label>
            <label>
              Validade estimada (min)
              <input
                max="10080"
                min="15"
                onChange={(event) =>
                  update('perishabilityMinutes', event.target.value)
                }
                required
                type="number"
                value={values.perishabilityMinutes}
              />
            </label>
          </div>



          <div className="producer-details__grid">
            <label>
              Disponível a partir de
              <input
                onChange={(event) =>
                  update('availableFrom', event.target.value)
                }
                required
                type="datetime-local"
                value={values.availableFrom}
              />
            </label>
            <label>
              Disponível até
              <input
                onChange={(event) => {
                  setExpiryPreset('custom')
                  update('expiresAt', event.target.value)
                }}
                required
                type="datetime-local"
                value={values.expiresAt}
              />
            </label>
          </div>

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
