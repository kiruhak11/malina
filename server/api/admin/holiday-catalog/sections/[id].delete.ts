import { requireAdmin } from '../../../../utils/admin-auth'
import { invalidateHolidayCatalogCache } from '../../../../utils/holiday-catalog'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id праздничного раздела.' })
  }

  try {
    await prisma.holidaySection.delete({
      where: { id }
    })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2021') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Праздничный каталог недоступен: не применены миграции базы данных.'
      })
    }
    throw error
  }

  invalidateHolidayCatalogCache()

  return { ok: true }
})
