import { readBody } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

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

const clean = (value: unknown, fallback = '') => String(value ?? fallback).trim()
const nullable = (value: unknown) => {
  const next = String(value ?? '').trim()
  return next ? next : null
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<DessertPayload>(event)

  const slug = clean(body.slug)
  const name = clean(body.name)

  if (!slug || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Поля slug и name обязательны.' })
  }

  const created = await prisma.dessert.create({
    data: {
      slug,
      category: clean(body.category, 'Без категории'),
      name,
      description: clean(body.description, 'нет данных'),
      inside: clean(body.inside, 'нет данных'),
      decor: clean(body.decor, 'нет данных'),
      price: clean(body.price, 'нет данных'),
      leadTimeHours:
        typeof body.leadTimeHours === 'number' && Number.isFinite(body.leadTimeHours) ? body.leadTimeHours : null,
      active: typeof body.active === 'boolean' ? body.active : true,
      ttkProteins: nullable(body.ttk?.kbju?.proteins),
      ttkFats: nullable(body.ttk?.kbju?.fats),
      ttkCarbs: nullable(body.ttk?.kbju?.carbs),
      ttkKcal: nullable(body.ttk?.kbju?.kcal)
    },
    include: {
      photos: {
        select: { id: true, path: true, title: true }
      }
    }
  })

  return { ok: true, dessert: created }
})
