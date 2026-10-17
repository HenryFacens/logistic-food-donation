import {
  donationCategorySchema,
  donationUnitSchema,
  type Classification,
} from '@resgata/shared'
import { useEffect, useRef, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { createIdempotencyKey } from '../../../shared/api'
import { AppIcon, Button, StatusBadge } from '../../../shared/ui'
import { usePublishDonation } from '../api/donations'
import { donationMessages } from '../messages'
import {
  donationCategoryLabels,
  donationUnitLabels,
} from '../model/donationView'
import {
  buildDonationPublishOperation,
  buildDonationRequest,
  createStableIdempotencyRegistry,
  parseOptionalBrl,
  type DonationFormValues,
  type DonationPublisher,
  type DonationPublishOutcome,
} from '../model/publish'

const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const createInitialValues = (): DonationFormValues => {
  const available = new Date()
  available.setMinutes(available.getMinutes() + 15)
  const expires = new Date(available)
  expires.setHours(expires.getHours() + 2)
  return {
    availableFrom: toLocalInput(available),
    category: '',
    description: '',
    district: 'Cambuí',
    disposalCostBrl: '',
    estimatedWeightKg: '5',
    expiresAt: toLocalInput(expires),
    line1: 'Rua Coronel Quirino, 900',
    perishabilityMinutes: '360',
    postalCode: '13025-001',
    quantity: '10',
    unit: 'unit',
    unitValueBrl: '',
  }
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
}

export function DonationForm({
  apiClient,
  classification,
  onPublished,
  publisher,
}: DonationFormProps) {
  const [values, setValues] = useState(createInitialValues)
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
    setValues((current) => ({
      ...current,
      category: classification.category,
      description: classification.description.replace(/\s+—\s+SIMULADO$/u, ''),
      perishabilityMinutes: String(classification.perishabilityMinutes),
    }))
  }, [classification])

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
        <p className="producer-expiry__address">
          <AppIcon name="location" />
          <span>
            {values.line1} · {values.district}
          </span>
        </p>
      </section>

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

          <fieldset>
            <legend>{donationMessages.pickupLocation}</legend>
            <label>
              Endereço
              <input
                onChange={(event) => update('line1', event.target.value)}
                required
                value={values.line1}
              />
            </label>
            <div className="producer-details__grid">
              <label>
                Bairro
                <input
                  onChange={(event) => update('district', event.target.value)}
                  required
                  value={values.district}
                />
              </label>
              <label>
                CEP
                <input
                  inputMode="numeric"
                  onChange={(event) => update('postalCode', event.target.value)}
                  pattern="[0-9]{5}-?[0-9]{3}"
                  required
                  value={values.postalCode}
                />
              </label>
            </div>
          </fieldset>

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

          <p>Campinas/SP · coordenadas de demonstração do Cambuí.</p>
        </div>
      </details>

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
          disabled={publishMutation.isPending}
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
