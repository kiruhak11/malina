import { setResponseHeader } from 'h3'
import { getAdminSession } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')
  setResponseHeader(event, 'Expires', '0')

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
