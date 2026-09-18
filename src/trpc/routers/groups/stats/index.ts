import { createTRPCRouter } from '@/trpc/init'
import { getStatsCategoryExpensesProcedure } from '@/trpc/routers/groups/stats/category-expenses.procedure'
import { getStatsMonthExpensesProcedure } from '@/trpc/routers/groups/stats/month-expenses.procedure'
import { getStatsOverviewProcedure } from '@/trpc/routers/groups/stats/overview.procedure'
import { getStatsWrappedProcedure } from '@/trpc/routers/groups/stats/wrapped.procedure'

export const groupStatsRouter = createTRPCRouter({
  overview: getStatsOverviewProcedure,
  categoryExpenses: getStatsCategoryExpensesProcedure,
  monthExpenses: getStatsMonthExpensesProcedure,
  wrapped: getStatsWrappedProcedure,
})
