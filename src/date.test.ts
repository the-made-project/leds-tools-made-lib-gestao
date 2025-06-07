import { describe, it, expect } from 'vitest'
import { parseDate } from './util/date-util'

describe('teste do parsing da data', () => {
  it('data em formato ISO', () => {
    const date = parseDate('2024-08-24');
  
    expect(date.getTime()).not.toBe(NaN)
  })

  it('data em formato pt-BR', () => {
    const date = parseDate('24/08/2024')

    expect(date.getTime()).not.toBe(NaN)
  })
})
