import { describe, expect, it } from 'vitest'
import {
  createImageClassificationRequest,
  createManualClassificationRequest,
  fitWithin,
} from './classification'

describe('vision classification requests', () => {
  it('trims and builds a manual request', () => {
    expect(createManualClassificationRequest('  pães frescos  ')).toEqual({
      manualDescription: 'pães frescos',
      source: 'manual',
    })
  })

  it('keeps the selected image source', () => {
    expect(createImageClassificationRequest('YWJj', 'camera')).toEqual({
      imageBase64: 'YWJj',
      source: 'camera',
    })
  })

  it('downscales large photos to the long-edge limit', () => {
    expect(fitWithin(4032, 3024, 1568)).toEqual({ height: 1176, width: 1568 })
    expect(fitWithin(3024, 4032, 1568)).toEqual({ height: 1568, width: 1176 })
  })

  it('never upscales small photos', () => {
    expect(fitWithin(800, 600, 1568)).toEqual({ height: 600, width: 800 })
  })
})
