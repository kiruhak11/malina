import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { PhotoSource } from '@prisma/client'
import { readMultipartFormData } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import { prisma } from '../../../utils/prisma'

const sanitize = (value: unknown) => String(value ?? '').trim()
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

const toPhotoSource = (value: string): PhotoSource => {
  if (value === 'seed') {
    return PhotoSource.seed
  }
  if (value === 'telegram') {
    return PhotoSource.telegram
  }
  return PhotoSource.admin
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не передан.' })
  }

  const file = parts.find((part) => part.name === 'file')
  if (!file?.data || !file.type?.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Нужен файл изображения.' })
  }
  if (file.data.byteLength > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Файл слишком большой. Максимум 15 МБ.' })
  }

  const title = sanitize(parts.find((part) => part.name === 'title')?.data?.toString('utf8'))
  const dessertSlug = sanitize(parts.find((part) => part.name === 'dessertSlug')?.data?.toString('utf8'))
  const inGalleryRaw = sanitize(parts.find((part) => part.name === 'inGallery')?.data?.toString('utf8'))
  const sourceRaw = sanitize(parts.find((part) => part.name === 'source')?.data?.toString('utf8'))

  let dessertId: string | null = null

  if (dessertSlug) {
    const dessert = await prisma.dessert.findUnique({ where: { slug: dessertSlug } })
    if (!dessert) {
      throw createError({ statusCode: 404, statusMessage: 'Десерт по slug не найден.' })
    }
    dessertId = dessert.id
  }

  const extension = extname(file.filename || '').toLowerCase() || '.jpg'
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
  const absolutePath = `${process.cwd()}/public/uploads/admin/${filename}`
  const publicPath = `/uploads/admin/${filename}`

  await mkdir(`${process.cwd()}/public/uploads/admin`, { recursive: true })
  await writeFile(absolutePath, file.data)

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
