import { expenseFormSchema } from './schemas'

function byAmountExpense(amount: string, shares: string[]) {
  return {
    expenseDate: new Date('2026-09-01'),
    title: 'Dinner',
    amount,
    paidBy: 'a',
    splitMode: 'BY_AMOUNT',
    saveDefaultSplittingOptions: false,
    isReimbursement: false,
    paidFor: shares.map((shares, i) => ({ participant: `p${i}`, shares })),
  }
}

function issueMessages(input: unknown): string[] {
  const result = expenseFormSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe('expenseFormSchema, split by amount', () => {
  it('accepts amounts that add up to the expense amount', () => {
    expect(
      issueMessages(
        byAmountExpense('524.34', [
          '110.11',
          '209.74',
          '104.87',
          '89.14',
          '10.48',
        ]),
      ),
    ).toEqual([])
  })

  it('rejects amounts one cent off', () => {
    expect(
      issueMessages(
        byAmountExpense('524.34', [
          '110.11',
          '209.74',
          '104.87',
          '89.14',
          '10.49',
        ]),
      ),
    ).toEqual(['amountSum'])
  })

  it('sums amounts typed with a decimal comma', () => {
    expect(
      issueMessages(byAmountExpense('100', ['50', '30', '20,00'])),
    ).toEqual([])
  })

  it('reports an emptied amount instead of throwing on it', () => {
    expect(issueMessages(byAmountExpense('100', ['60', '']))).toEqual([
      'noZeroShares',
      'amountSum',
    ])
  })
})

function evenlyExpense(amount: string) {
  return {
    expenseDate: new Date('2026-09-01'),
    title: 'Dinner',
    amount,
    paidBy: 'a',
    splitMode: 'EVENLY',
    saveDefaultSplittingOptions: false,
    isReimbursement: false,
    paidFor: [{ participant: 'p0', shares: '1' }],
  }
}

function parsedAmount(amount: string) {
  const result = expenseFormSchema.safeParse(evenlyExpense(amount))
  return result.success
    ? result.data.amount
    : issueMessages(evenlyExpense(amount))
}

describe('expenseFormSchema, amount as a calculation', () => {
  it('works the calculation out', () => {
    expect(parsedAmount('12+8,50')).toBe(20.5)
    expect(parsedAmount('12+8.50')).toBe(20.5)
    expect(parsedAmount('(12+8,50)*2')).toBe(41)
  })

  it('reports a malformed calculation on the amount field itself', () => {
    const result = expenseFormSchema.safeParse(evenlyExpense('12++8'))
    expect(result.success).toBe(false)
    const issues = result.success ? [] : result.error.issues
    expect(
      issues.map((issue) => [issue.path.join('.'), issue.message]),
    ).toEqual([['amount', 'invalidExpression']])
  })

  it('names a division by zero', () => {
    expect(parsedAmount('1/0')).toEqual(['divisionByZero'])
  })

  it('leaves a plain amount on the path it has always taken', () => {
    expect(parsedAmount('20.5')).toBe(20.5)
    expect(parsedAmount('20.')).toBe(20)
    expect(parsedAmount('-20')).toBe(-20)
    expect(parsedAmount('')).toEqual(['amountNotZero'])
    expect(parsedAmount('abc')).toEqual(['invalidNumber'])
  })
})
