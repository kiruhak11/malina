import { createHash, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, getRequestHost, getRequestProtocol, setCookie } from 'h3'
import { prisma } from './prisma'

const ADMIN_SESSION_COOKIE = 'malina_admin_session'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const sessionCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: maxAgeSeconds
})

export const getAdminSession = async (event: Parameters<typeof getCookie>[0]) => {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!token) {
    return null
  }

  const hashedToken = sha256(token)
  const session = await prisma.adminSession.findUnique({
    where: { token: hashedToken }
  })

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.adminSession.delete({ where: { id: session.id } })
    }
    deleteCookie(event, ADMIN_SESSION_COOKIE, { path: '/' })
    return null
  }

  return session
}

export const requireAdmin = async (event: Parameters<typeof getCookie>[0]) => {
  const session = await getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Требуется авторизация администратора.' })
  }
  return session
}

export const createAdminSession = async (event: Parameters<typeof setCookie>[0], days: number) => {
  const rawToken = randomBytes(32).toString('hex')
  const hashedToken = sha256(rawToken)
  const maxAgeSeconds = days * 24 * 60 * 60

  await prisma.adminSession.create({
    data: {
      token: hashedToken,
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1000)
    }
  })

  setCookie(event, ADMIN_SESSION_COOKIE, rawToken, sessionCookieOptions(maxAgeSeconds))
}

export const clearAdminSession = async (event: Parameters<typeof getCookie>[0]) => {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)

  if (token) {
    await prisma.adminSession.deleteMany({
      where: { token: sha256(token) }
    })
  }

  deleteCookie(event, ADMIN_SESSION_COOKIE, { path: '/' })
}

export const createAdminAccessLink = async (event: Parameters<typeof getRequestHost>[0]) => {
  const config = useRuntimeConfig(event)
  const rawToken = randomBytes(24).toString('hex')
  const hashedToken = sha256(rawToken)

  await prisma.adminAccessLink.create({
    data: {
      token: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  })

  const siteUrl =
    (config.publicSiteUrl && String(config.publicSiteUrl).trim()) ||
    `${getRequestProtocol(event)}://${getRequestHost(event)}`

  return `${siteUrl}/api/admin/access/${rawToken}`
}

export const consumeAdminAccessLink = async (token: string) => {
  const hashedToken = sha256(token)
  const record = await prisma.adminAccessLink.findUnique({
    where: { token: hashedToken }
  })

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return false
  }

  await prisma.adminAccessLink.update({
    where: { id: record.id },
    data: { usedAt: new Date() }
  })

  return true
}
