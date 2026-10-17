import {
  createDeliveryReceiptRequestSchema,
  type CreateDeliveryReceiptRequest,
  type DeliveryReceipt,
  type DeliveryReceiptCondition,
  type Pickup,
} from '@resgata/shared'
import { useState } from 'react'
import { Button, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import {
  pickupErrorMessage,
  pickupMessages,
  receiptEstimatedWeightMessage,
  receiptConditionLabels,
  receiptReasonOptions,
  receiptWeightToleranceMessage,
} from '../messages'
import { receiptWeightDefaults } from '../viewModels'

interface DeliveryReceiptPanelProps {
  busy: boolean
  onCreate(input: {
    pickupId: string
    receipt: CreateDeliveryReceiptRequest
  }): Promise<DeliveryReceipt>
  pickup: Pickup
}

const formatWeight = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function ReceiptSummary({ receipt }: { receipt: DeliveryReceipt }) {
  return (
    <div className="receipt-summary">
      <div className="receipt-summary__heading">
        <div>
          <span className="eyebrow">
            {pickupMessages.receiptSummaryEyebrow}
          </span>
          <h3>{receiptConditionLabels[receipt.condition]}</h3>
        </div>
        <StatusBadge
          label={pickupMessages.receiptSummaryStatus}
          tone="success"
        />
      </div>

      <dl className="receipt-summary__metrics">
        <div>
          <dt>{pickupMessages.receiptFormReceivedWeight}</dt>
          <dd>{formatWeight(receipt.receivedWeightKg)} kg</dd>
        </div>
        <div>
          <dt>{pickupMessages.receiptFormRejectedWeight}</dt>
          <dd>{formatWeight(receipt.rejectedWeightKg)} kg</dd>
        </div>
      </dl>

      {receipt.rejectionReasons.length > 0 ? (
        <div className="receipt-summary__reasons">
          <strong>{pickupMessages.receiptReasonsTitle}</strong>
          <ul>
            {receipt.rejectionReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {receipt.notes ? (
        <p className="receipt-summary__notes">
          <strong>{pickupMessages.receiptSummaryNotes}</strong> {receipt.notes}
        </p>
      ) : null}

      <p className="receipt-summary__locked">{pickupMessages.receiptLocked}</p>
      {receipt.simulated ? <SimuladoBadge /> : null}
    </div>
  )
}

function ReceiptForm({
  busy,
  onCreate,
  pickup,
}: DeliveryReceiptPanelProps) {
  const [condition, setCondition] =
    useState<DeliveryReceiptCondition>('all_good')
  const initialWeights = receiptWeightDefaults(
    'all_good',
    pickup.estimatedWeightKg,
  )
  const [receivedWeightKg, setReceivedWeightKg] = useState(
    initialWeights.receivedWeightKg,
  )
  const [rejectedWeightKg, setRejectedWeightKg] = useState(
    initialWeights.rejectedWeightKg,
  )
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const changeCondition = (nextCondition: DeliveryReceiptCondition) => {
    const weights = receiptWeightDefaults(
      nextCondition,
      pickup.estimatedWeightKg,
    )
    setCondition(nextCondition)
    setReceivedWeightKg(weights.receivedWeightKg)
    setRejectedWeightKg(weights.rejectedWeightKg)
    if (nextCondition === 'all_good') setRejectionReasons([])
    setError(null)
  }

  const toggleReason = (reason: string) => {
    setRejectionReasons((current) =>
      current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason],
    )
  }

  const submit = async () => {
    setError(null)
    const result = createDeliveryReceiptRequestSchema.safeParse({
      condition,
      notes: notes.trim() || undefined,
      receivedWeightKg,
      rejectedWeightKg,
      rejectionReasons,
    })

    if (!result.success) {
      setError(
        pickupMessages.receiptFormValidation,
      )
      return
    }

    try {
      await onCreate({ pickupId: pickup.id, receipt: result.data })
    } catch (caught) {
      setError(pickupErrorMessage(caught, pickupMessages.receiptError))
    }
  }

  return (
    <form
      className="receipt-form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="receipt-form__heading">
        <p>
          {receiptEstimatedWeightMessage(
            formatWeight(pickup.estimatedWeightKg),
          )}
        </p>
      </div>

      <fieldset className="receipt-form__conditions">
        <legend>{pickupMessages.receiptFormConditionLegend}</legend>
        <div>
          {(
            Object.entries(receiptConditionLabels) as Array<
              [DeliveryReceiptCondition, string]
            >
          ).map(([value, label]) => (
            <label className={condition === value ? 'is-selected' : ''} key={value}>
              <input
                checked={condition === value}
                name={`receipt-condition-${pickup.id}`}
                onChange={() => changeCondition(value)}
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="receipt-form__weights">
        <label>
          <span>{pickupMessages.receiptFormReceivedWeight}</span>
          <span className="receipt-form__weight-input">
            <input
              min="0"
              onChange={(event) =>
                setReceivedWeightKg(Number(event.target.value))
              }
              step="0.01"
              type="number"
              value={receivedWeightKg}
            />
            <strong>kg</strong>
          </span>
        </label>
        <label>
          <span>{pickupMessages.receiptFormRejectedWeight}</span>
          <span className="receipt-form__weight-input">
            <input
              min="0"
              onChange={(event) =>
                setRejectedWeightKg(Number(event.target.value))
              }
              step="0.01"
              type="number"
              value={rejectedWeightKg}
            />
            <strong>kg</strong>
          </span>
        </label>
      </div>

      {condition !== 'all_good' ? (
        <fieldset className="receipt-form__reasons">
          <legend>{pickupMessages.receiptFormReasonsLegend}</legend>
          <div>
            {receiptReasonOptions.map((reason) => (
              <label
                className={rejectionReasons.includes(reason) ? 'is-selected' : ''}
                key={reason}
              >
                <input
                  checked={rejectionReasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                  type="checkbox"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="receipt-form__notes">
        <span>{pickupMessages.receiptFormNotesLabel}</span>
        <textarea
          maxLength={2000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={pickupMessages.receiptFormNotesPlaceholder}
          rows={3}
          value={notes}
        />
      </label>

      <p className="receipt-form__weight-note">
        {receiptWeightToleranceMessage(
          formatWeight(pickup.estimatedWeightKg),
        )}
      </p>

      {error ? (
        <p className="receipt-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={busy} icon="check" type="submit" variant="primary">
        {busy
          ? pickupMessages.receiptFormBusy
          : pickupMessages.receiptFormSubmit}
      </Button>
    </form>
  )
}

export function DeliveryReceiptPanel(props: DeliveryReceiptPanelProps) {
  if (props.pickup.receipt) {
    return <ReceiptSummary receipt={props.pickup.receipt} />
  }

  if (props.pickup.status !== 'delivered') {
    return (
      <div className="receipt-pending">
        <span className="eyebrow">Conferência no recebimento</span>
        <p>{pickupMessages.receiptPending}</p>
      </div>
    )
  }

  return <ReceiptForm {...props} />
}
