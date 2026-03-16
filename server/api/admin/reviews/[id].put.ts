import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { assertMaxLength, sanitizeText } from '../../../utils/input'
import { prisma } from '../../../utils/prisma'

type ReviewPayload = {
  name?: string
  phone?: string | null
  text?: string
  rating?: number
  approved?: boolean
}

const clean = (value: unknown) => sanitizeText(value)

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id отзыва.' })
  }

  const body = await readBody<ReviewPayload>(event)
  const nextName = body.name !== undefined ? clean(body.name) : undefined
  const nextPhone = body.phone !== undefined ? clean(body.phone) || null : undefined
  const nextText = body.text !== undefined ? clean(body.text) : undefined

  if (nextName !== undefined && (!nextName || !assertMaxLength(nextName, 80))) {
    throw createError({ statusCode: 400, statusMessage: 'Имя не должно быть пустым и длиннее 80 символов.' })
  }
  if (nextPhone !== undefined && nextPhone !== null && !assertMaxLength(nextPhone, 32)) {
    throw createError({ statusCode: 400, statusMessage: 'Телефон слишком длинный.' })
  }
  if (nextText !== undefined && (!nextText || !assertMaxLength(nextText, 1500))) {
    throw createError({ statusCode: 400, statusMessage: 'Текст отзыва не должен быть пустым и длиннее 1500 символов.' })
  }
  if (
    body.rating !== undefined &&
    (!Number.isFinite(body.rating) || body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating))
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Оценка должна быть целым числом от 1 до 5.' })
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      name: nextName,
      phone: nextPhone,
      text: nextText,
      rating: body.rating !== undefined ? body.rating : undefined,
      approved: typeof body.approved === 'boolean' ? body.approved : undefined,
      moderatedAt: typeof body.approved === 'boolean' ? new Date() : undefined
    }
  })

  return { ok: true, review: updated }
})
