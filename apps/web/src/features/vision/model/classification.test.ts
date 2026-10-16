import { describe, expect, it } from 'vitest'
import {
  createImageClassificationRequest,
  createManualClassificationRequest,
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
})
