import { getAdminSession } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const session = await getAdminSession(event)

  if (!session) {
    return {
      authenticated: false
    }
  }

  return {
    authenticated: true,
    expiresAt: session.expiresAt.toISOString()
  }
})
