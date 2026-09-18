import { getTranslations } from 'next-intl/server'
import { WrappedPageClient } from './page.client'

export async function generateMetadata() {
  const t = await getTranslations('Wrapped')

  return {
    title: t('title'),
  }
}

export default async function WrappedPage() {
  return <WrappedPageClient />
}
