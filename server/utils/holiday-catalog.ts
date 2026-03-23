import { prisma } from './prisma'

const HOLIDAY_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000

type CachedHolidaySection = {
  id: string
  name: string
  slug: string
  sortOrder: number
  icon: string | null
  isCurrentHoliday: boolean
  activeFrom: string | null
  activeTo: string | null
  dessertIds: string[]
}

type CachedHolidayCatalog = {
  title: string
  sections: CachedHolidaySection[]
}

const HOLIDAY_CATALOG_FALLBACK: CachedHolidayCatalog = {
  title: 'Праздничный каталог',
  sections: []
}

let holidayCatalogCache: {
  expiresAt: number
  value: CachedHolidayCatalog
} | null = null

const isWithinDateWindow = (section: CachedHolidaySection, now: Date) => {
  if (section.activeFrom) {
    const from = new Date(section.activeFrom)
    if (!Number.isNaN(from.getTime()) && now < from) {
      return false
    }
  }

  if (section.activeTo) {
    const to = new Date(section.activeTo)
    if (!Number.isNaN(to.getTime()) && now > to) {
      return false
    }
  }

  return true
}

const loadHolidayCatalog = async (): Promise<CachedHolidayCatalog> => {
  try {
    const [settings, sections] = await Promise.all([
      prisma.holidayCatalogSettings.findFirst({ orderBy: { createdAt: 'asc' } }),
      prisma.holidaySection.findMany({
        where: { active: true },
        include: {
          desserts: {
            select: {
              dessertId: true
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
    ])

    return {
      title: settings?.title || 'Праздничный каталог',
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        slug: section.slug,
        sortOrder: section.sortOrder,
        icon: section.icon,
        isCurrentHoliday: section.isCurrentHoliday,
        activeFrom: section.activeFrom ? section.activeFrom.toISOString() : null,
        activeTo: section.activeTo ? section.activeTo.toISOString() : null,
        dessertIds: section.desserts.map((item) => item.dessertId)
      }))
    }
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2021') {
      return HOLIDAY_CATALOG_FALLBACK
    }

    throw error
  }
}

export const invalidateHolidayCatalogCache = () => {
  holidayCatalogCache = null
}

export const getHolidayCatalog = async () => {
  const now = Date.now()
  if (holidayCatalogCache && holidayCatalogCache.expiresAt > now) {
    return holidayCatalogCache.value
  }

  const value = await loadHolidayCatalog()
  holidayCatalogCache = {
    value,
    expiresAt: now + HOLIDAY_CATALOG_CACHE_TTL_MS
  }

  return value
}

export const getVisibleHolidayCatalog = async (at = new Date()) => {
  const catalog = await getHolidayCatalog()

  return {
    title: catalog.title,
    sections: catalog.sections.filter((section) => isWithinDateWindow(section, at))
  }
}
