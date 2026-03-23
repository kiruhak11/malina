import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { PhotoSource } from '@prisma/client'
import { getHeader, readBody, readMultipartFormData } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { assertMaxLength, sanitizeText } from '../../utils/input'
import { invalidateHolidayCatalogCache } from '../../utils/holiday-catalog'
import { prisma } from '../../utils/prisma'
import { writeUploadFile } from '../../utils/uploads'

type DessertPayload = {
  slug?: unknown
  category?: unknown
  name?: unknown
  description?: unknown
  inside?: unknown
  decor?: unknown
  price?: unknown
  leadTimeHours?: unknown
  active?: unknown
  holidaySectionSlugs?: unknown
  ttk?: {
    kbju?: {
      proteins?: unknown
      fats?: unknown
      carbs?: unknown
      kcal?: unknown
    }
  }
}

type UploadedDessertPhoto = {
  extension: string
  data: Buffer
  title: string
  inGallery: boolean
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const clean = (value: unknown, fallback = '') => sanitizeText(value ?? fallback)
const nullable = (value: unknown) => {
  const next = sanitizeText(value)
  return next ? next : null
}
const isValidSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

const parseHolidaySectionSlugs = (value: unknown): string[] => {
  if (value === undefined || value === null || value === '') {
    return []
  }

  const rawValues =
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? (() => {
            const normalized = value.trim()
            if (!normalized) {
              return []
            }
            if (normalized.startsWith('[')) {
              try {
                const parsed = JSON.parse(normalized)
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return normalized.split(',')
              }
            }
            return normalized.split(',')
          })()
        : []

  const slugs = [...new Set(rawValues.map((item) => clean(item)).filter(Boolean))]

  for (const slug of slugs) {
    if (!isValidSlug(slug) || !assertMaxLength(slug, 80)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный slug праздничного раздела.'
      })
    }
  }

  return slugs
}

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  const normalized = clean(value).toLowerCase()
  if (normalized === 'true' || normalized === '1') {
    return true
  }
  if (normalized === 'false' || normalized === '0') {
    return false
  }

  return fallback
}

const parseLeadTime = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw createError({ statusCode: 400, statusMessage: 'Поле leadTimeHours заполнено некорректно.' })
  }

  return Math.max(0, Math.min(720, Math.round(parsed)))
}

