import { assertMaxLength, sanitizeText } from './input'
import { isValidSlug, slugify } from './slug'

export const HOLIDAY_MAX_SECTION_NAME = 120
export const HOLIDAY_MAX_TITLE = 120
export const HOLIDAY_MAX_SLUG = 80
export const HOLIDAY_MAX_ICON = 160

export const cleanHolidayText = (value: unknown) => sanitizeText(value)

export const parseHolidayBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  const normalized = cleanHolidayText(value).toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'on') {
    return true
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false
  }

  return fallback
}

export const parseHolidaySortOrder = (value: unknown, fallback = 100) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw createError({ statusCode: 400, statusMessage: 'Поле sortOrder заполнено некорректно.' })
  }

  return Math.max(0, Math.min(100_000, Math.round(parsed)))
}

export const parseHolidayDate = (value: unknown): Date | null | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === '') {
    return null
  }

  const raw = typeof value === 'string' ? value.trim() : String(value)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный формат даты и времени.' })
  }

  return parsed
}

export const validateHolidayDateRange = (from: Date | null | undefined, to: Date | null | undefined) => {
  if (!from || !to) {
    return
  }

  if (from.getTime() > to.getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'Дата окончания не может быть раньше даты начала.' })
  }
}

export const normalizeHolidaySlug = (name: unknown, slug: unknown) => {
  const explicit = cleanHolidayText(slug)
  const generated = explicit || slugify(name)

  if (!generated) {
    throw createError({ statusCode: 400, statusMessage: 'Не удалось сформировать slug. Укажите slug вручную.' })
  }

  if (!isValidSlug(generated) || !assertMaxLength(generated, HOLIDAY_MAX_SLUG)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'slug может содержать только латиницу, цифры и дефисы (до 80 символов).'
    })
  }

  return generated
}

export const normalizeHolidayName = (name: unknown) => {
  const value = cleanHolidayText(name)
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: 'Название раздела обязательно.' })
  }
  if (!assertMaxLength(value, HOLIDAY_MAX_SECTION_NAME)) {
    throw createError({ statusCode: 400, statusMessage: 'Название раздела не должно превышать 120 символов.' })
  }

  return value
}

export const normalizeHolidayTitle = (title: unknown) => {
  const value = cleanHolidayText(title)
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: 'Название блока праздничного каталога обязательно.' })
  }
  if (!assertMaxLength(value, HOLIDAY_MAX_TITLE)) {
    throw createError({ statusCode: 400, statusMessage: 'Название блока не должно превышать 120 символов.' })
  }

  return value
}

export const normalizeHolidayIcon = (icon: unknown) => {
  const value = cleanHolidayText(icon)
  if (!value) {
    return null
  }
  if (!assertMaxLength(value, HOLIDAY_MAX_ICON)) {
    throw createError({ statusCode: 400, statusMessage: 'Иконка/подпись слишком длинная (до 160 символов).' })
  }

  return value
}
