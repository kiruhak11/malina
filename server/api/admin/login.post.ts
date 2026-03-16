import { readBody } from 'h3'
import { createAdminSession } from '../../utils/admin-auth'

type LoginBody = {
  login?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const config = useRuntimeConfig(event)

  const credential = String(config.adminCredential || 'malinaAdminP').trim()
  const login = String(body?.login || '').trim()
  const password = String(body?.password || '').trim()

  if (login !== credential || password !== credential) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль.' })
  }

  const days = Number(config.adminSessionDays || 14)
  await createAdminSession(event, Number.isFinite(days) && days > 0 ? days : 14)

  return { ok: true }
})