const toBodyFromMultipart = async (event: Parameters<typeof readMultipartFormData>[0]) => {
  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Данные десерта не переданы.' })
  }

  const field = (name: string) => clean(parts.find((part) => part.name === name)?.data?.toString('utf8'))
  const photoInGalleryRaw = field('photoInGallery')
  const photoTitleRaw = field('photoTitle')

  const file = parts.find((part) => part.name === 'file')
  let uploadedPhoto: UploadedDessertPhoto | null = null

  if (file?.data?.byteLength) {
    const extension = file.type ? ALLOWED_MIME_TO_EXT[file.type] : undefined
    if (!extension) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Фото десерта: допустимые форматы JPG, PNG, WEBP.'
      })
    }
    if (file.data.byteLength > MAX_UPLOAD_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'Фото десерта слишком большое. Максимум 15 МБ.' })
    }

    uploadedPhoto = {
      extension,
      data: file.data,
      title: photoTitleRaw || field('name') || 'Фото десерта',
      inGallery: parseBoolean(photoInGalleryRaw, true)
    }
  }

  const body: DessertPayload = {
    slug: field('slug'),
    category: field('category'),
    name: field('name'),
    description: field('description'),
    inside: field('inside'),
    decor: field('decor'),
    price: field('price'),
    leadTimeHours: field('leadTimeHours'),
    active: field('active'),
    holidaySectionSlugs: field('holidaySectionSlugs'),
    ttk: {
      kbju: {
        proteins: field('ttkProteins'),
        fats: field('ttkFats'),
        carbs: field('ttkCarbs'),
        kcal: field('ttkKcal')
      }
    }
  }

  return { body, uploadedPhoto }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const contentType = getHeader(event, 'content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')

  const multipartPayload = isMultipart ? await toBodyFromMultipart(event) : null
  const body = multipartPayload?.body || (await readBody<DessertPayload>(event))
  const uploadedPhoto = multipartPayload?.uploadedPhoto || null

  const slug = clean(body.slug)
  const name = clean(body.name)
  const holidaySectionSlugs = parseHolidaySectionSlugs(body.holidaySectionSlugs)

  if (!slug || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Поля slug и name обязательны.' })
  }
  if (!isValidSlug(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'slug может содержать только латинские буквы в нижнем регистре, цифры и дефисы.'
    })
  }
  if (!assertMaxLength(slug, 80)) {
    throw createError({ statusCode: 400, statusMessage: 'slug слишком длинный.' })
  }
  if (!assertMaxLength(name, 120)) {
    throw createError({ statusCode: 400, statusMessage: 'Название не должно превышать 120 символов.' })
  }
  if (uploadedPhoto && !assertMaxLength(uploadedPhoto.title, 120)) {
    throw createError({ statusCode: 400, statusMessage: 'Название фото не должно превышать 120 символов.' })
  }

  const leadTimeHours = parseLeadTime(body.leadTimeHours)
  let storedFileAbsolutePaths: string[] = []

  try {
    const created = await prisma.$transaction(async (tx) => {
      const dessert = await tx.dessert.create({
        data: {
          slug,
          category: clean(body.category, 'Без категории'),
          name,
          description: clean(body.description, 'нет данных'),
          inside: clean(body.inside, 'нет данных'),
          decor: clean(body.decor, 'нет данных'),
          price: clean(body.price, 'нет данных'),
          leadTimeHours,
          active: parseBoolean(body.active, true),
          ttkProteins: nullable(body.ttk?.kbju?.proteins),
          ttkFats: nullable(body.ttk?.kbju?.fats),
          ttkCarbs: nullable(body.ttk?.kbju?.carbs),
          ttkKcal: nullable(body.ttk?.kbju?.kcal)
        }
      })

      if (uploadedPhoto) {
        const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${uploadedPhoto.extension}`
        const savedFile = await writeUploadFile('admin', filename, uploadedPhoto.data)
        const publicPath = savedFile.publicPath
        storedFileAbsolutePaths = savedFile.absolutePaths

        await tx.photo.create({
          data: {
            path: publicPath,
            title: uploadedPhoto.title,
            dessertId: dessert.id,
            inGallery: uploadedPhoto.inGallery,
            source: PhotoSource.admin
          }
        })
      }

      if (holidaySectionSlugs.length) {
        const sections = await tx.holidaySection.findMany({
          where: {
            slug: { in: holidaySectionSlugs }
          },
          select: {
            id: true,
            slug: true
          }
        })

        if (sections.length !== holidaySectionSlugs.length) {
          const sectionSlugs = new Set(sections.map((item) => item.slug))
          const missing = holidaySectionSlugs.filter((item) => !sectionSlugs.has(item))
          throw createError({
            statusCode: 404,
            statusMessage: `Праздничные разделы не найдены: ${missing.join(', ')}.`
          })
        }

        await tx.holidaySectionDessert.createMany({
          data: sections.map((section) => ({
            sectionId: section.id,
            dessertId: dessert.id
          })),
          skipDuplicates: true
        })
      }

      return tx.dessert.findUnique({
        where: { id: dessert.id },
        include: {
          photos: {
            select: { id: true, path: true, title: true }
          }
        }
      })
    })

    invalidateHolidayCatalogCache()

    return { ok: true, dessert: created }
  } catch (error: unknown) {
    if (storedFileAbsolutePaths.length) {
      await Promise.all(storedFileAbsolutePaths.map((path) => unlink(path).catch(() => {})))
    }

    if ((error as { code?: string })?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Десерт с таким slug уже существует.' })
    }
    throw error
  }
})
