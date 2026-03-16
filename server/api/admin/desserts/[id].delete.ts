import { requireAdmin } from '../../../utils/admin-auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id десерта.' })
  }

  await prisma.photo.updateMany({
    where: { dessertId: id },
    data: { dessertId: null }
  })

  await prisma.dessert.delete({ where: { id } })

  return { ok: true }
})
