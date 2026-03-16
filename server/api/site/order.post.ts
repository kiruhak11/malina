import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { assertMaxLength, isValidFutureDate, isValidPhone, sanitizeText } from '../../utils/input'
import { enforceRateLimit } from '../../utils/rate-limit'
import { getOrderTelegramTargets } from '../../utils/telegram-targets'
import { sendTelegramMessage } from '../../utils/telegram'

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

  const token = String(config.telegramBotToken || '')
  const targets = getOrderTelegramTargets(config).filter(isValidTelegramChatId)

  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'Не настроен TELEGRAM_BOT_TOKEN.' })
  }

  if (!targets.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Не настроены TELEGRAM_CHAT_ID или TELEGRAM_ADMIN_IDS.'
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

  let deliveredCount = 0
  let lastTelegramError = ''
  for (const chatId of targets) {
    try {
      await sendTelegramMessage(token, chatId, messageText)
      deliveredCount += 1
    } catch (error) {
      lastTelegramError = error instanceof Error ? error.message : String(error)
      console.error(`Order Telegram send failed for chat ${chatId}`, error)
    }
  }

  if (!deliveredCount) {
    console.error(`Order ${created.id} saved, but Telegram delivery failed.`, lastTelegramError)
    return {
      ok: true,
      id: created.id,
      telegramDelivered: 0,
      warning: 'Заявка сохранена, но уведомление в Telegram не отправлено. Мы обработаем ее вручную.'
    }
  }

  return { ok: true, id: created.id, telegramDelivered: deliveredCount }
})
