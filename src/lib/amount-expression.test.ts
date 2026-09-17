import {
  evaluateAmountExpression,
  isAmountExpression,
} from './amount-expression'

describe('isAmountExpression', () => {
  it.each([
    '12+8,50',
    '3*4,20',
    '23,40 + 4',
    '10-2',
    '24/3',
    '(12+8)*2',
    '(', // a calculation being opened, before anything is typed in it
    '(5)',
    '-(12+8)',
  ])('recognises %s as a calculation', (value) => {
    expect(isAmountExpression(value)).toBe(true)
  })

  it.each(['12', '8,50', '12.50', '-15', '', '  '])(
    'leaves %s to the plain amount path',
    (value) => {
      expect(isAmountExpression(value)).toBe(false)
    },
  )
})

describe('evaluateAmountExpression', () => {
  it('adds up, with either decimal separator', () => {
    expect(evaluateAmountExpression('12+8,50')).toBe(20.5)
    expect(evaluateAmountExpression('12+8.50')).toBe(20.5)
    expect(evaluateAmountExpression('23,40+4')).toBe(27.4)
  })

  it('multiplies, and does so before adding', () => {
    expect(evaluateAmountExpression('3*4,20')).toBe(12.6)
    expect(evaluateAmountExpression('2+3*4')).toBe(14)
    expect(evaluateAmountExpression('24/3')).toBe(8)
    expect(evaluateAmountExpression('10-2*3')).toBe(4)
  })

  it('leaves a plain amount as it is', () => {
    expect(evaluateAmountExpression('12')).toBe(12)
    expect(evaluateAmountExpression('8,50')).toBe(8.5)
    expect(evaluateAmountExpression('-15')).toBe(-15)
    expect(evaluateAmountExpression('.5')).toBe(0.5)
  })

  it('ignores the spaces around the operators', () => {
    expect(evaluateAmountExpression(' 12 + 8,50 ')).toBe(20.5)
  })

  it('reads a sign leading the calculation', () => {
    expect(evaluateAmountExpression('-12-8')).toBe(-20)
    expect(evaluateAmountExpression('-12*2')).toBe(-24)
  })

  it('works parentheses out first', () => {
    expect(evaluateAmountExpression('(12+8)*2')).toBe(40)
    expect(evaluateAmountExpression('(23,40+4)/2')).toBe(13.7)
    expect(evaluateAmountExpression('2*(3+(4-1))')).toBe(12)
    expect(evaluateAmountExpression('(12+8,50)')).toBe(20.5)
    expect(evaluateAmountExpression('-(12+8)')).toBe(-20)
  })

  it('computes on decimals rather than on floats', () => {
    expect(evaluateAmountExpression('0,1+0,2')).toBe(0.3)
    expect(evaluateAmountExpression('1,1*3')).toBe(3.3)
  })

  it.each([
    '',
    '   ',
    'abc',
    '12+',
    '+',
    '12++8',
    '12+*8',
    '5+-2',
    '12.5.3',
    '12€',
    '12/0',
    '12/(3-3)',
    '(12+8',
    '12+8)',
    '()',
    '(12+8)(2)',
  ])('rejects %s', (value) => {
    expect(evaluateAmountExpression(value)).toBeNull()
  })
})
