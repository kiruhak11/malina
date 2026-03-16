import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { assertMaxLength, sanitizeText } from '../../../utils/input'
import { prisma } from '../../../utils/prisma'

type DessertPayload = {
  slug?: string
  category?: string
  name?: string
  description?: string
  inside?: string
  decor?: string
  price?: string
  leadTimeHours?: number | null
  active?: boolean
  ttk?: {
    kbju?: {
      proteins?: string | null
      fats?: string | null
      carbs?: string | null
      kcal?: string | null
    }
  }
}

const clean = (value: unknown) => sanitizeText(value)
const nullableOrUndefined = (value: unknown) => {
  if (value === undefined) {
    return undefined
  }
  const next = sanitizeText(value)
  return next ? next : null
}
const isValidSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id десерта.' })
  }

  const body = await readBody<DessertPayload>(event)
  const nextSlug = body.slug !== undefined ? clean(body.slug) : undefined
  const nextName = body.name !== undefined ? clean(body.name) : undefined

  if (nextSlug !== undefined) {
    if (!nextSlug || !isValidSlug(nextSlug) || !assertMaxLength(nextSlug, 80)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный slug: только нижний регистр, цифры, дефис; длина до 80 символов.'
      })
    }
  }

  if (nextName !== undefined && (!nextName || !assertMaxLength(nextName, 120))) {
    throw createError({ statusCode: 400, statusMessage: 'Название не должно быть пустым и длиннее 120 символов.' })
  }

  const leadTimeHours =
    body.leadTimeHours === undefined
      ? undefined
      : typeof body.leadTimeHours === 'number' && Number.isFinite(body.leadTimeHours)
        ? Math.max(0, Math.min(720, Math.round(body.leadTimeHours)))
        : null

  try {
    const updated = await prisma.dessert.update({
      where: { id },
      data: {
        slug: nextSlug,
        category: body.category !== undefined ? clean(body.category) : undefined,
        name: nextName,
        description: body.description !== undefined ? clean(body.description) : undefined,
        inside: body.inside !== undefined ? clean(body.inside) : undefined,
        decor: body.decor !== undefined ? clean(body.decor) : undefined,
        price: body.price !== undefined ? clean(body.price) : undefined,
        leadTimeHours,
        active: typeof body.active === 'boolean' ? body.active : undefined,
        ttkProteins: nullableOrUndefined(body.ttk?.kbju?.proteins),
        ttkFats: nullableOrUndefined(body.ttk?.kbju?.fats),
        ttkCarbs: nullableOrUndefined(body.ttk?.kbju?.carbs),
        ttkKcal: nullableOrUndefined(body.ttk?.kbju?.kcal)
      },
      include: {
        photos: {
          select: { id: true, path: true, title: true }
        }
      }
    })

    return { ok: true, dessert: updated }
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Десерт с таким slug уже существует.' })
    }
    throw error
  }
})
