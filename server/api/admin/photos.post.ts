import { PhotoSource } from '@prisma/client'
import { readBody } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

type PhotoPayload = {
  path?: string
  title?: string
  dessertSlug?: string | null
  inGallery?: boolean
  source?: 'seed' | 'telegram' | 'admin'
}

const clean = (value: unknown, fallback = '') => String(value ?? fallback).trim()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<PhotoPayload>(event)

  const path = clean(body.path)
  const title = clean(body.title, 'Без названия')

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Поле path обязательно.' })
  }

  let dessertId: string | null = null
  const dessertSlug = clean(body.dessertSlug)

  if (dessertSlug) {
    const dessert = await prisma.dessert.findUnique({ where: { slug: dessertSlug } })
    if (!dessert) {
      throw createError({ statusCode: 404, statusMessage: 'Десерт не найден по slug.' })
    }
    dessertId = dessert.id
  }

  const created = await prisma.photo.create({
    data: {
      path,
      title,
      dessertId,
      inGallery: typeof body.inGallery === 'boolean' ? body.inGallery : true,
      source: body.source ? PhotoSource[body.source] : PhotoSource.admin
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
      ...created,
      dessertSlug: created.dessert?.slug || null,
      dessertName: created.dessert?.name || null
    }
  }
})
