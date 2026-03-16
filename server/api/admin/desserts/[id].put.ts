import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
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

const clean = (value: unknown) => String(value ?? '').trim()
const nullableOrUndefined = (value: unknown) => {
  if (value === undefined) {
    return undefined
  }
  const next = String(value ?? '').trim()
  return next ? next : null
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id десерта.' })
  }

  const body = await readBody<DessertPayload>(event)

  const updated = await prisma.dessert.update({
    where: { id },
    data: {
      slug: body.slug !== undefined ? clean(body.slug) : undefined,
      category: body.category !== undefined ? clean(body.category) : undefined,
      name: body.name !== undefined ? clean(body.name) : undefined,
      description: body.description !== undefined ? clean(body.description) : undefined,
      inside: body.inside !== undefined ? clean(body.inside) : undefined,
      decor: body.decor !== undefined ? clean(body.decor) : undefined,
      price: body.price !== undefined ? clean(body.price) : undefined,
      leadTimeHours:
        body.leadTimeHours === undefined
          ? undefined
          : typeof body.leadTimeHours === 'number' && Number.isFinite(body.leadTimeHours)
            ? body.leadTimeHours
            : null,
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
})
