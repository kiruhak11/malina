import { prisma } from '../../utils/prisma'
import { isSafePublicImagePath } from '../../utils/input'
import { getVisibleHolidayCatalog } from '../../utils/holiday-catalog'

export default defineEventHandler(async () => {
  const [dessertsRaw, reviews, gallery, holidayCatalogRaw] = await Promise.all([
    prisma.dessert.findMany({
      where: { active: true },
      include: {
        photos: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            path: true,
            title: true
          }
        }
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
    }),
    prisma.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        text: true,
        rating: true,
        createdAt: true
      }
    }),
    prisma.photo.findMany({
      where: { inGallery: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        path: true,
        title: true,
        dessertId: true,
        createdAt: true
      }
    }),
    getVisibleHolidayCatalog()
  ])

  const desserts = dessertsRaw.map((dessert) => ({
    id: dessert.id,
    slug: dessert.slug,
    category: dessert.category,
    name: dessert.name,
    description: dessert.description,
    inside: dessert.inside,
    decor: dessert.decor,
    price: dessert.price,
    leadTimeHours: dessert.leadTimeHours,
    ttk:
      dessert.ttkProteins || dessert.ttkFats || dessert.ttkCarbs || dessert.ttkKcal
        ? {
            kbju: {
              proteins: dessert.ttkProteins,
              fats: dessert.ttkFats,
              carbs: dessert.ttkCarbs,
              kcal: dessert.ttkKcal
            }
          }
        : null,
    photos: dessert.photos
      .filter((photo) => isSafePublicImagePath(photo.path))
      .map((photo) => ({
        id: photo.id,
        path: photo.path,
        title: photo.title
      }))
  }))

  const safeGallery = gallery
    .filter((photo) => isSafePublicImagePath(photo.path))
    .map((photo) => ({
      id: photo.id,
      path: photo.path,
      title: photo.title,
      dessertId: photo.dessertId,
      createdAt: photo.createdAt
    }))

  const dessertById = new Map(desserts.map((dessert) => [dessert.id, dessert]))

  const holidayCatalog = {
    title: holidayCatalogRaw.title,
    sections: holidayCatalogRaw.sections.map((section) => ({
      id: section.id,
      name: section.name,
      slug: section.slug,
      icon: section.icon,
      items: section.dessertIds
        .map((dessertId) => dessertById.get(dessertId))
        .filter((dessert): dessert is (typeof desserts)[number] => Boolean(dessert))
    }))
  }

  const dessertsInHolidayCatalog = new Set(
    holidayCatalogRaw.sections.flatMap((section) => section.dessertIds)
  )

  const mainCatalogDesserts = desserts.filter((dessert) => !dessertsInHolidayCatalog.has(dessert.id))

  return {
    desserts: mainCatalogDesserts,
    reviews,
    gallery: safeGallery,
    holidayCatalog
  }
})
