import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { invalidateHolidayCatalogCache } from '../../../utils/holiday-catalog'
import {
  normalizeHolidayIcon,
  normalizeHolidayName,
  normalizeHolidaySlug,
  parseHolidayBool,
  parseHolidayDate,
  parseHolidaySortOrder,
  validateHolidayDateRange
} from '../../../utils/holiday-catalog-admin'
import { prisma } from '../../../utils/prisma'

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

  const body = await readBody<SectionPayload>(event)

  const name = normalizeHolidayName(body.name)
  const slug = normalizeHolidaySlug(name, body.slug)
  const active = parseHolidayBool(body.active, true)
  const sortOrder = parseHolidaySortOrder(body.sortOrder, 100)
  const isCurrentHoliday = parseHolidayBool(body.isCurrentHoliday, false)
  const icon = normalizeHolidayIcon(body.icon)
  const activeFrom = parseHolidayDate(body.activeFrom)
  const activeTo = parseHolidayDate(body.activeTo)

  validateHolidayDateRange(activeFrom, activeTo)

  try {
    const section = await prisma.$transaction(async (tx) => {
      if (isCurrentHoliday) {
        await tx.holidaySection.updateMany({
          where: { isCurrentHoliday: true },
          data: { isCurrentHoliday: false }
        })
      }

      return tx.holidaySection.create({
        data: {
          name,
          slug,
          active,
          sortOrder,
          isCurrentHoliday,
          icon,
          activeFrom: activeFrom === undefined ? null : activeFrom,
          activeTo: activeTo === undefined ? null : activeTo
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
