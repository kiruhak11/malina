import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { assertMaxLength, isValidFutureDate, isValidPhone, sanitizeText } from '../../utils/input'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getOrderTelegramTargets, getOrderVkTargets } from '../../utils/telegram-targets'
import { sendTelegramMessage } from '../../utils/telegram'
import { sendVkMessage } from '../../utils/vk'

type OrderPayload = {
  name?: string
  phone?: string
  dessert?: string
  orderDate?: string
  details?: string
}

const isValidTelegramChatId = (value: string) => /^-?\d+$/.test(value)

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    key: 'site-order',
    limit: 5,
    windowMs: 10 * 60 * 1000
  })

  const body = await readBody<OrderPayload>(event)
  const config = useRuntimeConfig(event)

  const name = sanitizeText(body?.name)
  const phone = sanitizeText(body?.phone)
  const dessert = sanitizeText(body?.dessert)
  const orderDate = sanitizeText(body?.orderDate)
  const details = sanitizeText(body?.details, { multiline: true })

  if (!name || !phone || !dessert || !orderDate) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные данные заявки.' })
  }
  if (!assertMaxLength(name, 80) || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Имя должно содержать от 2 до 80 символов.' })
  }
  if (!assertMaxLength(phone, 32) || !isValidPhone(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Укажите корректный номер телефона.' })
  }
  if (!assertMaxLength(dessert, 120) || dessert.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Поле десерта заполнено некорректно.' })
  }
  if (!isValidFutureDate(orderDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Дата заказа должна быть в формате ГГГГ-ММ-ДД и не раньше сегодняшней.'
    })
  }
  if (!assertMaxLength(details, 1000)) {
    throw createError({ statusCode: 400, statusMessage: 'Комментарий слишком длинный (максимум 1000 символов).' })
  }

  const telegramToken = String(config.telegramBotToken || '')
  const telegramTargets = getOrderTelegramTargets(config).filter(isValidTelegramChatId)
  const vkToken = String(config.vkBotToken || '')
  const vkTargets = getOrderVkTargets(config)
  const vkApiVersion = String(config.vkApiVersion || '5.199')
  const vkApiBaseUrl = String(config.vkApiBaseUrl || 'https://api.vk.com/method')

  const canSendTelegram = Boolean(telegramToken && telegramTargets.length)
  const canSendVk = Boolean(vkToken && vkTargets.length)

  if (!canSendTelegram && !canSendVk) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Не настроены каналы уведомлений. Укажите TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_IDS или VK_BOT_TOKEN+VK_PEER_IDS.'
    })
  }

  const created = await prisma.orderRequest.create({
    data: {
      name,
      phone,
      dessert,
      orderDate,
      details: details || null
    }
  })

  const messageText = [
    '<b>Новая заявка (МАЛИНА)</b>',
    `ID: ${created.id}`,
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Десерт: ${dessert}`,
    `Дата заказа: ${orderDate}`,
    `Дополнительно: ${details || 'нет данных'}`
  ].join('\n')
  const plainMessageText = [
    'Новая заявка (МАЛИНА)',
    `ID: ${created.id}`,
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Десерт: ${dessert}`,
    `Дата заказа: ${orderDate}`,
    `Дополнительно: ${details || 'нет данных'}`
  ].join('\n')

  let telegramDeliveredCount = 0
  let vkDeliveredCount = 0
  let lastTelegramError = ''
  let lastVkError = ''

  if (canSendTelegram) {
    for (const chatId of telegramTargets) {
      try {
        await sendTelegramMessage(telegramToken, chatId, messageText)
        telegramDeliveredCount += 1
      } catch (error) {
        lastTelegramError = error instanceof Error ? error.message : String(error)
        console.error(`Order Telegram send failed for chat ${chatId}`, error)
      }
    }
  }

  if (canSendVk) {
    for (const target of vkTargets) {
      try {
        await sendVkMessage(vkToken, target, plainMessageText, vkApiVersion, vkApiBaseUrl)
        vkDeliveredCount += 1
      } catch (error) {
        lastVkError = error instanceof Error ? error.message : String(error)
        console.error(`Order VK send failed for target ${target}`, error)
      }
    }
  }

  if (!telegramDeliveredCount && !vkDeliveredCount) {
    console.error(`Order ${created.id} saved, but notifications delivery failed.`, {
      telegram: lastTelegramError,
      vk: lastVkError
    })
    return {
      ok: true,
      id: created.id,
      telegramDelivered: 0,
      vkDelivered: 0,
      warning: 'Заявка сохранена, но уведомления не отправлены в Telegram/VK. Мы обработаем ее вручную.'
    }
  }

  return { ok: true, id: created.id, telegramDelivered: telegramDeliveredCount, vkDelivered: vkDeliveredCount }
})
