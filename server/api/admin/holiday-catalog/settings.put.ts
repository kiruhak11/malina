import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { invalidateHolidayCatalogCache } from '../../../utils/holiday-catalog'
import { normalizeHolidayTitle } from '../../../utils/holiday-catalog-admin'
import { prisma } from '../../../utils/prisma'

type HolidaySettingsPayload = {
  title?: unknown
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<HolidaySettingsPayload>(event)
  const title = normalizeHolidayTitle(body.title)

  let settings
  try {
    const existing = await prisma.holidayCatalogSettings.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    settings = existing
      ? await prisma.holidayCatalogSettings.update({
          where: { id: existing.id },
          data: { title }
        })
      : await prisma.holidayCatalogSettings.create({
          data: { title }
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

  return {
    ok: true,
    settings
  }
})
