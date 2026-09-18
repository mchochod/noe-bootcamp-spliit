'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useLocale, useTranslations } from 'next-intl'

function StatCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {detail && (
        <CardContent className="text-sm text-muted-foreground">
          {detail}
        </CardContent>
      )}
    </Card>
  )
}

export function WrappedPageClient() {
  const t = useTranslations('Wrapped')
  const locale = useLocale()
  const { groupId, group, isLoading: isGroupLoading } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.stats.wrapped.useQuery(
    { groupId },
    { enabled: !isGroupLoading && !!group?.closedAt },
  )
  const currency = group ? getCurrencyFromGroup(group) : undefined

  if (isGroupLoading || isLoading || !data || !currency) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  const hasContent = data.totalSpending > 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t('closedOn', {
          date: formatDate(data.closedAt, locale, { dateStyle: 'long' }),
        })}
      </p>

      {!hasContent ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label={t('totalSpending')}
            value={formatCurrency(currency, data.totalSpending, locale)}
          />
          {data.biggestExpense && (
            <StatCard
              label={t('biggestExpense')}
              value={formatCurrency(
                currency,
                data.biggestExpense.amount,
                locale,
              )}
              detail={`${data.biggestExpense.title} — ${t('paidBy', { name: data.biggestExpense.paidByName })}`}
            />
          )}
          {data.topSpender && (
            <StatCard
              label={t('topSpender')}
              value={data.topSpender.name}
              detail={formatCurrency(currency, data.topSpender.paid, locale)}
            />
          )}
          {data.mostFrequentPayer && (
            <StatCard
              label={t('mostFrequentPayer')}
              value={data.mostFrequentPayer.name}
              detail={t('times', { count: data.mostFrequentPayer.paidCount })}
            />
          )}
          {data.topCategory && (
            <StatCard
              label={t('topCategory')}
              value={data.topCategory.name}
              detail={formatCurrency(currency, data.topCategory.total, locale)}
            />
          )}
        </div>
      )}
    </div>
  )
}
