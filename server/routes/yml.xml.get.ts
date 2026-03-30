import { getRequestHost, getRequestProtocol, setHeader } from 'h3'
import { prisma } from '../utils/prisma'

type FeedCategory = {
  id: string
  name: string
}

type FeedOffer = {
  id: string
  slug: string
  name: string
  categoryId: string
  price: number | null
  description: string
  picture: string | null
  url: string
  available: boolean
  params: Array<{ name: string; value: string }>
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

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const buildAbsoluteUrl = (siteUrl: string, path: string) => {
  try {
    return new URL(path, `${siteUrl}/`).href
  } catch {
    return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
  }
}

const parsePrice = (value: string) => {
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) {
    return null
  }

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

const formatFeedDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const toYmlXml = (siteUrl: string, categories: FeedCategory[], offers: FeedOffer[]) => {
  const categoriesXml = categories
    .map((category) => `    <category id="${escapeXml(category.id)}">${escapeXml(category.name)}</category>`)
    .join('\n')

  const offersXml = offers
    .map((offer) => {
      const paramsXml = offer.params
        .map(
          (param) =>
            `      <param name="${escapeXml(param.name)}">${escapeXml(param.value)}</param>`,
        )
        .join('\n')

      const pictureXml = offer.picture ? `\n      <picture>${escapeXml(offer.picture)}</picture>` : ''
      const priceXml = offer.price !== null ? `\n      <price>${offer.price}</price>` : ''
      const paramsBlock = paramsXml ? `\n${paramsXml}` : ''

      return `    <offer id="${escapeXml(offer.id)}" available="${offer.available ? 'true' : 'false'}">
      <name>${escapeXml(offer.name)}</name>
      <url>${escapeXml(offer.url)}</url>${priceXml}
      <currencyId>RUB</currencyId>
      <categoryId>${escapeXml(offer.categoryId)}</categoryId>${pictureXml}
      <description>${escapeXml(offer.description)}</description>${paramsBlock}
    </offer>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${formatFeedDate(new Date())}">
  <shop>
    <name>МАЛИНА</name>
    <company>МАЛИНА</company>
    <url>${escapeXml(siteUrl)}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`
}

export default defineEventHandler(async (event) => {
  const siteUrl = resolveSiteUrl(event)

  const desserts = await prisma.dessert.findMany({
    where: { active: true },
    include: {
      photos: {
        orderBy: { createdAt: 'asc' },
        select: {
          path: true
        }
      },
      holidaySections: {
        include: {
          section: {
            select: {
              active: true,
              slug: true
            }
          }
        }
      }
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
  })

  const categoryIdByName = new Map<string, string>()
  const categories: FeedCategory[] = []

  for (const dessert of desserts) {
    const categoryName = dessert.category.trim() || 'Каталог'

    if (!categoryIdByName.has(categoryName)) {
      const categoryId = String(categoryIdByName.size + 1)
      categoryIdByName.set(categoryName, categoryId)
      categories.push({
        id: categoryId,
        name: categoryName
      })
    }
  }

  const offers: FeedOffer[] = desserts.map((dessert) => {
    const inHolidayCatalog = dessert.holidaySections.some((item) => item.section.active)
    const targetAnchor = inHolidayCatalog ? '#holiday-catalog' : '#catalog'
    const descriptionParts = [
      dessert.description.trim(),
      dessert.inside.trim() ? `Состав: ${dessert.inside.trim()}` : '',
      dessert.decor.trim() ? `Декор: ${dessert.decor.trim()}` : ''
    ].filter(Boolean)

    const description = stripHtml(descriptionParts.join(' '))

    const params = [
      dessert.inside.trim() ? { name: 'Состав', value: dessert.inside.trim() } : null,
      dessert.decor.trim() ? { name: 'Декор', value: dessert.decor.trim() } : null,
      dessert.leadTimeHours
        ? { name: 'Срок изготовления, ч', value: String(dessert.leadTimeHours) }
        : null,
      dessert.ttkProteins ? { name: 'Белки', value: dessert.ttkProteins } : null,
      dessert.ttkFats ? { name: 'Жиры', value: dessert.ttkFats } : null,
      dessert.ttkCarbs ? { name: 'Углеводы', value: dessert.ttkCarbs } : null,
      dessert.ttkKcal ? { name: 'Ккал', value: dessert.ttkKcal } : null
    ].filter((param): param is { name: string; value: string } => Boolean(param))

    return {
      id: dessert.id,
      slug: dessert.slug,
      name: dessert.name,
      categoryId: categoryIdByName.get(dessert.category.trim() || 'Каталог') || '1',
      price: parsePrice(dessert.price),
      description,
      picture: dessert.photos[0]?.path ? buildAbsoluteUrl(siteUrl, dessert.photos[0].path) : null,
      url: `${siteUrl}/${targetAnchor}`,
      available: true,
      params
    }
  })

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')

  return toYmlXml(siteUrl, categories, offers)
})
