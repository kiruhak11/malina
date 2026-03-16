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

  const desserts = dessertsRaw.map((dessert) => ({
    ...dessert,
    ttk: {
      kbju: {
        proteins: dessert.ttkProteins,
        fats: dessert.ttkFats,
        carbs: dessert.ttkCarbs,
        kcal: dessert.ttkKcal
      }
    }
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
    orders
  }
})
