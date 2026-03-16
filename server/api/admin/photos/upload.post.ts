import { randomUUID } from 'node:crypto'
import { PhotoSource } from '@prisma/client'
import { readMultipartFormData } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { assertMaxLength, sanitizeText } from '../../../utils/input'
import { prisma } from '../../../utils/prisma'
import { writeUploadFile } from '../../../utils/uploads'

const sanitize = (value: unknown) => sanitizeText(value)
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const toPhotoSource = (value: string): PhotoSource => {
  if (!value) {
    return PhotoSource.admin
  }
  if (value === 'seed') {
    return PhotoSource.seed
  }
  if (value === 'telegram') {
    return PhotoSource.telegram
  }
  if (value === 'admin') {
    return PhotoSource.admin
  }
  throw createError({ statusCode: 400, statusMessage: 'Недопустимое значение source.' })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не передан.' })
  }

  const file = parts.find((part) => part.name === 'file')
  if (!file?.data || !file.type) {
    throw createError({ statusCode: 400, statusMessage: 'Нужен файл изображения.' })
  }
  const extension = ALLOWED_MIME_TO_EXT[file.type]
  if (!extension) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Допустимые форматы: JPG, PNG, WEBP.'
    })
  }
  if (!file.data.byteLength) {
    throw createError({ statusCode: 400, statusMessage: 'Файл пустой.' })
  }
  if (file.data.byteLength > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Файл слишком большой. Максимум 15 МБ.' })
  }

  const title = sanitize(parts.find((part) => part.name === 'title')?.data?.toString('utf8'))
  const dessertSlug = sanitize(parts.find((part) => part.name === 'dessertSlug')?.data?.toString('utf8'))
  const inGalleryRaw = sanitize(parts.find((part) => part.name === 'inGallery')?.data?.toString('utf8'))
  const sourceRaw = sanitize(parts.find((part) => part.name === 'source')?.data?.toString('utf8'))
  if (title && !assertMaxLength(title, 120)) {
    throw createError({ statusCode: 400, statusMessage: 'Название фото не должно превышать 120 символов.' })
  }
  if (dessertSlug && !assertMaxLength(dessertSlug, 80)) {
    throw createError({ statusCode: 400, statusMessage: 'Слишком длинный slug десерта.' })
  }
  if (inGalleryRaw && inGalleryRaw !== 'true' && inGalleryRaw !== 'false') {
    throw createError({ statusCode: 400, statusMessage: 'Поле inGallery должно быть true или false.' })
  }

  let dessertId: string | null = null

  if (dessertSlug) {
    const dessert = await prisma.dessert.findUnique({ where: { slug: dessertSlug } })
    if (!dessert) {
      throw createError({ statusCode: 404, statusMessage: 'Десерт по slug не найден.' })
    }
    dessertId = dessert.id
  }

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
  const { publicPath } = await writeUploadFile('admin', filename, file.data)

  const created = await prisma.photo.create({
    data: {
      path: publicPath,
      title: title || file.filename || 'Фото',
      dessertId,
      inGallery: inGalleryRaw ? inGalleryRaw === 'true' : true,
      source: toPhotoSource(sourceRaw)
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
