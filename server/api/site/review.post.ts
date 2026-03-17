import { readBody } from 'h3'
import { createAdminAccessLink, createReviewModerationLink } from '../../utils/admin-auth'
import { assertMaxLength, isValidPhone, sanitizeText } from '../../utils/input'
import { prisma } from '../../utils/prisma'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getReviewTelegramTargets, getReviewVkTargets } from '../../utils/telegram-targets'
import { sendTelegramMessage } from '../../utils/telegram'
import { sendVkMessage } from '../../utils/vk'

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

const isVkOpenLinkAllowed = (value: string) => {
  if (!value || value.length > 255) {
    return false
  }

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

  const telegramToken = String(config.telegramBotToken || '')
  const reviewTargets = getReviewTelegramTargets(config).filter(isValidTelegramChatId)
  const vkToken = String(config.vkBotToken || '')
  const vkTargets = getReviewVkTargets(config)
  const vkApiVersion = String(config.vkApiVersion || '5.199')
  const vkApiBaseUrl = String(config.vkApiBaseUrl || 'https://api.vk.com/method')

  const canSendTelegram = Boolean(telegramToken && reviewTargets.length)
  const canSendVk = Boolean(vkToken && vkTargets.length)

  if (!canSendTelegram && !canSendVk) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Не настроены каналы уведомлений. Укажите TELEGRAM_BOT_TOKEN+TELEGRAM_REVIEW_CHAT_ID/TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_IDS или VK_BOT_TOKEN+VK_REVIEW_PEER_IDS/VK_PEER_IDS.'
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
  const approveLink = createReviewModerationLink(event, createdReview.id, true)
  const rejectLink = createReviewModerationLink(event, createdReview.id, false)

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
  const plainMessageText = [
    'Новый отзыв на модерацию (МАЛИНА)',
    `ID: ${createdReview.id}`,
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Оценка: ${rating} / 5`,
    `Отзыв: ${review}`,
    `Подтвердить: ${approveLink}`,
    `Отклонить: ${rejectLink}`,
    `Админ-панель: ${adminLink}`
  ].join('\n')

  const vkKeyboardRows: Array<Array<{ action: { type: 'open_link'; label: string; link: string } }>> = []
  const moderationButtons: Array<{ action: { type: 'open_link'; label: string; link: string } }> = []

  if (isVkOpenLinkAllowed(approveLink)) {
    moderationButtons.push({
      action: {
        type: 'open_link',
        label: 'Подтвердить',
        link: approveLink
      }
    })
  }
  if (isVkOpenLinkAllowed(rejectLink)) {
    moderationButtons.push({
      action: {
        type: 'open_link',
        label: 'Отклонить',
        link: rejectLink
      }
    })
  }
  if (moderationButtons.length) {
    vkKeyboardRows.push(moderationButtons)
  }

  if (isVkOpenLinkAllowed(adminLink)) {
    vkKeyboardRows.push([
      {
        action: {
          type: 'open_link',
          label: 'Админ-панель',
          link: adminLink
        }
      }
    ])
  }

  const vkModerationKeyboard = vkKeyboardRows.length
    ? {
        one_time: false,
        buttons: vkKeyboardRows
      }
    : undefined

  let telegramDeliveredCount = 0
  let vkDeliveredCount = 0
  let firstMessageId: number | null = null
  let lastTelegramError = ''
  let lastVkError = ''

  if (canSendTelegram) {
    for (const chatId of reviewTargets) {
      try {
        const sent = await sendTelegramMessage(telegramToken, chatId, messageText, { replyMarkup: moderationKeyboard })
        if (!firstMessageId) {
          firstMessageId = sent.message_id
        }
        telegramDeliveredCount += 1
      } catch (error) {
        lastTelegramError = error instanceof Error ? error.message : String(error)
        console.error(`Review Telegram send failed for chat ${chatId}`, error)
      }
    }
  }

  if (canSendVk) {
    for (const target of vkTargets) {
      try {
        await sendVkMessage(
          vkToken,
          target,
          plainMessageText,
          vkApiVersion,
          vkApiBaseUrl,
          vkModerationKeyboard ? { keyboard: vkModerationKeyboard } : undefined
        )
        vkDeliveredCount += 1
      } catch (error) {
        lastVkError = error instanceof Error ? error.message : String(error)
        console.error(`Review VK send failed for target ${target}`, error)
      }
    }
  }

  if (!telegramDeliveredCount && !vkDeliveredCount) {
    console.error(`Review ${createdReview.id} saved, but notifications delivery failed.`, {
      telegram: lastTelegramError,
      vk: lastVkError
    })
    return {
      ok: true,
      id: createdReview.id,
      telegramDelivered: 0,
      vkDelivered: 0,
      warning: 'Отзыв сохранен, но не отправлен в Telegram/VK на модерацию. Мы проверим его вручную.'
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

  return { ok: true, id: createdReview.id, telegramDelivered: telegramDeliveredCount, vkDelivered: vkDeliveredCount }
})
