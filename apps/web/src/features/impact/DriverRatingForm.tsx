import type {
  CreateDriverRatingRequest,
  DriverRatingOpportunity,
} from '@resgata/shared'
import { useState, type FormEvent } from 'react'
import { Button, Card } from '../../shared/ui'
import { sellerMetricsMessages } from './messages'
import {
  parseDriverRatingDraft,
  withoutSimulationMarker,
} from './rating-view-model'

interface DriverRatingFormProps {
  isDisabled: boolean
  isSubmitting: boolean
  onSubmit(request: CreateDriverRatingRequest): void
  opportunity: DriverRatingOpportunity
  submissionError?: string
}

const scoreOptions = [1, 2, 3, 4, 5] as const

const formatAvailableAt = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export function DriverRatingForm({
  isDisabled,
  isSubmitting,
  onSubmit,
  opportunity,
  submissionError,
}: DriverRatingFormProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string>()
  const messages = sellerMetricsMessages.ratings

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags((current) =>
      checked
        ? [...new Set([...current, tag])]
        : current.filter((item) => item !== tag),
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = parseDriverRatingDraft({ comment, rating, tags })

    if (!result.success) {
      setValidationError(
        result.reason === 'rating-required'
          ? messages.ratingRequired
          : messages.invalid,
      )
      return
    }

    setValidationError(undefined)
    onSubmit(result.request)
  }

  const error = validationError ?? submissionError

  return (
    <Card className="driver-rating-card">
      <div className="driver-rating-card__heading">
        <div>
          <span className="driver-rating-card__item">
            {withoutSimulationMarker(opportunity.donationDescription)}
          </span>
          <h3>{withoutSimulationMarker(opportunity.driverDisplayName)}</h3>
        </div>
        <span className="driver-rating-card__date">
          {messages.deliveredAt}{' '}
          <time dateTime={opportunity.availableAt}>
            {formatAvailableAt(opportunity.availableAt)}
          </time>
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isDisabled}>
          <legend>{messages.scoreLegend}</legend>
          <div className="driver-rating-score">
            {scoreOptions.map((score) => (
              <label key={score}>
                <input
                  checked={rating === score}
                  name={`rating-${opportunity.pickupId}`}
                  onChange={() => {
                    setRating(score)
                    setValidationError(undefined)
                  }}
                  type="radio"
                  value={score}
                />
                <span aria-hidden="true">{score}</span>
                <span className="impact-visually-hidden">
                  {messages.scoreLabel(score)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={isDisabled}>
          <legend>{messages.tagsLegend}</legend>
          <div className="driver-rating-tags">
            {messages.tags.map((tag) => (
              <label key={tag.value}>
                <input
                  checked={tags.includes(tag.value)}
                  onChange={(event) =>
                    handleTagChange(tag.value, event.currentTarget.checked)
                  }
                  type="checkbox"
                  value={tag.value}
                />
                <span>{tag.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="driver-rating-comment">
          <label htmlFor={`rating-comment-${opportunity.pickupId}`}>
            {messages.commentLabel}
          </label>
          <textarea
            disabled={isDisabled}
            id={`rating-comment-${opportunity.pickupId}`}
            maxLength={1_000}
            onChange={(event) => setComment(event.currentTarget.value)}
            placeholder={messages.commentPlaceholder}
            rows={4}
            value={comment}
          />
          <small>{messages.commentHint}</small>
        </div>

        {error ? (
          <p className="driver-rating-card__error" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          className="driver-rating-card__submit"
          disabled={isDisabled}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? messages.submitting : messages.submit}
        </Button>
      </form>
    </Card>
  )
}
