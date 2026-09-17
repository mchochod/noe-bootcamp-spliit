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

describe('expenseFormSchema, amount typed as a calculation', () => {
  function parseAmount(amount: string) {
    return expenseFormSchema.safeParse({
      expenseDate: new Date('2026-09-01'),
      title: 'Dinner',
      amount,
      paidBy: 'a',
      splitMode: 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      paidFor: [{ participant: 'p0', shares: '1' }],
    })
  }

  it('works the calculation out, for a submit that never blurred the field', () => {
    expect(parseAmount('12+8,50').data?.amount).toBe(20.5)
    expect(parseAmount('3*4.20').data?.amount).toBe(12.6)
  })

  it('still reads a plain amount', () => {
    expect(parseAmount('20.5').data?.amount).toBe(20.5)
    expect(parseAmount('-15').data?.amount).toBe(-15)
  })

  it('rejects a calculation that makes no sense rather than saving it', () => {
    expect(parseAmount('12+').success).toBe(false)
    expect(parseAmount('12++8').success).toBe(false)
  })
})
