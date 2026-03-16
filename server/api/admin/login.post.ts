import { readBody } from 'h3'
import { createAdminSession } from '../../utils/admin-auth'
import { enforceRateLimit } from '../../utils/rate-limit'

type LoginBody = {
  login?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    key: 'admin-login',
    limit: 10,
    windowMs: 15 * 60 * 1000
  })

  const body = await readBody<LoginBody>(event)
  const config = useRuntimeConfig(event)

  const credential = String(config.adminCredential || 'malinaAdminP').trim()
  const loginFromEnv = String(process.env.ADMIN_LOGIN || '').trim()
  const passwordFromEnv = String(process.env.ADMIN_PASSWORD || '').trim()
  const expectedLogin = loginFromEnv || credential
  const expectedPassword = passwordFromEnv || credential
  const login = String(body?.login || '').trim()
  const password = String(body?.password || '').trim()

  if (login !== expectedLogin || password !== expectedPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль.' })
  }

  const days = Number(config.adminSessionDays || 14)
  await createAdminSession(event, Number.isFinite(days) && days > 0 ? days : 14)

  return { ok: true }
})
