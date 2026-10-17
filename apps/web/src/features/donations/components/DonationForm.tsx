import {
  donationCategorySchema,
  donationUnitSchema,
  type Address,
  type Classification,
} from '@resgata/shared'
import { useEffect, useRef, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { createIdempotencyKey } from '../../../shared/api'
import { Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
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
  toLocalInput,
  type DonationFormValues,
  type DonationPublisher,
  type DonationPublishOutcome,
} from '../model/publish'

const createInitialValues = (shopAddress?: Address | null): DonationFormValues => {
  const available = new Date()
  available.setMinutes(available.getMinutes() + 15)
  const expires = new Date(available)
  expires.setHours(expires.getHours() + 6)
  return {
    availableFrom: toLocalInput(available),
    category: '',
    // Replaced by the shop's registered address as soon as it loads.
    city: 'Campinas',
    description: '',
    district: 'Cambuí',
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
    ...(shopAddress ? applyAddress({} as DonationFormValues, shopAddress) : {}),
  }
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
    setValues((current) => applyClassification(current, classification))
  }, [classification])

  const unsafe = isUnsafeClassification(classification)

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
            Retirar até
            <input
              className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
              onChange={(event) => update('expiresAt', event.target.value)}
              required
              type="datetime-local"
              value={values.expiresAt}
            />
          </label>
        </div>

        <PickupLocation
          apiClient={apiClient}
          fromShop={Boolean(shopAddress)}
          setValues={setValues}
          values={values}
        />

        <details className="rounded-card border border-border p-4">
          <summary className="cursor-pointer font-extrabold">
            {donationMessages.moreOptions}
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        </details>

        {unsafe ? (
          <div
            className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            role="alert"
          >
            {donationMessages.unsafeBlocked}
          </div>
        ) : null}

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
          disabled={publishMutation.isPending || unsafe}
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
