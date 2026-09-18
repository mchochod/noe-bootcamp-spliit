import { looksLikeExpression, parseAmountExpression } from './expression'

const value = (input: string) => {
  const result = parseAmountExpression(input)
  return result.status === 'ok' ? result.value : result.status
}

describe('parseAmountExpression', () => {
  it('adds, with either decimal separator', () => {
    expect(value('12+8,50')).toBe(20.5)
    expect(value('12+8.50')).toBe(20.5)
  })

  it('multiplies and divides', () => {
    expect(value('3*4,20')).toBeCloseTo(12.6, 10)
    expect(value('10/4')).toBe(2.5)
  })

  it('gives parentheses priority over precedence', () => {
    expect(value('(12+8,50)*2')).toBe(41)
    expect(value('12+8,50*2')).toBe(29)
    expect(value('((2+3)*4)/2')).toBe(10)
    expect(value('(20)')).toBe(20)
  })

  it('carries the sign through, which is what marks an income', () => {
    expect(value('-(12+8)')).toBe(-20)
    expect(value('12-20')).toBe(-8)
    expect(value('-12')).toBe(-12)
    expect(value('3*-2')).toBe(-6)
    expect(value('12+-8')).toBe(4)
  })

  it('reads a plain amount the way Number() does', () => {
    expect(value('20')).toBe(20)
    expect(value('20.5')).toBe(20.5)
    expect(value(',50')).toBe(0.5)
    expect(value('20.')).toBe(20)
    expect(value(' 12 + 8 ')).toBe(20)
  })

  it('treats a half-typed expression as unfinished, not wrong', () => {
    expect(value('12+')).toBe('incomplete')
    expect(value('(12+8,50')).toBe('incomplete')
    expect(value('(')).toBe('incomplete')
    expect(value('-')).toBe('incomplete')
    expect(value('')).toBe('incomplete')
  })

  it('refuses what no further typing can fix', () => {
    expect(parseAmountExpression('12++8')).toEqual({
      status: 'error',
      message: 'invalidExpression',
    })
    for (const input of ['()', ')2(', '1.2.3+1', '2(3+4)', '12+8a', '12)']) {
      expect(value(input)).toBe('error')
    }
  })

  it('reports a division by zero rather than an infinity', () => {
    expect(parseAmountExpression('1/0')).toEqual({
      status: 'error',
      message: 'divisionByZero',
    })
    expect(parseAmountExpression('1/(2-2)')).toEqual({
      status: 'error',
      message: 'divisionByZero',
    })
  })
})

describe('looksLikeExpression', () => {
  it('leaves a plain amount alone, including an income', () => {
    for (const input of ['', '20', '20,5', '20.5', '-20', '-20,5', ' -20 ']) {
      expect(looksLikeExpression(input)).toBe(false)
    }
  })

  it('claims anything with an operator or a parenthesis', () => {
    for (const input of ['12+8', '12-8', '3*2', '10/4', '(20)', '-(12+8)']) {
      expect(looksLikeExpression(input)).toBe(true)
    }
  })

  it('claims the half-typed states, or the operator could never be typed', () => {
    for (const input of ['12+', '12+8,', '(', '-(', '12*']) {
      expect(looksLikeExpression(input)).toBe(true)
    }
  })
})
