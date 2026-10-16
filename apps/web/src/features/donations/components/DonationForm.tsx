import {
  donationCategorySchema,
  donationUnitSchema,
  type Classification,
} from '@resgata/shared'
import { useEffect, useRef, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { createIdempotencyKey } from '../../../shared/api'
import { Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
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
  expires.setHours(expires.getHours() + 6)
  return {
    availableFrom: toLocalInput(available),
    category: '',
    description: '',
    district: 'Cambuí',
    estimatedWeightKg: '5',
    expiresAt: toLocalInput(expires),
    line1: 'Rua Coronel Quirino, 900',
    perishabilityMinutes: '360',
    postalCode: '13025-001',
    quantity: '10',
    unit: 'unit',
  }
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

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{donationMessages.donateEyebrow}</span>
          <h2 className="mb-2 text-xl font-extrabold">
            {donationMessages.donateTitle}
          </h2>
          <p className="mb-0 text-sm">{donationMessages.donateDescription}</p>
        </div>
        <SimuladoBadge />
      </div>

      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
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
            setFormError(
              'Revise os campos, o CEP e o período de disponibilidade antes de publicar.',
            )
            setSuccessMessage(null)
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 font-bold">
            Categoria
            <select
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
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

          <label className="grid gap-2 font-bold">
            Unidade
            <select
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              onChange={(event) => update('unit', event.target.value)}
              value={values.unit}
            >
              {donationUnitSchema.options.map((unit) => (
                <option key={unit} value={unit}>
                  {donationUnitLabels[unit]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 font-bold">
          Descrição
          <textarea
            className="min-h-28 rounded-control border border-border bg-surface p-3 font-normal"
            onChange={(event) => update('description', event.target.value)}
            placeholder="Descreva o alimento e suas condições"
            required
            value={values.description}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 font-bold">
            Quantidade
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              min="0.1"
              onChange={(event) => update('quantity', event.target.value)}
              required
              step="0.1"
              type="number"
              value={values.quantity}
            />
          </label>
          <label className="grid gap-2 font-bold">
            Peso estimado (kg)
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
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
          <label className="grid gap-2 font-bold">
            Validade estimada (min)
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
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

        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-2 font-extrabold">Local de retirada</legend>
          <label className="grid gap-2 font-bold">
            Endereço
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              onChange={(event) => update('line1', event.target.value)}
              required
              value={values.line1}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 font-bold">
              Bairro
              <input
                className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
                onChange={(event) => update('district', event.target.value)}
                required
                value={values.district}
              />
            </label>
            <label className="grid gap-2 font-bold">
              CEP
              <input
                className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
                inputMode="numeric"
                onChange={(event) => update('postalCode', event.target.value)}
                pattern="[0-9]{5}-?[0-9]{3}"
                required
                value={values.postalCode}
              />
            </label>
          </div>
          <p className="mb-0 text-xs">
            Campinas/SP · coordenadas de demonstração do Cambuí.
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 font-bold">
            Disponível a partir de
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              onChange={(event) => update('availableFrom', event.target.value)}
              required
              type="datetime-local"
              value={values.availableFrom}
            />
          </label>
          <label className="grid gap-2 font-bold">
            Disponível até
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              onChange={(event) => update('expiresAt', event.target.value)}
              required
              type="datetime-local"
              value={values.expiresAt}
            />
          </label>
        </div>

        {formError || publishMutation.isError ? (
          <div
            className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            role="alert"
          >
            {formError ||
              publishMutation.error?.message ||
              'Não foi possível publicar a doação.'}
          </div>
        ) : null}

        {successMessage ? (
          <output className="block">
            <StatusBadge label={successMessage} tone="success" />
          </output>
        ) : null}

        <Button
          className="w-full"
          disabled={publishMutation.isPending}
          icon="donation"
          type="submit"
          variant="primary"
        >
          {publishMutation.isPending
            ? donationMessages.publishing
            : donationMessages.publish}
        </Button>
      </form>
    </Card>
  )
}
