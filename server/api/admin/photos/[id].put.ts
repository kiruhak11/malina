import { PhotoSource } from '@prisma/client'
import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { prisma } from '../../../utils/prisma'

type PhotoPayload = {
  path?: string
  title?: string
  dessertSlug?: string | null
  inGallery?: boolean
  source?: 'seed' | 'telegram' | 'admin'
}

const clean = (value: unknown) => String(value ?? '').trim()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id фото.' })
  }

  const body = await readBody<PhotoPayload>(event)

  let dessertId: string | null | undefined

  if (body.dessertSlug !== undefined) {
    const dessertSlug = clean(body.dessertSlug)

    if (!dessertSlug) {
      dessertId = null
    } else {
      const dessert = await prisma.dessert.findUnique({ where: { slug: dessertSlug } })
      if (!dessert) {
        throw createError({ statusCode: 404, statusMessage: 'Десерт не найден по slug.' })
      }
      dessertId = dessert.id
    }
  }

  const updated = await prisma.photo.update({
    where: { id },
    data: {
      path: body.path !== undefined ? clean(body.path) : undefined,
      title: body.title !== undefined ? clean(body.title) : undefined,
      inGallery: typeof body.inGallery === 'boolean' ? body.inGallery : undefined,
      source: body.source ? PhotoSource[body.source] : undefined,
      dessertId
    },
    include: {
      dessert: {
        select: { slug: true, name: true }
      }
    }
  })

  return {
    ok: true,
    photo: {
      ...updated,
      dessertSlug: updated.dessert?.slug || null,
      dessertName: updated.dessert?.name || null
    }
  }
})
