import { basename, extname } from 'node:path'
import { PhotoSource } from '@prisma/client'
import { readBody } from 'h3'
import { createAdminAccessLink } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'
import { getAdminTelegramIds } from '../../utils/telegram-targets'
import { fetchTelegramFile, sendTelegramMessage, telegramRequest } from '../../utils/telegram'
import { writeUploadFile } from '../../utils/uploads'

type TelegramMessage = {
  message_id: number
  text?: string
  caption?: string
  chat: { id: number }
  from?: { id: number }
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>
}

type TelegramCallbackQuery = {
  id: string
  from: { id: number }
  data?: string
  message?: {
    message_id: number
    chat: { id: number }
  }
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

const safeJson = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const sanitize = (value: string) => value.replace(/[<>]/g, '').trim()

const inferLeadTimeHours = (category: string) => {
  if (category.includes('Меренговые')) {
    return 48
  }
  if (category.includes('Зефир')) {
    return 72
  }
  return null
}

const reviewStateText = (approved: boolean) => (approved ? 'подтвержден' : 'отклонен')
const allowedPhotoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MAX_TELEGRAM_PHOTO_BYTES = 15 * 1024 * 1024
const htmlSafe = (value: string) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const token = String(config.telegramBotToken || '')
  const update = await readBody<TelegramUpdate>(event)

  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'Не задан TELEGRAM_BOT_TOKEN.' })
  }

  const adminIds = getAdminTelegramIds(config)
  const callback = update.callback_query
  const message = update.message

  if (!message && !callback) {
    return { ok: true }
  }

  const senderId = String(callback?.from.id || message?.from?.id || message?.chat.id || '')
  const chatId = String(message?.chat.id || callback?.message?.chat.id || '')

  if (!adminIds.includes(senderId)) {
    if (callback?.id) {
      await telegramRequest(token, 'answerCallbackQuery', {
        callback_query_id: callback.id,
        text: 'Доступ запрещен.',
        show_alert: false
      })
    }

    if (chatId) {
      await sendTelegramMessage(token, chatId, 'Доступ запрещен.')
    }
    return { ok: true }
  }

  if (callback) {
    const data = String(callback.data || '')

    if (data.startsWith('review:approve:') || data.startsWith('review:reject:')) {
      const approve = data.startsWith('review:approve:')
      const reviewId = data.split(':')[2]
      const review = await prisma.review.findUnique({ where: { id: reviewId } })

      if (!review) {
        await telegramRequest(token, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: 'Отзыв не найден.',
          show_alert: false
        })
        return { ok: true }
      }

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          approved: approve,
          moderatedAt: new Date()
        }
      })

      await telegramRequest(token, 'answerCallbackQuery', {
        callback_query_id: callback.id,
        text: `Отзыв ${reviewStateText(approve)}.`,
        show_alert: false
      })

      if (callback.message?.chat.id && callback.message.message_id) {
        await telegramRequest(token, 'editMessageReplyMarkup', {
          chat_id: callback.message.chat.id,
          message_id: callback.message.message_id,
          reply_markup: {
            inline_keyboard: []
          }
        })

        await sendTelegramMessage(token, String(callback.message.chat.id), `Отзыв ${reviewId} ${reviewStateText(approve)}.`)
      }

      return { ok: true }
    }

    await telegramRequest(token, 'answerCallbackQuery', {
      callback_query_id: callback.id,
      text: 'Неизвестное действие.',
      show_alert: false
    })

    return { ok: true }
  }

  const incomingText = sanitize((message?.text || message?.caption || '').trim())
  const [command = '', ...args] = incomingText.split(' ')
  const argText = args.join(' ').trim()

  const adminLink = await createAdminAccessLink(event)
  const helpText = [
    'Команды админа:',
    '/admin',
    '/list_desserts',
    '/add_dessert {"slug":"...","name":"...","category":"...","description":"...","price":"..."}',
    '/update_dessert {"slug":"...","name":"..."}',
    `/delete_dessert ${htmlSafe('<slug>')}`,
    `/approve_review ${htmlSafe('<id>')}`,
    `/reject_review ${htmlSafe('<id>')}`,
    `/delete_photo ${htmlSafe('<photoId>')}`,
    'Загрузка фото:',
    `1) отправьте фото с подписью /add_photo ${htmlSafe('<slug>')} [заголовок]`,
    '2) отправьте фото с подписью /add_gallery [заголовок]',
    `Админ-панель: ${adminLink}`
  ].join('\n')

  if (command === '/start' || command === '/help') {
    await sendTelegramMessage(token, chatId, helpText)
    return { ok: true }
  }

  if (command === '/admin') {
    await sendTelegramMessage(token, chatId, `🔐 Быстрый вход в админ-панель:\n${adminLink}`)
    return { ok: true }
  }

  if (command === '/list_desserts') {
    const desserts = await prisma.dessert.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { slug: true, name: true }
    })

    const list = desserts.map((d) => `- ${d.slug}: ${d.name}`).join('\n')
    await sendTelegramMessage(token, chatId, list || 'Нет активных десертов.')
    return { ok: true }
  }

  if (command === '/add_dessert') {
    const payload = safeJson(argText)
    if (!payload?.slug || !payload?.name) {
      await sendTelegramMessage(token, chatId, 'Неверный JSON. Обязательные поля: slug, name.')
      return { ok: true }
    }

    const exists = await prisma.dessert.findUnique({ where: { slug: String(payload.slug) } })
    if (exists) {
      await sendTelegramMessage(token, chatId, `Десерт с slug ${payload.slug} уже существует.`)
      return { ok: true }
    }

    await prisma.dessert.create({
      data: {
        slug: String(payload.slug),
        name: String(payload.name),
        category: String(payload.category || 'Без категории'),
        description: String(payload.description || 'нет данных'),
        inside: String(payload.inside || 'нет данных'),
        decor: String(payload.decor || 'нет данных'),
        price: String(payload.price || 'нет данных'),
        leadTimeHours:
          typeof payload.leadTimeHours === 'number'
            ? payload.leadTimeHours
            : inferLeadTimeHours(String(payload.category || '')),
        ttkProteins: payload?.ttk?.proteins || null,
        ttkFats: payload?.ttk?.fats || null,
        ttkCarbs: payload?.ttk?.carbs || null,
        ttkKcal: payload?.ttk?.kcal || null,
        active: true
      }
    })

    await sendTelegramMessage(token, chatId, `Добавлено: ${payload.slug}`)
    return { ok: true }
  }

  if (command === '/update_dessert') {
    const payload = safeJson(argText)
    if (!payload?.slug) {
      await sendTelegramMessage(token, chatId, 'Нужен JSON с полем slug.')
      return { ok: true }
    }

    const dessert = await prisma.dessert.findUnique({ where: { slug: String(payload.slug) } })
    if (!dessert) {
      await sendTelegramMessage(token, chatId, 'Десерт не найден.')
      return { ok: true }
    }

    await prisma.dessert.update({
      where: { id: dessert.id },
      data: {
        name: payload.name ?? undefined,
        category: payload.category ?? undefined,
        description: payload.description ?? undefined,
        inside: payload.inside ?? undefined,
        decor: payload.decor ?? undefined,
        price: payload.price ?? undefined,
        leadTimeHours: typeof payload.leadTimeHours === 'number' ? payload.leadTimeHours : undefined,
        ttkProteins: payload?.ttk?.proteins ?? undefined,
        ttkFats: payload?.ttk?.fats ?? undefined,
        ttkCarbs: payload?.ttk?.carbs ?? undefined,
        ttkKcal: payload?.ttk?.kcal ?? undefined
      }
    })

    await sendTelegramMessage(token, chatId, `Обновлено: ${payload.slug}`)
    return { ok: true }
  }

  if (command === '/delete_dessert') {
    if (!argText) {
      await sendTelegramMessage(token, chatId, `Укажите slug: /delete_dessert ${htmlSafe('<slug>')}`)
      return { ok: true }
    }

    const dessert = await prisma.dessert.findUnique({ where: { slug: argText } })
    if (!dessert) {
      await sendTelegramMessage(token, chatId, 'Десерт не найден.')
      return { ok: true }
    }

    await prisma.dessert.update({
      where: { id: dessert.id },
      data: { active: false }
    })

    await sendTelegramMessage(token, chatId, `Удалено (деактивировано): ${argText}`)
    return { ok: true }
  }

  if (command === '/approve_review' || command === '/reject_review') {
    if (!argText) {
      await sendTelegramMessage(token, chatId, `Укажите id: ${command} ${htmlSafe('<id>')}`)
      return { ok: true }
    }

    const review = await prisma.review.findUnique({ where: { id: argText } })
    if (!review) {
      await sendTelegramMessage(token, chatId, 'Отзыв не найден.')
      return { ok: true }
    }

    const approved = command === '/approve_review'

    await prisma.review.update({
      where: { id: review.id },
      data: {
        approved,
        moderatedAt: new Date()
      }
    })

    await sendTelegramMessage(token, chatId, approved ? 'Отзыв подтвержден.' : 'Отзыв отклонен.')
    return { ok: true }
  }

  if (command === '/delete_photo') {
    if (!argText) {
      await sendTelegramMessage(token, chatId, `Укажите id: /delete_photo ${htmlSafe('<photoId>')}`)
      return { ok: true }
    }

    const exists = await prisma.photo.findUnique({ where: { id: argText } })
    if (!exists) {
      await sendTelegramMessage(token, chatId, 'Фото не найдено.')
      return { ok: true }
    }

    await prisma.photo.delete({ where: { id: argText } })
    await sendTelegramMessage(token, chatId, 'Фото удалено из БД.')
    return { ok: true }
  }

  const supportsPhotoCommand = command === '/add_photo' || command === '/add_gallery'

  if (supportsPhotoCommand) {
    if (!message?.photo?.length) {
      await sendTelegramMessage(token, chatId, 'Отправьте фото вместе с командой в подписи.')
      return { ok: true }
    }

    let dessertId: string | null = null
    let title = 'Фото из Telegram'

    if (command === '/add_photo') {
      const [slug, ...titleParts] = args
      if (!slug) {
        await sendTelegramMessage(token, chatId, `Укажите slug: /add_photo ${htmlSafe('<slug>')} [заголовок]`)
        return { ok: true }
      }

      const dessert = await prisma.dessert.findUnique({ where: { slug } })
      if (!dessert) {
        await sendTelegramMessage(token, chatId, 'Десерт не найден.')
        return { ok: true }
      }

      dessertId = dessert.id
      title = titleParts.join(' ').trim() || dessert.name
    }

    if (command === '/add_gallery') {
      title = argText.trim() || 'Фото для галереи'
    }

    const bestPhoto = [...message.photo].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0]
    if ((bestPhoto.file_size || 0) > MAX_TELEGRAM_PHOTO_BYTES) {
      await sendTelegramMessage(token, chatId, 'Файл слишком большой. Максимум 15 МБ.')
      return { ok: true }
    }

    const { filePath, data } = await fetchTelegramFile(token, bestPhoto.file_id)

    const extension = extname(filePath).toLowerCase()
    const normalizedExtension = allowedPhotoExtensions.has(extension) ? extension : '.jpg'
    const base = basename(filePath, extension)
    const filename = `${Date.now()}-${base}${normalizedExtension}`
    const { publicPath } = await writeUploadFile('telegram', filename, data)

    const createdPhoto = await prisma.photo.create({
      data: {
        path: publicPath,
        title,
        dessertId,
        inGallery: true,
        source: PhotoSource.telegram
      }
    })

    await sendTelegramMessage(token, chatId, `Фото добавлено: ${createdPhoto.id}`)
    return { ok: true }
  }

  await sendTelegramMessage(token, chatId, `Неизвестная команда.\n\n${helpText}`)
  return { ok: true }
})
