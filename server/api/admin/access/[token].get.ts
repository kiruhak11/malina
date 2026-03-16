import { sendRedirect } from 'h3'
import { consumeAdminAccessLink, createAdminSession } from '../../../utils/admin-auth'
import { enforceRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    key: 'admin-access-link',
    limit: 20,
    windowMs: 15 * 60 * 1000
  })

  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Токен не передан.' })
  }

  const valid = await consumeAdminAccessLink(token)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Ссылка недействительна или истекла.' })
  }

  const config = useRuntimeConfig(event)
  const days = Number(config.adminSessionDays || 14)
  await createAdminSession(event, Number.isFinite(days) && days > 0 ? days : 14)

  return sendRedirect(event, '/admin', 302)
})
