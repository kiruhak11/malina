import { getRequestHost, getRequestProtocol, setHeader } from 'h3'
import { prisma } from '../utils/prisma'

type SitemapEntry = {
  loc: string
  lastmod: Date
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: '1.0' | '0.8'
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const resolveSiteUrl = (event: Parameters<typeof getRequestHost>[0]) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.publicSiteUrl || config.public.siteUrl || '').trim()

  if (configured) {
    return trimTrailingSlash(configured)
  }

  return trimTrailingSlash(`${getRequestProtocol(event)}://${getRequestHost(event)}`)
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const toSitemapXml = (entries: SitemapEntry[]) => {
  const items = entries
    .map(
      (entry) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod.toISOString()}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}
</urlset>`
}

export default defineEventHandler(async (event) => {
  const siteUrl = resolveSiteUrl(event)
  const now = new Date()

  let homeLastmod = now
  let galleryLastmod = now

  try {
    const [latestDessert, latestGalleryPhoto] = await Promise.all([
      prisma.dessert.findFirst({
        where: { active: true },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      prisma.photo.findFirst({
        where: { inGallery: true },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    if (latestDessert?.updatedAt) {
      homeLastmod = latestDessert.updatedAt
    }

    if (latestGalleryPhoto?.createdAt) {
      galleryLastmod = latestGalleryPhoto.createdAt
    }
  } catch {
    // Если БД временно недоступна, отдаем sitemap с текущей датой.
  }

  const entries: SitemapEntry[] = [
    {
      loc: `${siteUrl}/`,
      lastmod: homeLastmod,
      changefreq: 'daily',
      priority: '1.0'
    },
    {
      loc: `${siteUrl}/gallery`,
      lastmod: galleryLastmod,
      changefreq: 'weekly',
      priority: '0.8'
    }
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')

  return toSitemapXml(entries)
})
