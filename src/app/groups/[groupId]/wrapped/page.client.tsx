'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { Skeleton } from '@/components/ui/skeleton'
import {
  cn,
  formatCurrency,
  formatDate,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Slide = {
  eyebrow: string
  bg: string
  accent: string
  content: React.ReactNode
}

const KEY_ARROW_LEFT = 'ArrowLeft'
const KEY_ARROW_RIGHT = 'ArrowRight'

export function WrappedPageClient() {
  const t = useTranslations('Wrapped')
  const locale = useLocale()
  const { groupId, group, isLoading: isGroupLoading } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.stats.wrapped.useQuery(
    { groupId },
    { enabled: !isGroupLoading && !!group?.closedAt },
  )
  const currency = group ? getCurrencyFromGroup(group) : undefined
  const [index, setIndex] = useState(0)

  const hasContent = !!data && data.totalSpending > 0

  const slides: Slide[] =
    data && currency && group && hasContent
      ? [
          {
            eyebrow: t('slideCover'),
            bg: '#0c0a09',
            accent: '#0bda99',
            content: (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#0bda99] flex items-center justify-center text-3xl">
                  🧳
                </div>
                <div className="flex-1 flex flex-col justify-center gap-2">
                  <h1 className="m-0 text-4xl font-extrabold leading-tight text-[#f2f2f2]">
                    {group.name}
                  </h1>
                  <p className="m-0 text-base text-[#a1a1aa]">
                    {t('closedOn', {
                      date: formatDate(data.closedAt, locale, {
                        dateStyle: 'long',
                      }),
                    })}
                  </p>
                </div>
              </>
            ),
          },
          {
            eyebrow: t('totalSpending'),
            bg: '#052e16',
            accent: '#0bda99',
            content: (
              <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="text-6xl font-extrabold leading-none text-[#f2f2f2]">
                  {formatCurrency(currency, data.totalSpending, locale)}
                </div>
                <p className="mt-3 text-base text-[#c8f4e2]">
                  {t('totalSpendingDetail', {
                    count: data.expenseCount,
                    participants: group.participants.length,
                  })}
                </p>
              </div>
            ),
          },
          ...(data.biggestExpense
            ? [
                {
                  eyebrow: t('biggestExpense'),
                  bg: '#274754',
                  accent: '#e8c468',
                  content: (
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <div className="text-5xl font-extrabold leading-none text-[#f2f2f2]">
                        {formatCurrency(
                          currency,
                          data.biggestExpense!.amount,
                          locale,
                        )}
                      </div>
                      <p className="mt-4 text-xl font-semibold text-[#f2f2f2]">
                        {data.biggestExpense!.title}
                      </p>
                      <p className="mt-1 text-base text-[#c9e3ea]">
                        {t('paidBy', { name: data.biggestExpense!.paidByName })}
                      </p>
                    </div>
                  ),
                },
              ]
            : []),
          ...(data.topSpender
            ? [
                {
                  eyebrow: t('topSpender'),
                  bg: '#7c2d12',
                  accent: '#e76e50',
                  content: (
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <div className="w-20 h-20 rounded-full bg-[#e76e50] flex items-center justify-center text-3xl font-extrabold text-white mb-4">
                        {data.topSpender!.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-4xl font-extrabold leading-none text-[#f2f2f2]">
                        {data.topSpender!.name}
                      </div>
                      <p className="mt-3 text-lg text-[#ffd9c7]">
                        {formatCurrency(
                          currency,
                          data.topSpender!.paid,
                          locale,
                        )}
                      </p>
                    </div>
                  ),
                },
              ]
            : []),
          ...(data.mostFrequentPayer
            ? [
                {
                  eyebrow: t('mostFrequentPayer'),
                  bg: '#1e1b4b',
                  accent: '#a855f7',
                  content: (
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <div className="w-20 h-20 rounded-full bg-[#a855f7] flex items-center justify-center text-3xl font-extrabold text-white mb-4">
                        {data.mostFrequentPayer!.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-4xl font-extrabold leading-none text-[#f2f2f2]">
                        {data.mostFrequentPayer!.name}
                      </div>
                      <p className="mt-3 text-lg text-[#e9d5ff]">
                        {t('times', {
                          count: data.mostFrequentPayer!.paidCount,
                        })}
                      </p>
                    </div>
                  ),
                },
              ]
            : []),
          ...(data.topCategory
            ? [
                {
                  eyebrow: t('topCategory'),
                  bg: '#0c0a09',
                  accent: '#0bda99',
                  content: (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-4xl font-extrabold leading-tight text-[#f2f2f2]">
                          {data.topCategory!.name}
                        </div>
                        <p className="mt-2 text-lg text-[#a1a1aa]">
                          {formatCurrency(
                            currency,
                            data.topCategory!.total,
                            locale,
                          )}
                        </p>
                      </div>
                      <div className="flex-1" />
                      <div className="flex flex-col gap-2.5 p-5 rounded-2xl bg-[#171717]">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#a1a1aa]">
                            {t('totalSpending')}
                          </span>
                          <span className="text-[#f2f2f2] font-semibold">
                            {formatCurrency(
                              currency,
                              data.totalSpending,
                              locale,
                            )}
                          </span>
                        </div>
                        {data.biggestExpense && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#a1a1aa]">
                              {t('biggestExpense')}
                            </span>
                            <span className="text-[#f2f2f2] font-semibold">
                              {formatCurrency(
                                currency,
                                data.biggestExpense.amount,
                                locale,
                              )}{' '}
                              · {data.biggestExpense.title}
                            </span>
                          </div>
                        )}
                        {data.topSpender && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#a1a1aa]">
                              {t('topSpender')}
                            </span>
                            <span className="text-[#f2f2f2] font-semibold">
                              {data.topSpender.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ),
                },
              ]
            : []),
        ]
      : []

  const isLastSlide = index === slides.length - 1

  useEffect(() => {
    setIndex(0)
  }, [groupId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === KEY_ARROW_RIGHT && !isLastSlide) {
        setIndex((current) => Math.min(current + 1, slides.length - 1))
      } else if (event.key === KEY_ARROW_LEFT && index > 0) {
        setIndex((current) => Math.max(current - 1, 0))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, isLastSlide, slides.length])

  if (isGroupLoading || isLoading || !data || !currency) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[390px] h-[700px] rounded-3xl overflow-hidden bg-card border flex flex-col gap-3 p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-48 mt-8" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (!hasContent) {
    return <p className="text-muted-foreground">{t('empty')}</p>
  }

  const slide = slides[index]

  return (
    <div className="flex justify-center">
      <div
        className="relative w-full max-w-[390px] h-[700px] rounded-3xl overflow-hidden flex flex-col p-6 gap-5 transition-colors duration-300"
        style={{ backgroundColor: slide.bg }}
      >
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: slide.accent }}
        />

        <div className="flex items-center gap-1.5 z-10">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full bg-white/25 transition-all',
                i === index ? 'w-5 bg-white' : 'w-1.5',
              )}
            />
          ))}
        </div>

        <div className="text-sm font-semibold uppercase tracking-wide text-white/50 z-10">
          {slide.eyebrow}
        </div>

        <div className="flex-1 flex flex-col z-10 min-h-0">{slide.content}</div>

        <div className="flex gap-2.5 z-10">
          {index > 0 && (
            <button
              type="button"
              aria-label={t('back')}
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              className="w-11 h-11 rounded-xl bg-white/10 text-white flex items-center justify-center text-lg shrink-0"
            >
              ‹
            </button>
          )}
          {isLastSlide ? (
            <Link
              href={`/groups/${groupId}`}
              className="flex-1 text-center py-3.5 rounded-xl font-bold text-sm"
              style={{ backgroundColor: slide.accent, color: '#0c0a09' }}
            >
              {t('backToGroup')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() =>
                setIndex((current) => Math.min(current + 1, slides.length - 1))
              }
              className="flex-1 text-center py-3.5 rounded-xl font-bold text-sm"
              style={{ backgroundColor: slide.accent, color: '#0c0a09' }}
            >
              {index === 0 ? t('start') : t('next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
