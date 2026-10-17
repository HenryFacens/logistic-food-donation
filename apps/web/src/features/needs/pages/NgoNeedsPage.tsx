import {
  donationCategorySchema,
  donationUnitSchema,
  type DonationCategory,
  type DonationUnit,
} from '@resgata/shared'
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
  formatQuantity,
  needCategoryLabels,
  needProgress,
  needUnitLabels,
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
    <details className="screen-card needs-availability">
      <summary aria-label={needMessages.availabilityTitle}>
        <span>
          <strong>{needMessages.availabilityTitle}</strong>
          <small>
            {availability.data.receivingStart}–{availability.data.receivingEnd} ·{' '}
            {availability.data.availableCapacityKg.toLocaleString('pt-BR')} kg livres hoje
          </small>
        </span>
      </summary>
      <p className="mb-0 text-sm">{needMessages.availabilityDescription}</p>
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
    </details>
  )
}

function NewNeedForm({ onDone }: { onDone(published: boolean): void }) {
  const { create } = useNeedMutations()
  const [category, setCategory] = useState<DonationCategory>('bakery')
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<DonationUnit>('unit')
  const [neededBy, setNeededBy] = useState(() => toLocalDate(defaultNeedDeadline()))
  const [today] = useState(() => toLocalDate(new Date()))
  const [notes, setNotes] = useState('')

  return (
    <Card className="grid gap-4 border-2 border-primary">
      <div>
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
              item: item.trim(),
              neededBy: deadline.toISOString(),
              notes: notes.trim() || undefined,
              quantity: Number(quantity),
              unit,
            },
            {
              onSuccess: () => {
                setItem('')
                setQuantity('')
                setNotes('')
                onDone(true)
              },
            },
          )
        }}
      >
        <label className="grid gap-2 font-bold">
          {needMessages.item}
          <input
            className={inputClass}
            maxLength={120}
            minLength={2}
            onChange={(event) => setItem(event.target.value)}
            placeholder={needMessages.itemPlaceholder}
            required
            value={item}
          />
        </label>
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
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="grid gap-2 font-bold">
              {needMessages.howMuch}
              <input
                className={inputClass}
                inputMode="decimal"
                min="0.1"
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="60"
                required
                step="0.1"
                type="number"
                value={quantity}
              />
            </label>
            <label className="grid gap-2 font-bold">
              {needMessages.unit}
              <select
                className={inputClass}
                onChange={(event) => setUnit(event.target.value as DonationUnit)}
                value={unit}
              >
                {donationUnitSchema.options.map((option) => (
                  <option key={option} value={option}>
                    {needUnitLabels[option][1]}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
        <div className="grid grid-cols-[1fr_1.6fr] gap-2">
          <Button onClick={() => onDone(false)} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={create.isPending} type="submit" variant="primary">
            {create.isPending ? needMessages.publishing : needMessages.publish}
          </Button>
        </div>
        {create.isError ? (
          <p className="mb-0 text-sm text-danger" role="alert">
            {create.error.message}
          </p>
        ) : null}
      </form>
    </Card>
  )
}

export function NgoNeedsPage() {
  const needs = useMyNeeds()
  const { cancel } = useNeedMutations()
  const [creating, setCreating] = useState(false)
  const [justPublished, setJustPublished] = useState(false)
  const open = needs.data?.filter((need) => need.status === 'open') ?? []
  const closed = needs.data?.filter((need) => need.status !== 'open') ?? []

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="mb-1 text-[1.8rem]">{needMessages.listTitle}</h1>
        <p className="mb-0">{needMessages.newDescription}</p>
      </header>

      {creating ? (
        <NewNeedForm
          onDone={(published) => {
            setCreating(false)
            setJustPublished(published)
          }}
        />
      ) : (
        <Button
          icon="plus"
          onClick={() => {
            setJustPublished(false)
            setCreating(true)
          }}
          variant="primary"
        >
          {needMessages.newTitle}
        </Button>
      )}
      {justPublished && !creating ? (
        <output className="block font-bold text-success-strong">
          {needMessages.published}
        </output>
      ) : null}

      <section className="grid gap-3">
        {needs.isPending ? <LoadingState label={needMessages.loading} /> : null}
        {needs.isError && !needs.data ? (
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void needs.refetch()}>
                Tentar novamente
              </Button>
            }
            description="Verifique sua conexão e tente de novo."
            icon="warning"
            title={needMessages.loadError}
          />
        ) : null}
        {needs.data && !open.length && !creating ? (
          <EmptyState description={needMessages.emptyDescription} icon="heart" title={needMessages.emptyTitle} />
        ) : null}
        {[...open, ...closed.slice(0, 5)].map((need) => (
          <Card className="grid gap-2" key={need.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong className="text-lg">{need.item}</strong>{' '}
                <span className="text-sm text-muted">· {needCategoryLabels[need.category]}</span>
              </span>
              <StatusBadge
                label={needMessages.status[need.status]}
                tone={need.status === 'open' ? 'info' : need.status === 'fulfilled' ? 'success' : 'neutral'}
              />
            </div>
            <p className="mb-0">
              Recebido {formatQuantity(need.quantity - need.remainingQuantity, need.unit)}{' '}
              {needMessages.of} {formatQuantity(need.quantity, need.unit)} · até{' '}
              {formatDeadline(need.neededBy)}
            </p>
            <progress
              aria-label={`${Math.round(needProgress(need))}% recebido`}
              className="need-progress"
              max={100}
              value={needProgress(need)}
            />
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

      <AvailabilityCard />
    </div>
  )
}
