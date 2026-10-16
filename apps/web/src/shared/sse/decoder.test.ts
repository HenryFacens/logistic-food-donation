import { describe, expect, it } from 'vitest'
import { SseDecoder } from './decoder'

describe('SseDecoder', () => {
  it('keeps partial chunks until the event is complete', () => {
    const decoder = new SseDecoder()

    expect(decoder.push('id: evt-1\ndata: {"event')).toEqual([])
    expect(
      decoder.push('Type":"offer.sent"}\n\n'),
    ).toEqual([
      {
        data: '{"eventType":"offer.sent"}',
        event: undefined,
        id: 'evt-1',
      },
    ])
  })

  it('joins multiline data and ignores comments', () => {
    const decoder = new SseDecoder()

    expect(
      decoder.push(': heartbeat\r\nevent: donation\r\ndata: line one\r\ndata: line two\r\n\r\n'),
    ).toEqual([
      {
        data: 'line one\nline two',
        event: 'donation',
        id: undefined,
      },
    ])
  })
})

