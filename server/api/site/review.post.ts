import { readBody } from 'h3'
import { createAdminAccessLink } from '../../utils/admin-auth'
import { assertMaxLength, isValidPhone, sanitizeText } from '../../utils/input'
import { prisma } from '../../utils/prisma'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getReviewTelegramTargets } from '../../utils/telegram-targets'
import { sendTelegramMessage } from '../../utils/telegram'

type ReviewPayload = {
  name?: string
  phone?: string
  review?: string
  rating?: number
}

const isValidTelegramChatId = (value: string) => /^-?\d+$/.test(value)
const isTelegramInlineUrlAllowed = (value: string) => {
  try {
    const url = new URL(value)
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
    const host = url.hostname.toLowerCase()
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')
    return isHttp && !isLocal
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    key: 'site-review',
    limit: 3,
    windowMs: 30 * 60 * 1000
  })

  const body = await readBody<ReviewPayload>(event)
  const config = useRuntimeConfig(event)

  const name = sanitizeText(body?.name)
  const phone = sanitizeText(body?.phone)
  const review = sanitizeText(body?.review, { multiline: true })
  const rating = Number(body?.rating || 0)

  if (!name || !phone || !review || !rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные данные отзыва.' })
  }
  if (!assertMaxLength(name, 80) || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Имя должно содержать от 2 до 80 символов.' })
  }
  if (!assertMaxLength(phone, 32) || !isValidPhone(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Укажите корректный номер телефона.' })
  }
  if (!assertMaxLength(review, 1500) || review.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Текст отзыва должен быть от 10 до 1500 символов.' })
  }

  const token = String(config.telegramBotToken || '')
  const reviewTargets = getReviewTelegramTargets(config).filter(isValidTelegramChatId)

  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'Не настроен TELEGRAM_BOT_TOKEN.' })
  }
  if (!reviewTargets.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Не настроены TELEGRAM_REVIEW_CHAT_ID/TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_IDS.'
    })
  }

  const createdReview = await prisma.review.create({
    data: {
      name,
      phone,
      text: review,
      rating,
      approved: false
    }
  })

  const adminLink = await createAdminAccessLink(event)

  const inlineKeyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [
    [
      { text: '✅ Принять', callback_data: `review:approve:${createdReview.id}` },
      { text: '❌ Отклонить', callback_data: `review:reject:${createdReview.id}` }
    ]
  ]

  if (isTelegramInlineUrlAllowed(adminLink)) {
    inlineKeyboard.push([{ text: '🔐 Админ-панель', url: adminLink }])
  }

  const moderationKeyboard = {
    inline_keyboard: inlineKeyboard
  }

  const messageText = [
    '<b>Новый отзыв на модерацию (МАЛИНА)</b>',
    `ID: ${createdReview.id}`,
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Оценка: ${rating} / 5`,
    `Отзыв: ${review}`
  ].join('\n')

  let deliveredCount = 0
  let firstMessageId: number | null = null
  let lastTelegramError = ''

  for (const chatId of reviewTargets) {
    try {
      const sent = await sendTelegramMessage(token, chatId, messageText, { replyMarkup: moderationKeyboard })
      if (!firstMessageId) {
        firstMessageId = sent.message_id
      }
      deliveredCount += 1
    } catch (error) {
      lastTelegramError = error instanceof Error ? error.message : String(error)
      console.error(`Review Telegram send failed for chat ${chatId}`, error)
    }
  }

  if (!deliveredCount) {
    console.error(`Review ${createdReview.id} saved, but Telegram moderation delivery failed.`, lastTelegramError)
    return {
      ok: true,
      id: createdReview.id,
      telegramDelivered: 0,
      warning: 'Отзыв сохранен, но не отправлен в Telegram на модерацию. Мы проверим его вручную.'
    }
  }

  if (firstMessageId) {
    await prisma.review.update({
      where: { id: createdReview.id },
      data: {
        telegramMessage: firstMessageId
      }
    })
  }

  return { ok: true, id: createdReview.id, telegramDelivered: deliveredCount }
})
