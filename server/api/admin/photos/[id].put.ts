import { PhotoSource } from '@prisma/client'
import { readBody } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { assertMaxLength, isSafePublicImagePath, sanitizeText } from '../../../utils/input'
import { prisma } from '../../../utils/prisma'

type PhotoPayload = {
  path?: string
  title?: string
  dessertSlug?: string | null
  inGallery?: boolean
  source?: 'seed' | 'telegram' | 'admin'
}

const clean = (value: unknown) => sanitizeText(value)
const parseSource = (value: unknown) => {
  const source = clean(value).toLowerCase()
  if (!source) {
    return undefined
  }
  if (source === 'seed') {
    return PhotoSource.seed
  }
  if (source === 'telegram') {
    return PhotoSource.telegram
  }
  if (source === 'admin') {
    return PhotoSource.admin
  }
  throw createError({ statusCode: 400, statusMessage: 'Недопустимое значение source.' })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан id фото.' })
  }

  const body = await readBody<PhotoPayload>(event)
  const nextPath = body.path !== undefined ? clean(body.path) : undefined
  const nextTitle = body.title !== undefined ? clean(body.title) : undefined

  if (nextPath !== undefined) {
    if (!nextPath) {
      throw createError({ statusCode: 400, statusMessage: 'Поле path не может быть пустым.' })
    }
    if (!isSafePublicImagePath(nextPath)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Разрешены только локальные пути изображений вида /uploads/... или /images/...'
      })
    }
    if (!assertMaxLength(nextPath, 400)) {
      throw createError({ statusCode: 400, statusMessage: 'Поле path слишком длинное.' })
    }
  }

  if (nextTitle !== undefined && (!nextTitle || !assertMaxLength(nextTitle, 120))) {
    throw createError({ statusCode: 400, statusMessage: 'Название фото не должно быть пустым и длиннее 120 символов.' })
  }

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
      path: nextPath,
      title: nextTitle,
      inGallery: typeof body.inGallery === 'boolean' ? body.inGallery : undefined,
      source: parseSource(body.source),
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
