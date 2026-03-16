import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { getOrderTelegramTargets } from '../../utils/telegram-targets'
import { sendTelegramMessage } from '../../utils/telegram'

type OrderPayload = {
  name?: string
  phone?: string
  dessert?: string
  orderDate?: string
  details?: string
}

const sanitize = (value: string) => value.replace(/[<>]/g, '').trim()
const isValidTelegramChatId = (value: string) => /^-?\d+$/.test(value)

export default defineEventHandler(async (event) => {
  const body = await readBody<OrderPayload>(event)
  const config = useRuntimeConfig(event)

  const name = sanitize(body?.name || '')
  const phone = sanitize(body?.phone || '')
  const dessert = sanitize(body?.dessert || '')
  const orderDate = sanitize(body?.orderDate || '')
  const details = sanitize(body?.details || '')

  if (!name || !phone || !dessert || !orderDate) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные данные заявки.' })
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
    throw createError({
      statusCode: 500,
      statusMessage: `Не удалось отправить заявку в Telegram.${lastTelegramError ? ` ${lastTelegramError}` : ''}`
    })
  }

  return { ok: true, id: created.id, telegramDelivered: deliveredCount }
})
