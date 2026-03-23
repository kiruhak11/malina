import { readBody } from 'h3'
import { requireAdmin } from '../../../../utils/admin-auth'
import { invalidateHolidayCatalogCache } from '../../../../utils/holiday-catalog'
import {
  normalizeHolidayIcon,
  normalizeHolidayName,
  normalizeHolidaySlug,
  parseHolidayBool,
  parseHolidayDate,
  parseHolidaySortOrder,
  validateHolidayDateRange
} from '../../../../utils/holiday-catalog-admin'
import { prisma } from '../../../../utils/prisma'

type SectionPayload = {
  name?: unknown
  slug?: unknown
  active?: unknown
  sortOrder?: unknown
  isCurrentHoliday?: unknown
  icon?: unknown
  activeFrom?: unknown
  activeTo?: unknown
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id праздничного раздела.' })
  }

  const existing = await prisma.holidaySection.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Праздничный раздел не найден.' })
  }

  const body = await readBody<SectionPayload>(event)

  const nextName = body.name !== undefined ? normalizeHolidayName(body.name) : undefined
  const nextSlug = body.slug !== undefined ? normalizeHolidaySlug(nextName || existing.name, body.slug) : undefined
  const nextActive = body.active !== undefined ? parseHolidayBool(body.active, existing.active) : undefined
  const nextSortOrder = body.sortOrder !== undefined ? parseHolidaySortOrder(body.sortOrder, existing.sortOrder) : undefined
  const nextIsCurrentHoliday =
    body.isCurrentHoliday !== undefined ? parseHolidayBool(body.isCurrentHoliday, existing.isCurrentHoliday) : undefined
  const nextIcon = body.icon !== undefined ? normalizeHolidayIcon(body.icon) : undefined
  const nextActiveFrom = parseHolidayDate(body.activeFrom)
  const nextActiveTo = parseHolidayDate(body.activeTo)

  validateHolidayDateRange(nextActiveFrom ?? existing.activeFrom, nextActiveTo ?? existing.activeTo)

  try {
    const section = await prisma.$transaction(async (tx) => {
      if (nextIsCurrentHoliday === true) {
        await tx.holidaySection.updateMany({
          where: {
            isCurrentHoliday: true,
            NOT: { id }
          },
          data: { isCurrentHoliday: false }
        })
      }

      return tx.holidaySection.update({
        where: { id },
        data: {
          name: nextName,
          slug: nextSlug,
          active: nextActive,
          sortOrder: nextSortOrder,
          isCurrentHoliday: nextIsCurrentHoliday,
          icon: nextIcon,
          activeFrom: nextActiveFrom,
          activeTo: nextActiveTo
        }
      })
    })

    invalidateHolidayCatalogCache()

    return {
      ok: true,
      section
    }
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2021') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Праздничный каталог недоступен: не применены миграции базы данных.'
      })
    }
    if ((error as { code?: string })?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Раздел с таким slug уже существует.' })
    }
    throw error
  }
})
