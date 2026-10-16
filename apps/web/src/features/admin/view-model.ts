export interface QueueInput {
  deadLetter: number
  name: string
  oldestMessageAt: string | null
  processing: number
  ready: number
  scheduled: number
}

export const queueLabels: Record<string, string> = {
  'donation.classified': 'Doação classificada',
  'donation.created': 'Doação criada',
  'offer.sent': 'Oferta enviada',
  'offer.timeout': 'Oferta expirada',
  'pickup.confirmed': 'Coleta confirmada',
}

export const formatQueueAge = (value: string | null, now = Date.now()) => {
  if (!value) return 'Sem mensagens'
  const differenceMinutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60_000),
  )
  if (differenceMinutes < 1) return 'Agora'
  if (differenceMinutes < 60) return `Há ${differenceMinutes} min`
  const hours = Math.floor(differenceMinutes / 60)
  if (hours < 24) return `Há ${hours} h`
  return `Há ${Math.floor(hours / 24)} d`
}

export const summarizeQueues = (queues: QueueInput[]) =>
  queues.reduce(
    (summary, queue) => ({
      deadLetter: summary.deadLetter + queue.deadLetter,
      inFlight: summary.inFlight + queue.processing,
      pending: summary.pending + queue.ready + queue.scheduled,
    }),
    { deadLetter: 0, inFlight: 0, pending: 0 },
  )

export const createReplayIdempotencyKey = (messageIds: string[]) => {
  const input = [...messageIds].sort().join('|')
  let hash = 2_166_136_261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return `admin-replay-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

