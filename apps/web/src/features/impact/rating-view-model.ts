import {
  createDriverRatingRequestSchema,
  type CreateDriverRatingRequest,
} from '@resgata/shared'

export interface DriverRatingDraft {
  comment: string
  rating: number | null
  tags: string[]
}

export const withoutSimulationMarker = (value: string) =>
  value
    .replace(/\bSIMULADO\b/giu, '')
    .replace(/\s*[-—·]\s*(?=\p{L}|\p{N})/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

export type DriverRatingDraftResult =
  | { request: CreateDriverRatingRequest; success: true }
  | { reason: 'invalid' | 'rating-required'; success: false }

export const parseDriverRatingDraft = (
  draft: DriverRatingDraft,
): DriverRatingDraftResult => {
  if (draft.rating === null) {
    return { reason: 'rating-required', success: false }
  }

  const comment = draft.comment.trim()
  const parsed = createDriverRatingRequestSchema.safeParse({
    rating: draft.rating,
    tags: [...new Set(draft.tags)],
    ...(comment ? { comment } : {}),
  })

  return parsed.success
    ? { request: parsed.data, success: true }
    : { reason: 'invalid', success: false }
}
