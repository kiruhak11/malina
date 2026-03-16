import { requireAdmin } from '../../../../utils/admin-auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id отзыва.' })
  }

  const review = await prisma.review.update({
    where: { id },
    data: {
      approved: false,
      moderatedAt: new Date()
    }
  })

  return { ok: true, review }
})
