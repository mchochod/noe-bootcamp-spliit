'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/trpc/client'
import { PartyPopper } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCurrentGroup } from './current-group-context'

/**
 * Closes the group (issue #14 — "trip wrapped") and links to the recap.
 * Closing doesn't lock the group: it's a one-way flag that only surfaces the
 * recap, so there's nothing else to undo — the confirmation dialog just
 * avoids a stray click surprising everyone with the recap mid-trip.
 */
export const WrappedButton = () => {
  const t = useTranslations('Wrapped')
  const { groupId, group } = useCurrentGroup()
  const router = useRouter()
  const utils = trpc.useUtils()
  const { mutateAsync, isPending } = trpc.groups.close.useMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!group) return null

  if (group.closedAt) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/groups/${groupId}/wrapped`}>
          <PartyPopper className="w-4 h-4 mr-1.5" />
          {t('viewButton')}
        </Link>
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <PartyPopper className="w-4 h-4 mr-1.5" />
        {t('closeButton')}
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('closeConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('closeConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              disabled={isPending}
              onClick={async () => {
                await mutateAsync({ groupId })
                await utils.groups.invalidate()
                setConfirmOpen(false)
                router.push(`/groups/${groupId}/wrapped`)
              }}
            >
              {t('closeConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
