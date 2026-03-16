import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { prisma } from '../../../utils/prisma'

type ReviewPayload = {
  name?: string
  phone?: string | null
  text?: string
  rating?: number
  approved?: boolean
}

const clean = (value: unknown) => String(value ?? '').trim()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id отзыва.' })
  }

  const body = await readBody<ReviewPayload>(event)

  const updated = await prisma.review.update({
    where: { id },
    data: {
      name: body.name !== undefined ? clean(body.name) : undefined,
      phone: body.phone !== undefined ? clean(body.phone) || null : undefined,
      text: body.text !== undefined ? clean(body.text) : undefined,
      rating:
        body.rating !== undefined
          ? Number.isFinite(body.rating) && body.rating >= 1 && body.rating <= 5
            ? Math.round(body.rating)
            : undefined
          : undefined,
      approved: typeof body.approved === 'boolean' ? body.approved : undefined,
      moderatedAt: typeof body.approved === 'boolean' ? new Date() : undefined
    }
  })

  return { ok: true, review: updated }
})
