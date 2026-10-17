import { donationCategorySchema, type DonationCategory } from '@resgata/shared'
import { useState } from 'react'
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../../shared/ui'
import { useMyNeeds, useNeedMutations, useNgoAvailability } from '../api/needs'
import { needMessages } from '../messages'
import {
  defaultNeedDeadline,
  formatDeadline,
  formatKg,
  needCategoryLabels,
  needProgress,
} from '../model/needs'

const inputClass =
  'min-h-12 rounded-control border border-border bg-surface px-3 font-normal'

const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function AvailabilityCard() {
  const availability = useNgoAvailability()
  const { updateAvailability } = useNeedMutations()
  const [draft, setDraft] = useState<{
    availableCapacityKg: string
    receivingEnd: string
    receivingStart: string
  } | null>(null)

  if (availability.isPending) return <LoadingState label={needMessages.loadingAvailability} />
  if (availability.isError) return null
  const values = draft ?? {
    availableCapacityKg: String(availability.data.availableCapacityKg),
    receivingEnd: availability.data.receivingEnd,
    receivingStart: availability.data.receivingStart,
  }
  const set = (field: keyof typeof values, value: string) =>
    setDraft({ ...values, [field]: value })

  return (
    <Card className="grid gap-4">
      <div>
        <span className="eyebrow">{needMessages.availabilityEyebrow}</span>
        <h2 className="mb-1 text-xl font-extrabold">{needMessages.availabilityTitle}</h2>
        <p className="mb-0 text-sm">{needMessages.availabilityDescription}</p>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          updateAvailability.mutate(
            {
              availableCapacityKg: Number(values.availableCapacityKg),
              receivingEnd: values.receivingEnd,
              receivingStart: values.receivingStart,
            },
            { onSuccess: () => setDraft(null) },
          )
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-2 font-bold">
            {needMessages.receivingStart}
            <input
              className={inputClass}
              onChange={(event) => set('receivingStart', event.target.value)}
              required
              type="time"
              value={values.receivingStart}
            />
          </label>
          <label className="grid gap-2 font-bold">
            {needMessages.receivingEnd}
            <input
              className={inputClass}
              onChange={(event) => set('receivingEnd', event.target.value)}
              required
              type="time"
              value={values.receivingEnd}
            />
          </label>
          <label className="grid gap-2 font-bold">
            {needMessages.capacityToday}
            <input
              className={inputClass}
              inputMode="decimal"
              max={availability.data.capacityKg}
              min="0"
              onChange={(event) => set('availableCapacityKg', event.target.value)}
              required
              step="1"
              type="number"
              value={values.availableCapacityKg}
            />
          </label>
        </div>
        {draft ? (
          <Button disabled={updateAvailability.isPending} type="submit" variant="primary">
            {updateAvailability.isPending ? needMessages.saving : needMessages.saveAvailability}
          </Button>
        ) : null}
        {updateAvailability.isError ? (
          <p className="mb-0 text-sm text-danger" role="alert">
            {updateAvailability.error.message}
          </p>
        ) : null}
      </form>
    </Card>
  )
}

function NewNeedForm() {
  const { create } = useNeedMutations()
  const [category, setCategory] = useState<DonationCategory>('bakery')
  const [quantityKg, setQuantityKg] = useState('20')
  const [neededBy, setNeededBy] = useState(() => toLocalDate(defaultNeedDeadline()))
  const [today] = useState(() => toLocalDate(new Date()))
  const [notes, setNotes] = useState('')

  return (
    <Card className="grid gap-4">
      <div>
        <span className="eyebrow">{needMessages.newEyebrow}</span>
        <h2 className="mb-1 text-xl font-extrabold">{needMessages.newTitle}</h2>
        <p className="mb-0 text-sm">{needMessages.newDescription}</p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const deadline = new Date(`${neededBy}T20:00`)
          create.mutate(
            {
              category,
              neededBy: deadline.toISOString(),
              notes: notes.trim() || undefined,
              quantityKg: Number(quantityKg),
            },
            { onSuccess: () => setNotes('') },
          )
        }}
      >
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-bold">{needMessages.whatYouNeed}</legend>
          <div className="flex flex-wrap gap-2">
            {donationCategorySchema.options.map((option) => (
              <Button
                aria-pressed={category === option}
                key={option}
                onClick={() => setCategory(option)}
                variant={category === option ? 'primary' : 'secondary'}
              >
                {needCategoryLabels[option]}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 font-bold">
            {needMessages.howMuch}
            <input
              className={inputClass}
              inputMode="decimal"
              min="1"
              onChange={(event) => setQuantityKg(event.target.value)}
              required
              step="1"
              type="number"
              value={quantityKg}
            />
          </label>
          <label className="grid gap-2 font-bold">
            {needMessages.until}
            <input
              className={inputClass}
              min={today}
              onChange={(event) => setNeededBy(event.target.value)}
              required
              type="date"
              value={neededBy}
            />
          </label>
        </div>
        <label className="grid gap-2 font-bold">
          {needMessages.notes}
          <input
            className={inputClass}
            maxLength={300}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={needMessages.notesPlaceholder}
            value={notes}
          />
        </label>
        <Button disabled={create.isPending} type="submit" variant="primary">
          {create.isPending ? needMessages.publishing : needMessages.publish}
        </Button>
        {create.isError ? (
          <p className="mb-0 text-sm text-danger" role="alert">
            {create.error.message}
          </p>
        ) : null}
        {create.isSuccess ? (
          <StatusBadge label={needMessages.published} tone="success" />
        ) : null}
      </form>
    </Card>
  )
}

export function NgoNeedsPage() {
  const needs = useMyNeeds()
  const { cancel } = useNeedMutations()

  return (
    <div className="grid gap-5">
      <NewNeedForm />
      <AvailabilityCard />
      <section className="grid gap-3">
        <h2 className="mb-0 text-xl font-extrabold">{needMessages.listTitle}</h2>
        {needs.isPending ? <LoadingState label={needMessages.loading} /> : null}
        {needs.isError ? (
          <EmptyState
            description={needs.error.message}
            icon="warning"
            title={needMessages.loadError}
          />
        ) : null}
        {needs.data && !needs.data.length ? (
          <EmptyState description={needMessages.emptyDescription} title={needMessages.emptyTitle} />
        ) : null}
        {needs.data?.map((need) => (
          <Card className="grid gap-2" key={need.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{needCategoryLabels[need.category]}</strong>
              <StatusBadge
                label={needMessages.status[need.status]}
                tone={need.status === 'open' ? 'info' : need.status === 'fulfilled' ? 'success' : 'neutral'}
              />
            </div>
            <p className="mb-0 text-sm">
              {formatKg(need.quantityKg - need.remainingKg)} {needMessages.of}{' '}
              {formatKg(need.quantityKg)} · {needMessages.until.toLowerCase()}{' '}
              {formatDeadline(need.neededBy)}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${needProgress(need)}%` }} />
            </div>
            {need.notes ? <p className="mb-0 text-sm">{need.notes}</p> : null}
            {need.status === 'open' ? (
              <Button
                className="justify-self-start"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(need.id)}
                variant="ghost"
              >
                {needMessages.cancel}
              </Button>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  )
}
