import { getGroup, getGroupExpenses } from '@/lib/api'
import {
  getBiggestExpense,
  getSpendingByCategory,
  getSpendingByParticipant,
  getTotalGroupSpending,
} from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/**
 * The "trip wrapped" recap (issue #14): a summary shown once a group has
 * been closed. Only meaningful for a closed group — refuses to compute on an
 * open one so the UI can't accidentally show a recap for a trip that's still
 * ongoing.
 */
export const getStatsWrappedProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    if (!group) throw new TRPCError({ code: 'NOT_FOUND' })
    if (!group.closedAt) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Group is not closed yet',
      })
    }

    const expenses = await getGroupExpenses(groupId)
    const byParticipant = getSpendingByParticipant(group.participants, expenses)
    const byCategory = getSpendingByCategory(expenses)

    return {
      closedAt: group.closedAt,
      totalSpending: getTotalGroupSpending(expenses),
      expenseCount: expenses.filter((expense) => !expense.isReimbursement)
        .length,
      biggestExpense: getBiggestExpense(expenses),
      topSpender: byParticipant[0] ?? null,
      // Most expenses paid for, not most spent — "who always got the bill".
      mostFrequentPayer:
        [...byParticipant].sort((a, b) => b.paidCount - a.paidCount)[0] ?? null,
      topCategory: byCategory[0] ?? null,
    }
  })
