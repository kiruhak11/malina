import { requireAdmin } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [dessertsRaw, photosRaw, reviews, orders] = await Promise.all([
    prisma.dessert.findMany({
      include: {
        photos: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, path: true, title: true, inGallery: true, source: true, createdAt: true }
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.photo.findMany({
      include: {
        dessert: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.review.findMany({
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.orderRequest.findMany({
      orderBy: [{ createdAt: 'desc' }]
    })
  ])

  const dessertIds = dessertsRaw.map((dessert) => dessert.id)
  const holidaySectionSlugsByDessertId = new Map<string, string[]>()
  let holidayCatalogTitle = 'Праздничный каталог'
  let holidaySectionsRaw: Array<{
    id: string
    name: string
    slug: string
    active: boolean
    sortOrder: number
    isCurrentHoliday: boolean
    icon: string | null
    activeFrom: Date | null
    activeTo: Date | null
    _count: { desserts: number }
  }> = []

  try {
    const [holidaySettings, holidaySections, holidayMappings] = await Promise.all([
      prisma.holidayCatalogSettings.findFirst({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.holidaySection.findMany({
        include: {
          _count: {
            select: {
              desserts: true
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }),
      dessertIds.length
        ? prisma.holidaySectionDessert.findMany({
            where: {
              dessertId: { in: dessertIds }
            },
            include: {
              section: {
                select: {
                  slug: true
                }
              }
            }
          })
        : Promise.resolve([])
    ])

    holidayCatalogTitle = holidaySettings?.title || 'Праздничный каталог'
    holidaySectionsRaw = holidaySections

    for (const mapping of holidayMappings) {
      const existing = holidaySectionSlugsByDessertId.get(mapping.dessertId) || []
      existing.push(mapping.section.slug)
      holidaySectionSlugsByDessertId.set(mapping.dessertId, existing)
    }
  } catch (error: unknown) {
    if ((error as { code?: string })?.code !== 'P2021') {
      throw error
    }
  }

  const desserts = dessertsRaw.map((dessert) => ({
    ...dessert,
    ttk: {
      kbju: {
        proteins: dessert.ttkProteins,
        fats: dessert.ttkFats,
        carbs: dessert.ttkCarbs,
        kcal: dessert.ttkKcal
      }
    },
    holidaySectionSlugs: holidaySectionSlugsByDessertId.get(dessert.id) || []
  }))

  const photos = photosRaw.map((photo) => ({
    ...photo,
    dessertSlug: photo.dessert?.slug || null,
    dessertName: photo.dessert?.name || null
  }))

  return {
    desserts,
    photos,
    reviews,
    orders,
    holidayCatalog: {
      title: holidayCatalogTitle,
      sections: holidaySectionsRaw.map((section) => ({
        id: section.id,
        name: section.name,
        slug: section.slug,
        active: section.active,
        sortOrder: section.sortOrder,
        isCurrentHoliday: section.isCurrentHoliday,
        icon: section.icon,
        activeFrom: section.activeFrom,
        activeTo: section.activeTo,
        dessertCount: section._count.desserts
      }))
    }
  }
})
